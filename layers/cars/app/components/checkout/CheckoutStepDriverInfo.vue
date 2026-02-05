<script setup lang="ts">
import { useCheckout } from '~/composables/useCheckout'
import { useCustomerStore } from '~/stores/customerStore'
import { z } from 'zod'

const emit = defineEmits<{
  next: []
  back: []
}>()

const { state, checkCustomerByEmail, customer, options, goToStep } = useCheckout()
const customerStore = useCustomerStore()
const toast = useToast()
const { t } = useI18n()

const documentTypeItems = computed(() => [
  { label: t('checkout.steps.driverInfo.idCard'), value: 'id' },
  { label: t('checkout.steps.driverInfo.passport'), value: 'passport' },
])

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

function getFileUrl(file: File | null): string {
  if (!file) return ''
  try {
    return URL.createObjectURL(file)
  } catch {
    return ''
  }
}

function clearSubsequentSteps() {
  const currentEmail = state.value.customerForm.email
  customer.resetCustomerForm()
  customer.setCustomerField('email', currentEmail)
  options.resetOptions()
  if (state.value.step > 2) goToStep(2)
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
    name: z.string().min(1, t('checkout.validation.nameRequired')),
    surname: z.string().min(1, t('checkout.validation.surnameRequired')),
    email: z
      .string()
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, t('checkout.validation.invalidEmail')),
    phone: z.string().min(1, t('checkout.validation.phoneRequired')),
    address: z.object({
      street: z.string().min(1, t('checkout.validation.streetRequired')),
      city: z.string().min(1, t('checkout.validation.cityRequired')),
    }),
  })
  const result = schema.safeParse(state.value.customerForm)
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const path = issue.path.map((part) => String(part)).join('.') || 'form'
      errors.value[path] = issue.message
    })
    return false
  }
  if (!state.value.isCustomerExist) {
    const isFile = (val: unknown): val is File =>
      typeof File !== 'undefined' && val instanceof File
    if (state.value.selectedDocument === 'id') {
      if (!isFile(state.value.customerForm.frontIdFile)) {
        errors.value['frontIdFile'] = t('checkout.validation.frontIdRequired')
        return false
      }
      if (!isFile(state.value.customerForm.backIdFile)) {
        errors.value['backIdFile'] = t('checkout.validation.backIdRequired')
        return false
      }
    }
    if (state.value.selectedDocument === 'passport') {
      if (!isFile(state.value.customerForm.passportFile)) {
        errors.value['passportFile'] = t('checkout.validation.passportRequired')
        return false
      }
    }
    if (!isFile(state.value.customerForm.patentShoferFile)) {
      errors.value['patentShoferFile'] = t(
        'checkout.validation.drivingLicenseRequired',
      )
      return false
    }
  }
  return true
}

function handleNext() {
  if (!validateStep()) {
    const missingDocs: string[] = []
    if (errors.value['frontIdFile'])
      missingDocs.push(t('checkout.steps.driverInfo.idFront'))
    if (errors.value['backIdFile'])
      missingDocs.push(t('checkout.steps.driverInfo.idBack'))
    if (errors.value['passportFile'])
      missingDocs.push(t('checkout.steps.driverInfo.passportFile'))
    if (errors.value['patentShoferFile'])
      missingDocs.push(t('checkout.steps.driverInfo.drivingLicense'))
    const errorMessage =
      missingDocs.length > 0
        ? t('checkout.validation.pleaseUploadRequiredDocuments', {
            documents: missingDocs.join(', '),
          })
        : t('checkout.validation.pleaseFillAllFields')
    toast.add({
      title: t('checkout.validation.validationError'),
      description: errorMessage,
      color: 'error',
    })
    return
  }
  emit('next')
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
      {{ $t('checkout.steps.driverInfo.title') }}
    </h2>

    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          name="email"
          :label="$t('checkout.steps.driverInfo.email')"
          :error="errors['email']"
          class="w-full"
        >
          <UInput
            v-model="state.customerForm.email"
            type="email"
            :placeholder="$t('checkout.steps.driverInfo.placeholders.email')"
            :loading="customerStore.loading"
            autocomplete="email"
            size="md"
            class="w-full"
            block
          />
        </UFormField>
        <UFormField
          name="phone"
          :label="$t('checkout.steps.driverInfo.phone')"
          :error="errors['phone']"
          class="w-full"
        >
          <UInput
            v-model="state.customerForm.phone"
            :placeholder="$t('checkout.steps.driverInfo.placeholders.phone')"
            :disabled="!isEmailValid"
            :loading="customerStore.loading"
            autocomplete="tel"
            size="md"
            class="w-full"
            block
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          name="name"
          :label="$t('checkout.steps.driverInfo.firstName')"
          :error="errors['name']"
          class="w-full"
        >
          <UInput
            v-model="state.customerForm.name"
            :placeholder="$t('checkout.steps.driverInfo.placeholders.firstName')"
            :disabled="!isEmailValid"
            :loading="customerStore.loading"
            autocomplete="given-name"
            size="md"
            class="w-full"
            block
          />
        </UFormField>
        <UFormField
          name="surname"
          :label="$t('checkout.steps.driverInfo.lastName')"
          :error="errors['surname']"
          class="w-full"
        >
          <UInput
            v-model="state.customerForm.surname"
            :placeholder="$t('checkout.steps.driverInfo.placeholders.lastName')"
            :disabled="!isEmailValid"
            :loading="customerStore.loading"
            autocomplete="family-name"
            size="md"
            class="w-full"
            block
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          name="address.street"
          :label="$t('checkout.steps.driverInfo.streetAddress')"
          :error="errors['address.street']"
          class="w-full"
        >
          <UInput
            v-model="state.customerForm.address.street"
            :placeholder="$t('checkout.steps.driverInfo.placeholders.streetAddress')"
            :disabled="!isEmailValid"
            :loading="customerStore.loading"
            autocomplete="street-address"
            size="md"
            class="w-full"
            block
          />
        </UFormField>
        <UFormField
          name="address.city"
          :label="$t('checkout.steps.driverInfo.city')"
          :error="errors['address.city']"
          class="w-full"
        >
          <UInput
            v-model="state.customerForm.address.city"
            :placeholder="$t('checkout.steps.driverInfo.placeholders.city')"
            :disabled="!isEmailValid"
            :loading="customerStore.loading"
            autocomplete="address-level2"
            size="md"
            class="w-full"
            block
          />
        </UFormField>
      </div>

      <div v-if="state.isCustomerExist" class="mt-4">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          :title="$t('checkout.steps.driverInfo.customerFound')"
          :description="$t('checkout.steps.driverInfo.customerFoundDescription')"
          size="md"
        />
      </div>
    </div>

    <div
      v-if="!state.isCustomerExist"
      class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700"
    >
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ $t('checkout.steps.driverInfo.requiredDocuments') }}
      </h3>

      <UFormField
        :name="'documentType'"
        :label="$t('checkout.steps.driverInfo.documentType')"
      >
        <URadioGroup
          v-model="customer.selectedDocument.value"
          :items="documentTypeItems"
          value-key="value"
          size="md"
        />
      </UFormField>

      <div
        v-if="customer.selectedDocument.value === 'id'"
        class="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <UFormField
          name="frontIdFile"
          :label="$t('checkout.steps.driverInfo.idFront')"
          required
          :error="errors['frontIdFile']"
        >
          <div v-if="state.customerForm.frontIdFile" class="relative">
            <div
              class="relative rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
            >
              <img
                :src="getFileUrl(state.customerForm.frontIdFile)"
                :alt="state.customerForm.frontIdFile.name"
                class="w-full h-48 object-cover"
              />
              <UButton
                icon="i-lucide-x"
                color="error"
                variant="solid"
                size="xs"
                class="absolute top-2 right-2"
                @click="state.customerForm.frontIdFile = null"
              />
            </div>
          </div>
          <label v-else class="cursor-pointer block">
            <div
              class="rounded-lg p-8 flex flex-col items-center gap-3 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[160px] justify-center"
            >
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="
                  (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) state.customerForm.frontIdFile = file
                  }
                "
              />
              <UIcon
                name="i-lucide-upload"
                class="w-12 h-12 text-gray-400 dark:text-gray-500"
              />
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t('checkout.steps.driverInfo.uploadIdFront') }}
              </p>
            </div>
          </label>
        </UFormField>

        <UFormField
          name="backIdFile"
          :label="$t('checkout.steps.driverInfo.idBack')"
          required
          :error="errors['backIdFile']"
        >
          <div v-if="state.customerForm.backIdFile" class="relative">
            <div
              class="relative rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
            >
              <img
                :src="getFileUrl(state.customerForm.backIdFile)"
                :alt="state.customerForm.backIdFile.name"
                class="w-full h-48 object-cover"
              />
              <UButton
                icon="i-lucide-x"
                color="error"
                variant="solid"
                size="xs"
                class="absolute top-2 right-2"
                @click="state.customerForm.backIdFile = null"
              />
            </div>
          </div>
          <label v-else class="cursor-pointer block">
            <div
              class="rounded-lg p-8 flex flex-col items-center gap-3 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[160px] justify-center"
            >
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="
                  (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) state.customerForm.backIdFile = file
                  }
                "
              />
              <UIcon
                name="i-lucide-upload"
                class="w-12 h-12 text-gray-400 dark:text-gray-500"
              />
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t('checkout.steps.driverInfo.uploadIdBack') }}
              </p>
            </div>
          </label>
        </UFormField>
      </div>

      <div v-if="customer.selectedDocument.value === 'passport'" class="w-full">
        <UFormField
          name="passportFile"
          :label="$t('checkout.steps.driverInfo.passportFile')"
          required
          :error="errors['passportFile']"
        >
          <div v-if="state.customerForm.passportFile" class="relative">
            <div
              class="relative rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
            >
              <img
                :src="getFileUrl(state.customerForm.passportFile)"
                :alt="state.customerForm.passportFile.name"
                class="w-full h-48 object-cover"
              />
              <UButton
                icon="i-lucide-x"
                color="error"
                variant="solid"
                size="xs"
                class="absolute top-2 right-2"
                @click="state.customerForm.passportFile = null"
              />
            </div>
          </div>
          <label v-else class="cursor-pointer block">
            <div
              class="rounded-lg p-8 flex flex-col items-center gap-3 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[160px] justify-center"
            >
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="
                  (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) state.customerForm.passportFile = file
                  }
                "
              />
              <UIcon
                name="i-lucide-upload"
                class="w-12 h-12 text-gray-400 dark:text-gray-500"
              />
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t('checkout.steps.driverInfo.uploadPassport') }}
              </p>
            </div>
          </label>
        </UFormField>
      </div>

      <UFormField
        name="patentShoferFile"
        :label="$t('checkout.steps.driverInfo.drivingLicense')"
        required
        :error="errors['patentShoferFile']"
      >
        <div v-if="state.customerForm.patentShoferFile" class="relative">
          <div
            class="relative rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
          >
            <img
              :src="getFileUrl(state.customerForm.patentShoferFile)"
              :alt="state.customerForm.patentShoferFile.name"
              class="w-full h-48 object-cover"
            />
            <UButton
              icon="i-lucide-x"
              color="error"
              variant="solid"
              size="xs"
              class="absolute top-2 right-2"
              @click="state.customerForm.patentShoferFile = null"
            />
          </div>
        </div>
        <label v-else class="cursor-pointer block">
          <div
            class="rounded-lg p-8 flex flex-col items-center gap-3 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[160px] justify-center"
          >
            <input
              type="file"
              accept="image/*"
              class="hidden"
              @change="
                (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) state.customerForm.patentShoferFile = file
                }
              "
            />
            <UIcon
              name="i-lucide-upload"
              class="w-12 h-12 text-gray-400 dark:text-gray-500"
            />
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ $t('checkout.steps.driverInfo.uploadDrivingLicense') }}
            </p>
          </div>
        </label>
      </UFormField>
    </div>

    <div v-else class="py-4 border-t border-gray-200 dark:border-gray-700">
      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        :title="$t('checkout.steps.driverInfo.documentsAlreadyUploaded')"
        :description="
          $t('checkout.steps.driverInfo.documentsAlreadyUploadedDescription')
        "
        size="md"
      />
    </div>

    <div
      class="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700"
    >
      <UButton variant="outline" type="button" size="lg" @click="emit('back')">
        {{ $t('checkout.steps.driverInfo.back') }}
      </UButton>
      <UButton
        type="button"
        variant="solid"
        color="primary"
        size="lg"
        @click="handleNext"
      >
        {{ $t('checkout.steps.driverInfo.continue') }}
      </UButton>
    </div>
  </div>
</template>
