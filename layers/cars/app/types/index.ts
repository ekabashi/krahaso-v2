export interface Vehicle {
  id: number
  tenant_id: number
  make: string
  model: string
  year: number
  daily_rate: number
  currency?: string
  images: string
  transmission: 'Automatik' | 'Manual'
  fuel: 'Diesel' | 'Benzin' | 'Electric' | 'Hybrid'
  seats: number
  doors: number
  category?: string
  v_color?: string
  status?: string
  tenant_name?: string
  tenant_logo?: string | null
  company_name?: string
  logo_url?: string | null
  is_season?: boolean
  original_price?: number
  season_multiplier?: number
  min_rental_days?: number
  kmPerDay?: number
  pricePerKm?: number
}

export interface CarsApiResponse {
  cars: Vehicle[]
  total: number
  page: number
  limit: number
}

export interface AddressPoint {
  id: number
  tenant_id: number
  adress: string
  zip?: string
  city?: string
  position?: number
}

export interface CityOption {
  label: string
  value: string
  tenant_id: number
  city?: string
}

export interface AddressLocationsResponse {
  addresses: AddressPoint[]
  pickupCities: CityOption[]
  dropOffByPickupCity: Record<string, CityOption[]>
}
