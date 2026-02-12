import { baseURL, requestJson } from './http'

export type AddressLocationsResponse = {
  pickupCities: Array<{ label: string; value: string; city?: string }>
}

/**
 * Fetch first pickup city from /api/addresses/all for use as location in search.
 * Returns null if API fails or no cities.
 */
export async function getFirstPickupCity(): Promise<string | null> {
  try {
    const { status, data } = await requestJson<AddressLocationsResponse>(
      'GET',
      '/api/addresses/all',
    )
    if (status !== 200 || !data) return null
    const cities = (data as AddressLocationsResponse).pickupCities
    if (!Array.isArray(cities) || cities.length === 0) return null
    const first = cities[0]
    return first?.value ?? first?.city ?? null
  } catch {
    return null
  }
}

export type SearchCarsParams = {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  location?: string
  dropoffLocation?: string
  page?: number
  limit?: number
}

export type CarItem = {
  id: number
  tenant_id: number
  [key: string]: unknown
}

export type SearchCarsResponse = {
  cars: CarItem[]
  total: number
  page: number
  limit: number
}

/**
 * Call the app's cars search API. Does NOT filter by tenant (marketplace returns all).
 */
export async function searchCars(params: SearchCarsParams): Promise<{ cars: CarItem[] }> {
  const query = new URLSearchParams()
  query.set('startDate', params.startDate)
  query.set('endDate', params.endDate)
  query.set('startTime', params.startTime)
  query.set('endTime', params.endTime)
  if (params.location) query.set('location', params.location)
  if (params.dropoffLocation) query.set('dropoffLocation', params.dropoffLocation)
  if (params.page != null) query.set('page', String(params.page))
  if (params.limit != null) query.set('limit', String(params.limit))

  const url = `${baseURL}/api/cars/search?${query.toString()}`
  const { status, data } = await requestJson<SearchCarsResponse>('GET', url)

  if (status !== 200) {
    throw new Error(`Search failed: ${status} ${JSON.stringify(data)}`)
  }

  const cars = Array.isArray((data as SearchCarsResponse).cars) ? (data as SearchCarsResponse).cars : []
  return { cars }
}
