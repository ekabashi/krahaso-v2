<script setup lang="ts">
import { useAuthStore } from '../../stores/authStore'

definePageMeta({
  layout: false,
})

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const localePath = useLocalePath()

const credentials = reactive({
  email: '',
  password: '',
})

const isLoading = computed(() => authStore.loading)
const error = computed(() => authStore.error)

const showPassword = ref(false)

const handleLogin = async () => {
  if (!credentials.email || !credentials.password) {
    toast.add({
      title: t('superadmin.login.validationError'),
      description: t('superadmin.login.enterCredentials'),
      color: 'error',
    })
    return
  }

  try {
    await authStore.login(credentials.email, credentials.password)
    toast.add({
      title: t('superadmin.login.success'),
      description: t('superadmin.login.welcomeBack'),
      color: 'success',
    })
  } catch (err) {
    toast.add({
      title: t('superadmin.login.error'),
      description:
        err instanceof Error
          ? err.message
          : t('superadmin.login.invalidCredentials'),
      color: 'error',
    })
  }
}

onBeforeMount(async () => {
  const isAuthenticated = await authStore.checkAuth()
  if (isAuthenticated) {
    await navigateTo(localePath('/superadmin'))
  }
})
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12"
  >
    <div class="w-full max-w-md">
      <UCard class="shadow-2xl">
        <template #header>
          <div class="flex flex-col items-center gap-4 text-center">
            <div
              class="flex items-center justify-center size-16 rounded-2xl bg-primary-500/10 dark:bg-primary-400/10"
            >
              <img
                src="/logoRed.png"
                alt="Krahaso Logo"
                class="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ t('superadmin.login.title') }}
              </h1>
            </div>
          </div>
        </template>

        <form class="space-y-6" @submit.prevent="handleLogin">
          <UFormField
            :label="t('superadmin.login.email')"
            name="email"
            required
          >
            <UInput
              v-model="credentials.email"
              type="email"
              :placeholder="t('superadmin.login.emailPlaceholder')"
              icon="i-lucide-mail"
              size="lg"
              :disabled="isLoading"
              autocomplete="email"
              autofocus
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('superadmin.login.password')"
            name="password"
            required
          >
            <UInput
              v-model="credentials.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="t('superadmin.login.passwordPlaceholder')"
              icon="i-lucide-lock"
              size="lg"
              :disabled="isLoading"
              autocomplete="current-password"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :padded="false"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="t('superadmin.login.error')"
            :description="error"
            class="mb-4"
            :close-button="{
              icon: 'i-lucide-x',
              color: 'neutral',
              variant: 'link',
              padded: false,
            }"
            @close="authStore.clear()"
          />

          <UButton
            type="submit"
            block
            size="lg"
            :loading="isLoading"
            :disabled="isLoading || !credentials.email || !credentials.password"
            class="font-semibold"
          >
            <template v-if="!isLoading">
              {{ t('superadmin.login.loginButton') }}
            </template>
            <template v-else>
              {{ t('superadmin.login.loggingIn') }}
            </template>
          </UButton>
        </form>
      </UCard>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          <NuxtLink
            :to="localePath('/')"
            class="text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            {{ t('superadmin.login.backToHome') }}
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
