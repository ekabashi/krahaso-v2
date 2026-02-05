import { defineStore } from 'pinia'
import type {
  SuperadminTenant,
  TenantBookingStats,
  TenantReconciliationHistory,
  ReconciliationHistoryEntry,
} from '~/types'

type TenantStoreState = {
  tenants: SuperadminTenant[]
  selectedTenantStats: TenantBookingStats | null
  reconciliationHistory: TenantReconciliationHistory | null
  loading: boolean
  error: string | null
}

export const useTenantStore = defineStore('tenantStore', {
  state: (): TenantStoreState => ({
    tenants: [],
    selectedTenantStats: null,
    reconciliationHistory: null,
    loading: false,
    error: null,
  }),

  getters: {
    allTenants: (state): SuperadminTenant[] => state.tenants,
    hasTenants: (state): boolean => state.tenants.length > 0,
    activeTenants: (state): SuperadminTenant[] =>
      state.tenants.filter((t) => t.status === 'active'),
    pendingTenants: (state): SuperadminTenant[] =>
      state.tenants.filter((t) => t.status === 'pending'),
    suspendedTenants: (state): SuperadminTenant[] =>
      state.tenants.filter((t) => t.status === 'suspended'),
  },

  actions: {
    async fetchTenants(): Promise<SuperadminTenant[]> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<SuperadminTenant[]>('/api/superadmin/tenants', {
          method: 'GET',
        })
        this.tenants = data
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to fetch tenants'
        this.tenants = []
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchTenantStats(tenantId: number): Promise<TenantBookingStats> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<TenantBookingStats>(
          `/api/superadmin/tenants/${tenantId}/stats`,
          { method: 'GET' },
        )
        this.selectedTenantStats = data
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to fetch tenant statistics'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchTenantReconciliationStats(
      tenantId: number,
    ): Promise<TenantBookingStats> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<TenantBookingStats>(
          `/api/superadmin/tenants/${tenantId}/reconcile/stats`,
          { method: 'GET' },
        )
        this.selectedTenantStats = data
        return data
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to fetch reconciliation statistics'
        throw err
      } finally {
        this.loading = false
      }
    },

    async applyReconciliation(
      tenantId: number,
    ): Promise<{ settledCount: number }> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<{ settledCount: number }>(
          `/api/superadmin/tenants/${tenantId}/reconcile/apply`,
          { method: 'POST' },
        )
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to apply reconciliation'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchTenantReconciliationHistory(
      tenantId: number,
    ): Promise<TenantReconciliationHistory> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<TenantReconciliationHistory>(
          `/api/superadmin/tenants/${tenantId}/reconciliation-history`,
          { method: 'GET' },
        )
        this.reconciliationHistory = data
        return data
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to fetch reconciliation history'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchReconciliationDetails(
      tenantId: number,
      reconciliationId: number,
    ): Promise<ReconciliationHistoryEntry> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<ReconciliationHistoryEntry>(
          `/api/superadmin/tenants/${tenantId}/reconciliation/${reconciliationId}`,
          { method: 'GET' },
        )
        return data
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to fetch reconciliation details'
        throw err
      } finally {
        this.loading = false
      }
    },

    clear(): void {
      this.tenants = []
      this.error = null
    },
  },
})
