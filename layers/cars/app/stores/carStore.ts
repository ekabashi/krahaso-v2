import { defineStore } from 'pinia'
import type { CarsApiResponse, Vehicle } from '~/types'

export type CarFilters = {
  priceRange: [number, number]
  transmission: string[]
  fuel: string[]
  seats: number[]
  category: string[]
  color: string[]
  sortBy: 'price-asc' | 'price-desc' | 'year-desc' | 'name-asc'
}

export type SearchParams = {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  location?: string
  dropoffLocation?: string
}

type CarStoreState = {
  cars: Vehicle[]
  total: number
  page: number
  limit: number
  loading: boolean
  error: string | null
  filters: CarFilters
  viewMode: 'grid' | 'list'
  currentSearchParams: SearchParams | null
}

export const useCarStore = defineStore('carStore', {
  state: (): CarStoreState => ({
    cars: [],
    total: 0,
    page: 1,
    limit: 12,
    loading: false,
    error: null,
    filters: {
      priceRange: [0, 1000],
      transmission: [],
      fuel: [],
      seats: [],
      category: [],
      color: [],
      sortBy: 'price-asc',
    },
    viewMode: 'list',
    currentSearchParams: null,
  }),

  getters: {
    hasCars: (state): boolean => state.cars.length > 0,
    totalPages: (state): number => Math.ceil(state.total / state.limit),
    minPrice: (): number => 0,
    maxPrice: (): number => 1000,
    availableTransmissions: (): string[] => ['Automatik', 'Manual'],
    availableFuels: (): string[] => ['Diesel', 'Benzin', 'Electric', 'Hybrid'],
    availableSeats: (): number[] => [2, 4, 5, 6, 7, 8, 9],
    availableCategories: (): string[] =>
      ['compact', 'midsize', 'suv', 'economy', 'van', 'cabrio', 'coupe'],
    categoryDisplayNames: (): Record<string, string> => ({
      compact: 'Compact',
      midsize: 'Midsize',
      suv: 'SUV',
      economy: 'Economy',
      van: 'Van',
      cabrio: 'Cabrio',
      coupe: 'Coupe',
    }),
    availableColors: (): string[] => [
      'white',
      'pearl_white',
      'black',
      'metallic_black',
      'matte_black',
      'red',
      'pearl_red',
      'blue',
      'dark_blue',
      'green',
      'dark_green',
      'yellow',
      'orange',
      'purple',
      'gray',
      'dark_gray',
      'silver',
      'brown',
      'gold',
    ],
    activeFiltersCount(state): number {
      let count = 0
      if (state.filters.transmission.length > 0) count++
      if (state.filters.fuel.length > 0) count++
      if (state.filters.seats.length > 0) count++
      if (state.filters.category.length > 0) count++
      if (state.filters.color.length > 0) count++
      if (
        state.filters.priceRange[0] !== 0 ||
        state.filters.priceRange[1] !== 1000
      )
        count++
      return count
    },
    hasActiveSearch: (state): boolean => state.currentSearchParams !== null,
  },

  actions: {
    async setPage(page: number): Promise<void> {
      this.page = page
      if (this.currentSearchParams) {
        await this.searchCars(this.currentSearchParams)
      }
    },

    setLimit(limit: number): void {
      this.limit = limit
      this.page = 1
    },

    setViewMode(mode: 'grid' | 'list'): void {
      this.viewMode = mode
    },

    async setFilters(
      filters: Partial<CarFilters>,
      skipSearch = false,
    ): Promise<void> {
      this.filters = { ...this.filters, ...filters }
      this.page = 1
      if (!skipSearch && this.currentSearchParams) {
        await this.searchCars(this.currentSearchParams)
      }
    },

    async resetFilters(): Promise<void> {
      this.filters = {
        priceRange: [0, 1000],
        transmission: [],
        fuel: [],
        seats: [],
        category: [],
        color: [],
        sortBy: 'price-asc',
      }
      this.page = 1
      if (this.currentSearchParams) {
        await this.searchCars(this.currentSearchParams)
      }
    },

    async searchCars(searchParams: SearchParams): Promise<CarsApiResponse> {
      this.loading = true
      this.error = null
      this.currentSearchParams = searchParams

      try {
        const params: Record<string, string | number | undefined> = {
          ...searchParams,
          page: this.page,
          limit: this.limit,
        }
        const { filters } = this
        if (filters.priceRange[0] > 0) params.minPrice = filters.priceRange[0]
        if (filters.priceRange[1] < 1000) params.maxPrice = filters.priceRange[1]
        if (filters.transmission.length > 0)
          params.transmission = filters.transmission.join(',')
        if (filters.fuel.length > 0) params.fuel = filters.fuel.join(',')
        if (filters.seats.length > 0) params.seats = filters.seats.join(',')
        if (filters.category.length > 0)
          params.category = filters.category.join(',')
        if (filters.color.length > 0) params.color = filters.color.join(',')
        params.sortBy = filters.sortBy

        const data = await $fetch<CarsApiResponse>('/api/cars/search', {
          method: 'GET',
          params,
        })
        this.cars = data.cars
        this.total = data.total
        this.page = data.page
        this.limit = data.limit
        return data
      } catch (err) {
        this.error =
          err instanceof Error ? err.message : 'Failed to search cars'
        this.cars = []
        this.total = 0
        throw err
      } finally {
        this.loading = false
      }
    },

    clear(): void {
      this.cars = []
      this.total = 0
      this.page = 1
      this.error = null
      this.currentSearchParams = null
    },

    formatCategoryDisplay(category: string | null | undefined): string {
      if (!category) return ''
      const categoryMap = this.categoryDisplayNames
      return categoryMap[category.toLowerCase()] || category
    },
  },
})
