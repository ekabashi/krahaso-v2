import { defineStore } from 'pinia'
import type {
  AddressPoint,
  BookingFormData,
  BookingOptions,
  BookingResponse,
} from '~/types'

type OptionsCache = Record<number, BookingOptions>
type AddressCache = Record<number, AddressPoint[]>

type BookingStoreState = {
  optionsByTenant: OptionsCache
  addressByTenant: AddressCache
  bookings: BookingResponse[]
  loadingOptions: boolean
  loadingAddresses: boolean
  loadingCreate: boolean
  error: string | null
}

export const useBookingStore = defineStore('bookingStore', {
  state: (): BookingStoreState => ({
    optionsByTenant: {},
    addressByTenant: {},
    bookings: [],
    loadingOptions: false,
    loadingAddresses: false,
    loadingCreate: false,
    error: null,
  }),

  getters: {
    optionsForTenant: (state: BookingStoreState) => (tenantId?: number) =>
      tenantId ? state.optionsByTenant[tenantId] : undefined,
    addressForTenant: (state: BookingStoreState) => (tenantId?: number) =>
      tenantId ? state.addressByTenant[tenantId] : undefined,
  },

  actions: {
    async fetchOptions(tenantId?: number): Promise<BookingOptions | undefined> {
      if (!tenantId) return undefined
      if (this.optionsByTenant[tenantId]) return this.optionsByTenant[tenantId]

      this.loadingOptions = true
      this.error = null
      try {
        const data = await $fetch<BookingOptions>('/api/bookings/options', {
          method: 'GET',
          params: { tenant_id: tenantId },
        })
        this.optionsByTenant[tenantId] = data
        return data
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to fetch booking options'
        throw err
      } finally {
        this.loadingOptions = false
      }
    },

    async fetchAddressPoints(
      tenantId?: number,
    ): Promise<AddressPoint[] | undefined> {
      if (!tenantId) return undefined
      if (this.addressByTenant[tenantId]) {
        return this.addressByTenant[tenantId]
      }

      this.loadingAddresses = true
      this.error = null
      try {
        const data = await $fetch<AddressPoint[]>(
          '/api/bookings/address-points',
          {
            method: 'GET',
            params: { tenant_id: tenantId },
          },
        )
        this.addressByTenant[tenantId] = data
        return data
      } catch (err) {
        this.error =
          err instanceof Error
            ? err.message
            : 'Failed to fetch booking address points'
        throw err
      } finally {
        this.loadingAddresses = false
      }
    },

    async createBooking(
      payload: BookingFormData | FormData,
    ): Promise<BookingResponse> {
      this.loadingCreate = true
      this.error = null
      try {
        const isFormData = payload instanceof FormData
        const fetchOptions: {
          method: 'POST'
          body: BookingFormData | FormData
          headers?: Record<string, string>
        } = {
          method: 'POST',
          body: payload,
        }

        if (!isFormData) {
          fetchOptions.headers = {
            'Content-Type': 'application/json',
          }
        }

        const data = await $fetch<BookingResponse>(
          '/api/bookings/create',
          fetchOptions,
        )
        this.bookings.push(data)
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to create booking'
        throw err
      } finally {
        this.loadingCreate = false
      }
    },
  },
})
