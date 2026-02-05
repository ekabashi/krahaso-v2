<script setup lang="ts">
import type { Vehicle } from '~/types'
import { useCheckout } from '~/composables/useCheckout'
import { useCarStore } from '~/stores/carStore'
import { z } from 'zod'

defineProps<{
  vehicle: Vehicle
}>()

const emit = defineEmits<{
  next: []
}>()

const { formatPrice } = useFormatPrice()
const { state, checkCustomerByEmail, customer, options, goToStep } = useCheckout()
const carStore = useCarStore()
const toast = useToast()
const { t } = useI18n()

const errors = ref<Record<string, string>>({})
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isEmailFilled = computed(
  () =>
    !!state.value.customerForm.email &&
    state.value.customerForm.email.trim().length > 0,
)
const isEmailValid = computed(
  () => isEmailFilled.value && emailRegex.test(state.value.customerForm.email),
)

const previousEmail = ref<string>('')
const isInitialMount = ref(true)

function clearSubsequentSteps() {
  const currentEmail = state.value.customerForm.email
  customer.resetCustomerForm()
  customer.setCustomerField('email', currentEmail)
  options.resetOptions()
  if (state.value.step > 1) goToStep(1)
}

let emailDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => state.value.customerForm.email,
  (newEmail) => {
    const emailChanged =
      !isInitialMount.value &&
      newEmail !== previousEmail.value &&
      previousEmail.value !== '' &&
      newEmail.trim() !== ''
    if (emailChanged) clearSubsequentSteps()
    previousEmail.value = newEmail
    if (emailDebounceTimer) clearTimeout(emailDebounceTimer)
    emailDebounceTimer = setTimeout(() => {
      if (isEmailValid.value && state.value.customerForm.email === newEmail) {
        void checkCustomerByEmail(state.value.customerForm.email)
      } else {
        customer.isCustomerExist.value = false
      }
    }, 500)
  },
)

onMounted(() => {
  previousEmail.value = state.value.customerForm.email
  nextTick(() => {
    isInitialMount.value = false
  })
})

function validateStep(): boolean {
  errors.value = {}
  const schema = z.object({
    email: z
      .string()
      .min(1, t('checkout.validation.emailRequired'))
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, t('checkout.validation.invalidEmail')),
  })
  const result = schema.safeParse({ email: state.value.customerForm.email })
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const path = issue.path.map((part) => String(part)).join('.') || 'form'
      errors.value[path] = issue.message
    })
    return false
  }
  return true
}

async function handleNext() {
  if (!validateStep()) {
    toast.add({
      title: t('checkout.validation.validationError'),
      description: t('checkout.validation.pleaseEnterValidEmail'),
      color: 'error',
    })
    return
  }
  if (isEmailValid.value && !state.value.isCustomerExist) {
    await checkCustomerByEmail(state.value.customerForm.email)
  }
  emit('next')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ $t('checkout.steps.vehicleReview.title') }}
      </h2>
    </div>

    <div
      class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <div class="flex flex-col sm:flex-row gap-6">
        <img
          :src="vehicle.images || 'https://placehold.co/400x300?text=No+Image'"
          :alt="vehicle.make + ' ' + vehicle.model"
          class="w-full sm:w-64 h-48 sm:h-48 object-cover rounded-lg"
        />
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {{ vehicle.make }} {{ vehicle.model }}
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ vehicle.year }} ·
            {{
              vehicle.category
                ? carStore.formatCategoryDisplay(vehicle.category)
                : 'Standard'
            }}
          </p>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <UIcon name="i-lucide-cog" class="w-5 h-5" />
              <span>{{ vehicle.transmission }}</span>
            </div>
            <div
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <UIcon name="i-lucide-fuel" class="w-5 h-5" />
              <span>{{ vehicle.fuel }}</span>
            </div>
            <div
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <UIcon name="i-lucide-users" class="w-5 h-5" />
              <span
                >{{ vehicle.seats }}
                {{ $t('checkout.steps.vehicleReview.seats') }}</span
              >
            </div>
            <div
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <UIcon name="i-lucide-layout-grid" class="w-5 h-5" />
              <span
                >{{ vehicle.doors }}
                {{ $t('checkout.steps.vehicleReview.doors') }}</span
              >
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <span
              class="text-2xl font-bold text-primary-600 dark:text-primary-400"
            >
              {{ formatPrice(vehicle.daily_rate) }}
            </span>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{
              $t('checkout.steps.vehicleReview.perDay')
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ $t('checkout.steps.vehicleReview.enterEmail') }}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ $t('checkout.steps.vehicleReview.emailDescription') }}
      </p>

      <UFormField
        name="email"
        :label="$t('checkout.steps.vehicleReview.emailAddress')"
        :error="errors['email']"
        class="w-full"
      >
        <UInput
          v-model="state.customerForm.email"
          type="email"
          placeholder="john.doe@example.com"
          autocomplete="email"
          size="md"
          class="w-full"
          block
        />
      </UFormField>

      <div v-if="state.isCustomerExist" class="mt-4">
        <UAlert
          color="success"
          variant="soft"
          icon="i-lucide-check-circle"
          :title="$t('checkout.steps.vehicleReview.customerFound')"
          :description="
            $t('checkout.steps.vehicleReview.customerFoundDescription')
          "
          size="md"
        />
      </div>
    </div>

    <div
      class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700"
    >
      <UButton
        type="button"
        variant="solid"
        color="primary"
        size="lg"
        @click="handleNext"
      >
        {{ $t('checkout.steps.vehicleReview.continue') }}
      </UButton>
    </div>
  </div>
</template>
