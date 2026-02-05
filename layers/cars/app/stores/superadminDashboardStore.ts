import { defineStore } from 'pinia'

type DashboardStats = {
  totalPartners: number
  totalBookings: number
  activeCars: number
  totalFee: number
  totalRevenue: number
  pendingPartnershipRequests: number
  pendingSettlementRequests: number
}

type SuperadminDashboardState = {
  stats: DashboardStats | null
  monthlyRevenue: Array<{
    month: string
    revenue: number
    fee: number
    bookingsCount: number
  }>
  loading: boolean
  error: string | null
}

export const useSuperadminDashboardStore = defineStore('superadminDashboard', {
  state: (): SuperadminDashboardState => ({
    stats: null,
    monthlyRevenue: [],
    loading: false,
    error: null,
  }),

  getters: {
    getStats: (state) => state.stats,
    getMonthlyRevenue: (state) => state.monthlyRevenue,
    isLoading: (state) => state.loading,
    hasError: (state) => state.error,
  },

  actions: {
    async fetchDashboardStats() {
      this.loading = true
      this.error = null

      try {
        const data = await $fetch<DashboardStats>(
          '/api/superadmin/dashboard/stats',
          { method: 'GET' },
        )
        this.stats = data
      } catch (err: unknown) {
        this.error =
          err instanceof Error ? err.message : 'Failed to fetch dashboard statistics'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchMonthlyRevenue() {
      try {
        const data = await $fetch<
          Array<{
            month: string
            revenue: number
            fee: number
            bookingsCount: number
          }>
        >('/api/superadmin/dashboard/monthly-revenue', { method: 'GET' })
        this.monthlyRevenue = data
      } catch (err: unknown) {
        console.error('Error fetching monthly revenue:', err)
      }
    },
  },
})
