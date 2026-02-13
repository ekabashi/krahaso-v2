<script setup lang="ts">
definePageMeta({
  layout: false
})

const localePath = useLocalePath()
const { signIn, isAuthenticated } = useAuth()

const form = reactive({
  email: '',
  password: ''
})

const isLoading = ref(false)
const error = ref<string | null>(null)

watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    navigateTo(localePath('/admin'))
  }
}, { immediate: true })

async function handleSubmit() {
  if (!form.email || !form.password) {
    error.value = 'Please enter your email and password.'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    await signIn({
      email: form.email,
      password: form.password,
      rememberMe: true
    })

    await navigateTo(localePath('/admin/analytics'))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed.'
  } finally {
    isLoading.value = false
  }
}

useSeoMeta({
  title: 'Flights Admin Login | Krahaso',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
    <UContainer>
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold">
            Flights Admin Login
          </h1>
          <p class="mt-2 text-sm text-muted">
            Sign in with your admin account
          </p>
        </div>

        <UCard>
          <form
            class="space-y-4"
            @submit.prevent="handleSubmit"
          >
            <UFormField
              label="Email"
              name="email"
            >
              <UInput
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
                icon="i-lucide-mail"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Password"
              name="password"
            >
              <UInput
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                placeholder="********"
                icon="i-lucide-lock"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UAlert
              v-if="error"
              color="error"
              variant="subtle"
              :title="error"
              icon="i-lucide-alert-circle"
            />

            <UButton
              type="submit"
              block
              size="lg"
              :loading="isLoading"
              :disabled="isLoading"
            >
              Sign in
            </UButton>
          </form>
        </UCard>

        <p class="mt-6 text-center text-sm text-muted">
          <NuxtLink
            :to="localePath('/')"
            class="text-primary hover:underline"
          >
            Back to website
          </NuxtLink>
        </p>
      </div>
    </UContainer>
  </div>
</template>
