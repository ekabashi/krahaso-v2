import { defineStore } from 'pinia'
import type { SettlementRequest, TenantSettlementSummary } from '~/types'

type SettlementRequestStoreState = {
  summaries: TenantSettlementSummary[]
  requests: SettlementRequest[]
  loading: boolean
  error: string | null
  total: number
  page: number
  limit: number
}

export const useSettlementRequestStore = defineStore('settlementRequestStore', {
  state: (): SettlementRequestStoreState => ({
    summaries: [],
    requests: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    limit: 10,
  }),

  getters: {
    hasSummaries: (state): boolean => state.summaries.length > 0,
    hasRequests: (state): boolean => state.requests.length > 0,
    totalPages: (state): number => Math.ceil(state.total / state.limit),
  },

  actions: {
    async fetchSummaries(params?: {
      page?: number
      limit?: number
      search?: string
    }): Promise<{
      data: TenantSettlementSummary[]
      total: number
      page: number
      limit: number
    }> {
      this.loading = true
      this.error = null
      try {
        const queryParams: Record<string, string> = {}
        if (params?.page) queryParams.page = params.page.toString()
        if (params?.limit) queryParams.limit = params.limit.toString()
        if (params?.search) queryParams.search = params.search

        const result = await $fetch<{
          data: TenantSettlementSummary[]
          total: number
          page: number
          limit: number
        }>('/api/superadmin/settlement-requests', {
          method: 'GET',
          query: queryParams,
        })

        this.summaries = result.data
        this.total = result.total
        this.page = result.page
        this.limit = result.limit
        return result
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to fetch settlement request summaries'
        this.summaries = []
        this.total = 0
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchRequestsByTenant(
      tenantId: number,
      params?: {
        page?: number
        limit?: number
        status?: string
      },
    ): Promise<{
      data: SettlementRequest[]
      total: number
      page: number
      limit: number
    }> {
      this.loading = true
      this.error = null
      try {
        const queryParams: Record<string, string> = {}
        if (params?.page) queryParams.page = params.page.toString()
        if (params?.limit) queryParams.limit = params.limit.toString()
        if (params?.status) queryParams.status = params.status

        const result = await $fetch<{
          data: SettlementRequest[]
          total: number
          page: number
          limit: number
        }>(`/api/superadmin/settlement-requests/${tenantId}`, {
          method: 'GET',
          query: queryParams,
        })

        this.requests = result.data
        this.total = result.total
        this.page = result.page
        this.limit = result.limit
        return result
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to fetch settlement requests'
        this.requests = []
        this.total = 0
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateRequestStatuses(
      requestIds: string[],
      status: 'pending' | 'approved' | 'rejected' | 'completed',
    ): Promise<SettlementRequest[]> {
      this.loading = true
      this.error = null
      try {
        const result = await $fetch<{
          data: SettlementRequest[]
          count: number
        }>('/api/superadmin/settlement-requests/update-status', {
          method: 'POST',
          body: { requestIds, status },
        })

        for (const updatedRequest of result.data) {
          const index = this.requests.findIndex((r) => r.id === updatedRequest.id)
          if (index !== -1) {
            this.requests[index] = updatedRequest
          }
        }

        return result.data
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to update settlement request statuses'
        throw err
      } finally {
        this.loading = false
      }
    },

    clear(): void {
      this.summaries = []
      this.requests = []
      this.error = null
      this.total = 0
    },
  },
})
