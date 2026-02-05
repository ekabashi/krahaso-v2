import { defineStore } from 'pinia'
import type { SuperadminBooking } from '~/types'

type SuperadminBookingStoreState = {
  bookings: SuperadminBooking[]
  loading: boolean
  error: string | null
}

export const useSuperadminBookingStore = defineStore('superadminBookingStore', {
  state: (): SuperadminBookingStoreState => ({
    bookings: [],
    loading: false,
    error: null,
  }),

  getters: {
    allBookings: (state): SuperadminBooking[] => state.bookings,
    hasBookings: (state): boolean => state.bookings.length > 0,
  },

  actions: {
    async fetchBookings(): Promise<SuperadminBooking[]> {
      this.loading = true
      this.error = null
      try {
        const data = await $fetch<SuperadminBooking[]>('/api/superadmin/bookings', {
          method: 'GET',
        })
        this.bookings = data
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to fetch bookings'
        this.bookings = []
        throw err
      } finally {
        this.loading = false
      }
    },

    clear(): void {
      this.bookings = []
      this.error = null
    },
  },
})
