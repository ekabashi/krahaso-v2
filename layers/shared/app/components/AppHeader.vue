<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const toast = useToast()

const isFindBookingOpen = ref(false)
const bookingNumberInput = ref('')
const isLoadingBooking = ref(false)

async function handleFindBooking(close?: () => void) {
  const num = bookingNumberInput.value?.trim() ?? ''
  if (!num) {
    toast.add({
      title: t('shared.layout.error'),
      description: t('shared.layout.pleaseEnterBookingNumber'),
      color: 'error',
    })
    return
  }

  isLoadingBooking.value = true
  try {
    if (close) close()
    else isFindBookingOpen.value = false
    bookingNumberInput.value = ''
    await router.push(localePath(`/booking/${num}`))
  } catch (err) {
    toast.add({
      title: t('shared.layout.error'),
      description: err instanceof Error ? err.message : t('shared.layout.failedToFindBooking'),
      color: 'error',
    })
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

    <template #default>
      <div class="flex items-center gap-4">
        <ULink
          :to="localePath('/')"
          variant="ghost"
          size="sm"
        >
          {{ $t('nav.home') }}
        </ULink>
        <ULink
          :to="localePath('/flights')"
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
    </template>

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
            <div class="p-4 w-80">
              <h3 class="text-lg font-semibold mb-4">
                {{ $t('shared.layout.findBooking') }}
              </h3>
              <UFormField
                :label="$t('shared.layout.bookingNumber')"
                required
              >
                <UInput
                  v-model="bookingNumberInput"
                  :placeholder="$t('shared.layout.enterBookingNumber')"
                  :disabled="isLoadingBooking"
                  @keyup.enter="handleFindBooking(close)"
                />
              </UFormField>
              <div class="flex justify-end gap-2 mt-4">
                <UButton
                  color="neutral"
                  variant="ghost"
                  :label="$t('shared.layout.cancel')"
                  :disabled="isLoadingBooking"
                  @click="close"
                />
                <UButton
                  color="primary"
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
