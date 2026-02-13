import { createAuthClient } from 'better-auth/vue'
import { inferAdditionalFields } from 'better-auth/client/plugins'

const FLIGHTS_AUTH_BASE_PATH = '/api/flights-auth'

interface UserWithRole {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  role?: string
  createdAt: Date
  updatedAt: Date
}

function hasRole(user: unknown): user is UserWithRole {
  return typeof user === 'object' && user !== null && 'id' in user
}

function getBaseURL(): string {
  if (import.meta.client) {
    return window.location.origin
  }

  return process.env.BETTER_AUTH_URL || 'http://localhost:3000'
}

let _authClient: ReturnType<typeof createAuthClient> | null = null

function getAuthClient() {
  if (!_authClient) {
    _authClient = createAuthClient({
      baseURL: getBaseURL(),
      basePath: FLIGHTS_AUTH_BASE_PATH,
      sessionOptions: {
        // Avoid excessive get-session calls when switching between tabs/apps.
        refetchOnWindowFocus: false,
        refetchInterval: 0
      },
      plugins: [
        inferAdditionalFields({
          user: {
            role: {
              type: 'string',
              required: false
            }
          }
        })
      ]
    })
  }

  return _authClient
}

export function useAuth() {
  const authClient = getAuthClient()
  const session = authClient.useSession()

  const user = computed<UserWithRole | null>(() => {
    const userData = session.value?.data?.user
    return hasRole(userData) ? userData : null
  })

  const isAuthenticated = computed(() => !!session.value?.data?.session)
  const isLoading = computed(() => session.value?.isPending ?? false)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function signIn(data: {
    email: string
    password: string
    rememberMe?: boolean
  }) {
    // Ensure cars superadmin session is cleared before flights admin login.
    // This prevents both auth systems from being active in the same browser session.
    try {
      const supabase = useSupabaseClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Supabase sign out before flights login failed:', error)
    }

    const result = await authClient.signIn.email({
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe ?? true
    })

    if (result.error) {
      throw new Error(result.error.message || 'Login failed')
    }

    return result.data
  }

  async function signOut() {
    const localePath = useLocalePath()

    try {
      await authClient.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      await navigateTo(localePath('/'))
    }
  }

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    signIn,
    signOut
  }
}

