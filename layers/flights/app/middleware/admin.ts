const AUTH_TIMEOUT_MS = 5000

export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()

  // Use request cookies on SSR so hard refresh/direct admin links don't
  // randomly redirect due to client-side session atom not being hydrated yet.
  if (import.meta.server) {
    const sessionEndpoint: string = '/api/flights-auth/get-session'
    const headers = useRequestHeaders(['cookie'])

    try {
      const sessionResponse = await $fetch<{
        user?: { role?: string } | null
        session?: Record<string, unknown> | null
      }>(sessionEndpoint, { headers })

      if (!sessionResponse?.session) {
        return navigateTo(localePath('/login'))
      }

      if (sessionResponse.user?.role !== 'admin') {
        return navigateTo(localePath('/'))
      }

      return
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode
        : undefined
      console.error('[flights-admin-middleware] SSR session check failed', { statusCode })
      return navigateTo(localePath('/login'))
    }
  }

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
