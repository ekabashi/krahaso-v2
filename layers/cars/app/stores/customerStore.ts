import { defineStore } from 'pinia'
import type { Customer } from '~/types'

type CustomerState = {
  current: Customer | null
  loading: boolean
  error: string | null
}

export const useCustomerStore = defineStore('customerStore', {
  state: (): CustomerState => ({
    current: null,
    loading: false,
    error: null,
  }),

  getters: {
    customer: (state): Customer | null => state.current,
    hasCustomer: (state): boolean => state.current !== null,
  },

  actions: {
    async fetchByEmail(
      tenantId: number,
      email: string,
    ): Promise<Customer | null> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<Customer | null>('/api/customers/by-email', {
          method: 'GET',
          params: { tenant_id: tenantId, email },
        })
        this.current = data
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to load customer'
        this.current = null
        throw err
      } finally {
        this.loading = false
      }
    },

    setCustomer(customer: Customer | null): void {
      this.current = customer
    },

    clear(): void {
      this.current = null
      this.error = null
    },
  },
})
