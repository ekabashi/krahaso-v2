import { defineStore } from 'pinia'
import type {
  AddressPoint,
  AddressLocationsResponse,
  CityOption,
} from '~/types'

type AddressStoreState = {
  addresses: AddressPoint[]
  pickupCities: CityOption[]
  dropOffByPickupCity: Record<string, CityOption[]>
  loading: boolean
  error: string | null
}

export const useAddressStore = defineStore('addressStore', {
  state: (): AddressStoreState => ({
    addresses: [],
    pickupCities: [],
    dropOffByPickupCity: {},
    loading: false,
    error: null,
  }),

  actions: {
    async fetchAllAddresses(): Promise<AddressLocationsResponse> {
      if (this.pickupCities.length > 0) {
        return {
          addresses: this.addresses,
          pickupCities: this.pickupCities,
          dropOffByPickupCity: this.dropOffByPickupCity,
        }
      }

      this.loading = true
      this.error = null
      try {
        const data = await $fetch<AddressLocationsResponse>('/api/addresses/all', {
          method: 'GET',
        })
        this.addresses = data.addresses
        this.pickupCities = data.pickupCities
        this.dropOffByPickupCity = data.dropOffByPickupCity
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to fetch addresses'
        this.addresses = []
        this.pickupCities = []
        this.dropOffByPickupCity = {}
        throw err
      } finally {
        this.loading = false
      }
    },

    clear(): void {
      this.addresses = []
      this.pickupCities = []
      this.dropOffByPickupCity = {}
      this.error = null
    },
  },
})
