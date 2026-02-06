import { useAuthStore } from '../stores/authStore'

export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const authStore = useAuthStore()
  const isAuthenticated = await authStore.checkAuth()

  if (!isAuthenticated) {
    const localePath = useLocalePath()
    return navigateTo(localePath('/superadmin/login'))
  }
})
