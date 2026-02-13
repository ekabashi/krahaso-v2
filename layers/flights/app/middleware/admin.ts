const AUTH_TIMEOUT_MS = 5000

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { isAuthenticated, isAdmin, isLoading } = useAuth()

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

  if (!isAdmin.value) {
    return navigateTo(localePath('/'))
  }
})
