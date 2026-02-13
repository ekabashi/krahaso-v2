const AUTH_TIMEOUT_MS = 5000

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()

  if (import.meta.server) {
    const sessionEndpoint: string = '/api/flights-auth/get-session'
    const headers = useRequestHeaders(['cookie'])

    try {
      const sessionResponse = await $fetch<{
        session?: Record<string, unknown> | null
      }>(sessionEndpoint, { headers })

      if (!sessionResponse?.session) {
        return navigateTo(localePath('/login'))
      }

      return
    } catch {
      return navigateTo(localePath('/login'))
    }
  }

  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading.value) {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unwatch()
          reject(new Error('Auth session loading timeout'))
        }, AUTH_TIMEOUT_MS)

        const unwatch = watch(isLoading, (loading) => {
          if (!loading) {
            clearTimeout(timeout)
            unwatch()
            resolve()
          }
        })
      })
    } catch {
      return navigateTo(localePath('/login'))
    }
  }

  if (!isAuthenticated.value) {
    return navigateTo(localePath('/login'))
  }
})
