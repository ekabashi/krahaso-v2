import { defineStore } from 'pinia'

type AuthUser = {
  id: string
  email: string
  role: string
  name?: string
  avatar?: string
}

type AuthStoreState = {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

export const useAuthStore = defineStore('authStore', {
  state: (): AuthStoreState => ({
    user: null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => state.user !== null,
    isSuperadmin: (state): boolean => state.user?.role === 'superadmin',
    currentUser: (state): AuthUser | null => state.user,
  },

  actions: {
    async login(email: string, password: string): Promise<void> {
      this.loading = true
      this.error = null

      try {
        const supabase = useSupabaseClient()
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        if (!data.user) {
          throw new Error('No user returned from authentication')
        }

        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'superadmin')
          .maybeSingle()

        if (roleError || !roleData) {
          await supabase.auth.signOut()
          throw new Error('Access denied. Superadmin role required.')
        }

        const role = (roleData as { role: string }).role

        if (role !== 'superadmin') {
          await supabase.auth.signOut()
          throw new Error('Access denied. Superadmin role required.')
        }

        this.user = {
          id: data.user.id,
          email: data.user.email ?? '',
          role,
          name: data.user.user_metadata?.name ?? data.user.email?.split('@')[0],
          avatar: data.user.user_metadata?.avatar,
        }

        await navigateTo('/superadmin')
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to authenticate. Please check your credentials.'
        this.user = null
        throw err
      } finally {
        this.loading = false
      }
    },

    async checkAuth(): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const supabase = useSupabaseClient()
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          this.user = null
          return false
        }

        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'superadmin')
          .maybeSingle()

        if (roleError || !roleData) {
          this.user = null
          return false
        }

        const role = (roleData as { role: string }).role

        if (role !== 'superadmin') {
          this.user = null
          return false
        }

        this.user = {
          id: user.id,
          email: user.email ?? '',
          role,
          name: user.user_metadata?.name ?? user.email?.split('@')[0],
          avatar: user.user_metadata?.avatar,
        }

        return true
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to check authentication'
        this.user = null
        return false
      } finally {
        this.loading = false
      }
    },

    async logout(): Promise<void> {
      try {
        const supabase = useSupabaseClient()
        await supabase.auth.signOut()
        this.user = null
        this.error = null
        await navigateTo('/superadmin/login')
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to log out'
        throw err
      }
    },

    setUser(user: AuthUser | null): void {
      this.user = user
    },

    clear(): void {
      this.user = null
      this.error = null
    },
  },
})
