import { defineStore } from 'pinia'
import type { PartnershipRequest } from '~/types'

type PartnershipRequestStoreState = {
  requests: PartnershipRequest[]
  loading: boolean
  error: string | null
  total: number
  page: number
  limit: number
}

export const usePartnershipRequestStore = defineStore('partnershipRequestStore', {
  state: (): PartnershipRequestStoreState => ({
    requests: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    limit: 10,
  }),

  getters: {
    allRequests: (state): PartnershipRequest[] => state.requests,
    hasRequests: (state): boolean => state.requests.length > 0,
    pendingCount: (state): number =>
      state.requests.filter((r) => r.partnership_status === 'pending').length,
    totalPages: (state): number => Math.ceil(state.total / state.limit),
  },

  actions: {
    async fetchRequests(params?: {
      page?: number
      limit?: number
      search?: string
    }): Promise<{
      data: PartnershipRequest[]
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
          data: PartnershipRequest[]
          total: number
          page: number
          limit: number
        }>('/api/superadmin/partnership-requests', {
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
          err instanceof Error ? err.message : 'Failed to fetch partnership requests'
        this.requests = []
        this.total = 0
        throw err
      } finally {
        this.loading = false
      }
    },

    async approveRequest(
      partnershipId: string,
      percentage: number,
    ): Promise<PartnershipRequest> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<PartnershipRequest>(
          `/api/superadmin/partnership-requests/${partnershipId}/approve`,
          { method: 'POST', body: { percentage } },
        )
        const index = this.requests.findIndex((r) => r.id === partnershipId)
        if (index !== -1) {
          this.requests[index] = data
        }
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to approve partnership request'
        throw err
      } finally {
        this.loading = false
      }
    },

    async rejectRequest(partnershipId: string): Promise<PartnershipRequest> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<PartnershipRequest>(
          `/api/superadmin/partnership-requests/${partnershipId}/reject`,
          { method: 'POST' },
        )
        const index = this.requests.findIndex((r) => r.id === partnershipId)
        if (index !== -1) {
          this.requests[index] = data
        }
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to reject partnership request'
        throw err
      } finally {
        this.loading = false
      }
    },

    async updatePercentage(
      partnershipId: string,
      percentage: number,
    ): Promise<PartnershipRequest> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<PartnershipRequest>(
          `/api/superadmin/partnership-requests/${partnershipId}/update-percentage`,
          { method: 'POST', body: { percentage } },
        )
        const index = this.requests.findIndex((r) => r.id === partnershipId)
        if (index !== -1) {
          this.requests[index] = data
        }
        return data
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to update partnership percentage'
        throw err
      } finally {
        this.loading = false
      }
    },

    async updatePartnershipStatus(
      partnershipId: string,
      isPartnership: boolean,
    ): Promise<PartnershipRequest> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<PartnershipRequest>(
          `/api/superadmin/partnership-requests/${partnershipId}/update-status`,
          { method: 'POST', body: { is_partnership: isPartnership } },
        )
        const index = this.requests.findIndex((r) => r.id === partnershipId)
        if (index !== -1) {
          this.requests[index] = data
        }
        return data
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to update partnership status'
        throw err
      } finally {
        this.loading = false
      }
    },

    clear(): void {
      this.requests = []
      this.error = null
    },
  },
})
