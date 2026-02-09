<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const toast = useToast()

const isFindBookingOpen = ref(false)
const bookingNumberInput = ref('')
const isLoadingBooking = ref(false)
const bookingError = ref('')

async function handleFindBooking(close?: () => void) {
  const num = bookingNumberInput.value?.trim() ?? ''
  bookingError.value = ''
  if (!num) {
    bookingError.value = t('shared.layout.pleaseEnterBookingNumber')
    return
  }

  isLoadingBooking.value = true
  try {
    await $fetch(`/api/bookings/${encodeURIComponent(num)}`)
    if (close) close()
    else isFindBookingOpen.value = false
    bookingNumberInput.value = ''
    await router.push(localePath(`/booking/${num}`))
  } catch {
    bookingError.value = t('shared.layout.failedToFindBooking')
  } finally {
    isLoadingBooking.value = false
  }
}
</script>

<template>
  <UHeader
    :toggle="false"
    :ui="{ toggle: 'hidden' }"
  >
    <template #left>
      <AppLogo />
    </template>

    <!-- <template #default>
      <div class="flex items-center gap-4">
        <ULink
          :to="localePath('/')"
          variant="ghost"
          size="sm"
        >
          {{ $t('nav.home') }}
        </ULink>
        <ULink
          :to="localePath('fluturime')"
          variant="ghost"
          size="sm"
        >
          {{ $t('nav.flights') }}
        </ULink>
        <ULink
          :to="localePath('makina')"
          variant="ghost"
          size="sm"
        >
          {{ $t('nav.cars') }}
        </ULink>
      </div>
    </template> -->

    <template #right>
      <div class="flex items-center gap-2">
        <UPopover
          v-model:open="isFindBookingOpen"
          :content="{ side: 'bottom', align: 'end' }"
        >
          <UButton
            :label="$t('shared.layout.findBooking')"
            color="primary"
            variant="ghost"
            icon="i-lucide-search"
          />
          <template #content="{ close }">
            <div class="w-80">
              <div class="flex items-center gap-3 px-5 pt-5 pb-3">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <UIcon name="i-lucide-search" class="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold">
                    {{ $t('shared.layout.findBookingDesc') }}
                  </h3>
                </div>
              </div>
              <div class="px-5 pb-4">
                <UFormField
                  :label="$t('shared.layout.bookingNumber')"
                  required
                >
                  <UInput
                    v-model="bookingNumberInput"
                    :placeholder="$t('shared.layout.enterBookingNumber')"
                    :disabled="isLoadingBooking"
                    size="lg"
                    icon="i-lucide-hash"
                    class="w-full"
                    @keyup.enter="handleFindBooking(close)"
                  />
                </UFormField>
                <p v-if="bookingError" class="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <UIcon name="i-lucide-circle-alert" class="h-3.5 w-3.5 shrink-0" />
                  {{ bookingError }}
                </p>
              </div>
              <div class="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :label="$t('shared.layout.cancel')"
                  :disabled="isLoadingBooking"
                  @click="close"
                />
                <UButton
                  color="primary"
                  size="sm"
                  icon="i-lucide-arrow-right"
                  :label="$t('shared.layout.search')"
                  :loading="isLoadingBooking"
                  @click="handleFindBooking(close)"
                />
              </div>
            </div>
          </template>
        </UPopover>
        <LocaleSwitcher />
        <UColorModeButton />
      </div>
    </template>
  </UHeader>
</template>
