<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Flights WhatsApp Bot - Krahaso Admin'
})

// State
const selectedSession = ref<string | null>(null)
const expandedSession = ref<string | null>(null)
const deleteModalOpen = ref(false)
const sessionToDelete = ref<string | null>(null)

// Phone lookup state
const phoneSearch = ref('')
const lookupResult = ref<{
  found: boolean
  matchedFormat?: string
  phoneHash?: string
  session?: Record<string, unknown>
  logsCount?: number
  logs?: Array<Record<string, unknown>>
  triedFormats?: Array<{ format: string, hash: string }>
} | null>(null)
const isLookingUp = ref(false)

// Fetch stats
const { data: stats, refresh: refreshStats } = await useFetch('/api/admin/bot/stats')

// Fetch sessions
const { data: sessions, refresh: refreshSessions } = await useFetch('/api/admin/bot/sessions')

// Fetch logs (filtered by selected session or all)
const { data: logs, refresh: refreshLogs } = await useFetch('/api/admin/bot/logs', {
  query: computed(() => ({
    phoneHash: selectedSession.value || undefined,
    limit: 100
  }))
})

// Refresh all data
async function refreshAll() {
  await Promise.all([refreshStats(), refreshSessions(), refreshLogs()])
}

// Lookup phone number
async function lookupPhone() {
  if (!phoneSearch.value.trim()) return

  isLookingUp.value = true
  lookupResult.value = null

  try {
    const result = await $fetch('/api/admin/bot/lookup', {
      method: 'POST',
      body: { phoneNumber: phoneSearch.value.trim() }
    })
    lookupResult.value = result as unknown as typeof lookupResult.value

    // If found, select the session
    if (result.found && 'phoneHash' in result && result.phoneHash) {
      selectedSession.value = result.phoneHash
    }
  } catch (error) {
    console.error('Lookup failed:', error)
  } finally {
    isLookingUp.value = false
  }
}

// Clear lookup
function clearLookup() {
  phoneSearch.value = ''
  lookupResult.value = null
}

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format relative time
function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'gerade eben'
  if (diffMins < 60) return `vor ${diffMins} Min.`
  if (diffHours < 24) return `vor ${diffHours} Std.`
  return `vor ${diffDays} Tagen`
}

// Confirm delete session
function confirmDelete(phoneHash: string) {
  sessionToDelete.value = phoneHash
  deleteModalOpen.value = true
}

// Delete session
async function deleteSession() {
  if (!sessionToDelete.value) return

  try {
    await $fetch(`/api/admin/bot/sessions/${sessionToDelete.value}`, {
      method: 'DELETE'
    })
    deleteModalOpen.value = false
    sessionToDelete.value = null
    if (selectedSession.value === sessionToDelete.value) {
      selectedSession.value = null
    }
    await refreshAll()
  } catch (error) {
    console.error('Failed to delete session:', error)
  }
}

// Toggle expanded session details
function viewSession(phoneHash: string) {
  expandedSession.value = expandedSession.value === phoneHash ? null : phoneHash
}

// Filter logs by session
function filterLogs(phoneHash: string) {
  selectedSession.value = selectedSession.value === phoneHash ? null : phoneHash
}

// Copy chat log to clipboard
async function copyChatLog(phoneHash: string) {
  try {
    const logsEndpoint: string = '/api/admin/bot/logs'
    const query: Record<string, string | number> = { phoneHash, limit: 200 }
    const sessionLogs = await $fetch<Array<{ direction: string, content: string, timestamp: string }>>(logsEndpoint, {
      query
    })

    if (!sessionLogs?.length) {
      alert('Keine Logs vorhanden')
      return
    }

    // Format logs as readable text
    const formatted = sessionLogs
      .reverse() // Chronological order
      .map((log) => {
        const time = log.timestamp ? new Date(log.timestamp).toLocaleString('de-DE') : ''
        const prefix = log.direction === 'inbound' ? 'ðŸ‘¤ User' : 'ðŸ¤– Bot'
        return `[${time}] ${prefix}:\n${log.content}`
      })
      .join('\n\n---\n\n')

    const header = `Chat Log: ${phoneHash}\nExportiert: ${new Date().toLocaleString('de-DE')}\n${'='.repeat(50)}\n\n`

    await navigator.clipboard.writeText(header + formatted)
    alert('Chat Log kopiert!')
  } catch (error) {
    console.error('Failed to copy chat log:', error)
    alert('Kopieren fehlgeschlagen')
  }
}

// Get language flag
function getLanguageFlag(lang: string | null): string {
  switch (lang) {
    case 'de': return '🇩🇪'
    case 'en': return '🇬🇧'
    case 'sq': return '🇽🇰'
    default: return '❓'
  }
}

// Get direction icon
function getDirectionIcon(direction: string): string {
  return direction === 'inbound' ? 'i-lucide-arrow-right' : 'i-lucide-arrow-left'
}

// Get direction color
function getDirectionColor(direction: string): string {
  return direction === 'inbound' ? 'text-blue-500' : 'text-green-500'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          WhatsApp Bot
        </h1>
        <p class="mt-1 text-muted">
          Sessions, Logs und Statistiken
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="outline"
        color="neutral"
        @click="refreshAll"
      >
        Aktualisieren
      </UButton>
    </div>

    <!-- Stats Cards -->
    <div
      class="
        grid gap-4
        sm:grid-cols-2
        lg:grid-cols-4
      "
    >
      <UCard>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-primary/10 p-2">
            <UIcon
              name="i-lucide-users"
              class="size-5 text-primary"
            />
          </div>
          <div>
            <p class="text-2xl font-bold">
              {{ stats?.sessions.total ?? 0 }}
            </p>
            <p class="text-sm text-muted">
              Sessions gesamt
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-green-500/10 p-2">
            <UIcon
              name="i-lucide-activity"
              class="size-5 text-green-500"
            />
          </div>
          <div>
            <p class="text-2xl font-bold">
              {{ stats?.sessions.activeToday ?? 0 }}
            </p>
            <p class="text-sm text-muted">
              Aktiv (24h)
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-blue-500/10 p-2">
            <UIcon
              name="i-lucide-message-circle"
              class="size-5 text-blue-500"
            />
          </div>
          <div>
            <p class="text-2xl font-bold">
              {{ stats?.messages.today ?? 0 }}
            </p>
            <p class="text-sm text-muted">
              Nachrichten heute
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-purple-500/10 p-2">
            <UIcon
              name="i-lucide-globe"
              class="size-5 text-purple-500"
            />
          </div>
          <div>
            <div class="flex gap-2 text-lg font-bold">
              <span>{{ getLanguageFlag('de') }} {{ stats?.languages?.de ?? 0 }}</span>
              <span>{{ getLanguageFlag('sq') }} {{ stats?.languages?.sq ?? 0 }}</span>
              <span>{{ getLanguageFlag('en') }} {{ stats?.languages?.en ?? 0 }}</span>
            </div>
            <p class="text-sm text-muted">
              Sprachen
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Phone Lookup -->
    <UCard>
      <template #header>
        <div>
          <h2 class="text-lg font-semibold">
            Session suchen
          </h2>
          <p class="mt-1 text-sm text-muted">
            Suche nur per LID möglich (keine Telefonnummern). LID aus Bot-Logs kopieren.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex gap-2">
          <UInput
            v-model="phoneSearch"
            placeholder="LID eingeben (z.B. 102761421091015)"
            class="flex-1"
            @keyup.enter="lookupPhone"
          />
          <UButton
            icon="i-lucide-search"
            :loading="isLookingUp"
            @click="lookupPhone"
          >
            Suchen
          </UButton>
          <UButton
            v-if="lookupResult"
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            @click="clearLookup"
          />
        </div>

        <!-- Lookup Result -->
        <div v-if="lookupResult">
          <div
            v-if="lookupResult.found"
            class="rounded-lg bg-green-500/10 p-4"
          >
            <div class="flex items-center gap-2 text-green-600">
              <UIcon
                name="i-lucide-check-circle"
                class="size-5"
              />
              <span class="font-medium">Session gefunden!</span>
            </div>
            <div class="mt-2 space-y-1 text-sm">
              <p>
                <span class="text-muted">Format:</span> <code
                  class="rounded bg-muted/50 px-1"
                >{{ lookupResult.matchedFormat }}</code>
              </p>
              <p>
                <span class="text-muted">Hash:</span> <code
                  class="rounded bg-muted/50 px-1"
                >{{ lookupResult.phoneHash }}</code>
              </p>
              <p><span class="text-muted">Logs:</span> {{ lookupResult.logsCount }} Nachrichten</p>
            </div>
          </div>

          <div
            v-else
            class="rounded-lg bg-yellow-500/10 p-4"
          >
            <div class="flex items-center gap-2 text-yellow-600">
              <UIcon
                name="i-lucide-alert-triangle"
                class="size-5"
              />
              <span class="font-medium">Keine Session gefunden</span>
            </div>
            <div class="mt-2 text-sm">
              <p class="text-muted">
                Getestete Formate:
              </p>
              <ul class="mt-1 space-y-1">
                <li
                  v-for="item in lookupResult.triedFormats"
                  :key="item.hash"
                  class="font-mono text-xs"
                >
                  {{ item.format }} → {{ item.hash }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Sessions Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Sessions
          </h2>
          <span class="text-sm text-muted">
            {{ sessions?.length ?? 0 }} Sessions
          </span>
        </div>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default text-left">
              <th class="px-3 py-2 font-medium">
                Phone Hash
              </th>
              <th class="px-3 py-2 font-medium">
                Sprache
              </th>
              <th class="px-3 py-2 font-medium">
                Status
              </th>
              <th class="px-3 py-2 font-medium">
                Letzte Nachricht
              </th>
              <th class="px-3 py-2 font-medium">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="session in sessions"
              :key="session.phoneHash"
            >
              <!-- Main Row -->
              <tr
                class="
                  cursor-pointer border-b border-default
                  hover:bg-muted/50
                "
                :class="{ 'bg-primary/5': expandedSession === session.phoneHash }"
                @click="viewSession(session.phoneHash)"
              >
                <td class="px-3 py-2 font-mono text-xs">
                  <div class="flex items-center gap-2">
                    <UIcon
                      :name="expandedSession === session.phoneHash ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                      class="size-4 text-muted"
                    />
                    {{ session.phoneHash }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  {{ getLanguageFlag(session.preferredLanguage) }}
                  {{ session.preferredLanguage?.toUpperCase() ?? '-' }}
                </td>
                <td class="px-3 py-2">
                  <span
                    v-if="session.postSearchPhase"
                    class="
                      rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs
                      text-yellow-600
                    "
                  >
                    {{ session.postSearchPhase }}
                  </span>
                  <span
                    v-else-if="session.hasConversationState"
                    class="
                      rounded-full bg-green-500/20 px-2 py-0.5 text-xs
                      text-green-600
                    "
                  >
                    aktiv
                  </span>
                  <span
                    v-else
                    class="
                      rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted
                    "
                  >
                    idle
                  </span>
                </td>
                <td class="px-3 py-2 text-muted">
                  {{ formatRelative(session.lastMessageAt) }}
                </td>
                <td
                  class="flex gap-1 px-3 py-2"
                  @click.stop
                >
                  <UButton
                    icon="i-lucide-message-circle"
                    size="xs"
                    :variant="selectedSession === session.phoneHash ? 'solid' : 'ghost'"
                    :color="selectedSession === session.phoneHash ? 'primary' : 'neutral'"
                    title="Chat Logs anzeigen"
                    @click="filterLogs(session.phoneHash)"
                  />
                  <UButton
                    icon="i-lucide-copy"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    title="Chat Log kopieren"
                    @click="copyChatLog(session.phoneHash)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    size="xs"
                    variant="ghost"
                    color="error"
                    title="Session lÃ¶schen"
                    @click="confirmDelete(session.phoneHash)"
                  />
                </td>
              </tr>

              <!-- Expanded Details Row -->
              <tr v-if="expandedSession === session.phoneHash">
                <td
                  colspan="5"
                  class="bg-muted/30 px-6 py-4"
                >
                  <div
                    class="
                      grid gap-4
                      sm:grid-cols-2
                      lg:grid-cols-3
                    "
                  >
                    <!-- Last Search -->
                    <div
                      v-if="session.lastSearch"
                      class="rounded-lg bg-default p-3"
                    >
                      <h4
                        class="mb-2 flex items-center gap-2 text-sm font-medium"
                      >
                        <UIcon
                          name="i-lucide-plane"
                          class="size-4 text-primary"
                        />
                        Letzte Suche
                      </h4>
                      <div class="space-y-1 text-sm">
                        <p><span class="text-muted">Route:</span> {{ session.lastSearch.route }}</p>
                        <p><span class="text-muted">Datum:</span> {{ session.lastSearch.date }}</p>
                        <p v-if="session.lastSearch.returnDate">
                          <span class="text-muted">RÃ¼ckflug:</span> {{ session.lastSearch.returnDate }}
                        </p>
                        <p><span class="text-muted">FlÃ¼ge:</span> {{ session.lastSearch.flightCount }}</p>
                        <p v-if="session.lastSearch.cheapestPrice">
                          <span class="text-muted">GÃ¼nstigster:</span> {{ session.lastSearch.cheapestPrice }}â‚¬
                        </p>
                        <p><span class="text-muted">Provider:</span> {{ session.lastSearch.providers?.join(', ') }}</p>
                        <p class="text-xs text-muted">
                          {{ formatDate(session.lastSearch.searchedAt) }}
                        </p>
                      </div>
                    </div>

                    <!-- Current Query -->
                    <div
                      v-if="session.currentQuery"
                      class="rounded-lg bg-default p-3"
                    >
                      <h4
                        class="mb-2 flex items-center gap-2 text-sm font-medium"
                      >
                        <UIcon
                          name="i-lucide-search"
                          class="size-4 text-blue-500"
                        />
                        Aktuelle Anfrage
                      </h4>
                      <div class="space-y-1 text-sm">
                        <p><span class="text-muted">Typ:</span> {{ session.currentQuery.type }}</p>
                        <p v-if="session.currentQuery.from">
                          <span class="text-muted">Von:</span> {{ session.currentQuery.from }}
                        </p>
                        <p v-if="session.currentQuery.to">
                          <span class="text-muted">Nach:</span> {{ session.currentQuery.to }}
                        </p>
                        <p v-if="session.currentQuery.date">
                          <span class="text-muted">Datum:</span> {{ session.currentQuery.date }}
                        </p>
                      </div>
                    </div>

                    <!-- Session Info -->
                    <div class="rounded-lg bg-default p-3">
                      <h4
                        class="mb-2 flex items-center gap-2 text-sm font-medium"
                      >
                        <UIcon
                          name="i-lucide-info"
                          class="size-4 text-green-500"
                        />
                        Session Info
                      </h4>
                      <div class="space-y-1 text-sm">
                        <p><span class="text-muted">Nachrichten:</span> {{ session.messageCount }}</p>
                        <p><span class="text-muted">Bekannter User:</span> {{ session.isKnownUser ? 'Ja' : 'Nein' }}</p>
                        <p><span class="text-muted">Erstellt:</span> {{ formatDate(session.createdAt) }}</p>
                      </div>
                    </div>

                    <!-- No Data -->
                    <div
                      v-if="!session.lastSearch && !session.currentQuery"
                      class="text-sm text-muted"
                    >
                      Keine Suchdaten vorhanden
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Chat Logs -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Chat Logs
            <span
              v-if="selectedSession"
              class="ml-2 text-sm font-normal text-muted"
            >
              (gefiltert: {{ selectedSession }})
            </span>
          </h2>
          <UButton
            v-if="selectedSession"
            size="xs"
            variant="ghost"
            @click="selectedSession = null"
          >
            Filter entfernen
          </UButton>
        </div>
      </template>

      <div class="max-h-[500px] space-y-2 overflow-y-auto">
        <div
          v-for="log in logs"
          :key="log.id"
          class="flex gap-3 rounded-lg p-2"
          :class="log.direction === 'inbound' ? 'bg-blue-500/5' : `
            bg-green-500/5
          `"
        >
          <UIcon
            :name="getDirectionIcon(log.direction)"
            class="mt-1 size-4 shrink-0"
            :class="getDirectionColor(log.direction)"
          />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 text-xs text-muted">
              <span class="font-mono">{{ log.phoneHash }}</span>
              <span>•</span>
              <span>{{ log.messageType }}</span>
              <span>•</span>
              <span>{{ getLanguageFlag(log.language) }}</span>
              <span>•</span>
              <span>{{ formatDate(log.timestamp) }}</span>
            </div>
            <p class="mt-1 text-sm whitespace-pre-wrap">
              {{ log.content }}
            </p>
          </div>
        </div>

        <div
          v-if="!logs?.length"
          class="py-8 text-center text-muted"
        >
          Keine Logs vorhanden
        </div>
      </div>
    </UCard>

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="deleteModalOpen"
      title="Session lÃ¶schen"
    >
      <template #body>
        <p>
          MÃ¶chtest du die Session <code class="rounded bg-muted px-1">{{ sessionToDelete }}</code> wirklich lÃ¶schen?
        </p>
        <p class="mt-2 text-sm text-muted">
          Die Konversation wird zurÃ¼ckgesetzt und der Nutzer startet beim nÃ¤chsten Kontakt neu.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            @click="deleteModalOpen = false"
          >
            Abbrechen
          </UButton>
          <UButton
            color="error"
            @click="deleteSession"
          >
            LÃ¶schen
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>



