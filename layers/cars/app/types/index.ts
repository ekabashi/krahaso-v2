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

export interface BookingOptions {
  id?: number
  tenant_id: number
  second_driver: boolean
  second_driver_price: number
  gps_navigation: boolean
  gps_navigation_price: number
  maksikos: boolean
  maksikos_price: number
  green_card: boolean
  green_card_price: number
  european_card: boolean
  european_card_price: number
  road_assistance: boolean
  road_assistance_price: number
  out_of_kosovo: boolean
  out_of_kosovo_price: number
}

export interface BookingFormData {
  vehicle_id: number
  tenant_id: number
  pickupPoint: string
  returnPoint: string
  startDateTime: string
  endDateTime: string
  options: {
    secondDriver: boolean
    gps: boolean
    maksikos: boolean
    greenCard: boolean
    europeanCard: boolean
    roadAssistance: boolean
    outOfKosovo: boolean
  }
  customer: {
    name: string
    surname: string
    email: string
    phone: string
    address: { street: string; city: string }
    PersonalNr?: string
    licenseClasses?: string[]
    frontIdFile?: File | string | null
    backIdFile?: File | string | null
    passportFile?: File | string | null
    patentShoferFile?: File | string | null
  }
  description?: string
  analytics?: {
    eventId?: string
    sourceUrl?: string
  }
}

export interface BookingResponse {
  id: number
  booking_number: string
  status: string
  total_price: number
  message?: string
}

export interface CustomerAddress {
  street: string
  city: string
}

export interface Customer {
  id: number
  tenant_id?: number
  name: string
  surname: string
  email: string
  phone: string
  address: CustomerAddress
  PersonalNr?: string
  licenseClasses?: string[]
  frontIdFile?: string | null
  backIdFile?: string | null
  passportFile?: string | null
  patentShoferFile?: string | null
}

export interface Season {
  id: number
  tenant_id: number
  name?: string
  start_date: string
  end_date: string
  price_multiplier: number
}

export interface AddOnBreakdown {
  name: string
  dailyCost: number
  totalCost: number
}

export interface PricingResult {
  totalPrice: number
  dailyRate: number
  baseRate: number
  rentalDays: number
  seasonalMultiplier?: number
  season?: Season
  addOns: AddOnBreakdown[]
}

// Superadmin types
export interface SuperadminTenant {
  id: number
  name: string | null
  company_name: string | null
  logo_url: string | null
  public_phone: string | null
  public_email: string | null
  status: string | null
  created_at: string
  subdomain: string
  isPartnership: boolean
  percentage: number | null
}

export interface TenantBookingStats {
  tenant: SuperadminTenant
  totalBookings: number
  totalRevenue: number
  marketplaceShare: number
  tenantShare: number
  percentage: number
  bookings: Array<{
    id: number
    booking_number: string
    total_price: number
    status: string
    created_at: string
    startDateTime: string
    endDateTime: string
    vehicle: { make: string; model: string; year: number }
    customer: { name: string; surname: string; email: string }
  }>
}

export interface ReconciliationHistoryEntry {
  id: number
  tenant_id: number
  settled_count: number
  total_revenue: number
  marketplace_share: number
  tenant_share: number
  percentage: number
  booking_ids: number[]
  created_at: string
  created_by: string
  notes: string | null
  bookings: Array<{
    id: number
    booking_number: string
    total_price: number
    status: string
    created_at: string
    startDateTime: string
    endDateTime: string
    vehicle: { make: string; model: string; year: number }
    customer: { name: string; surname: string; email: string }
  }>
}

export interface TenantReconciliationHistory {
  tenant: SuperadminTenant
  history: ReconciliationHistoryEntry[]
}

export interface TenantSettlementSummary {
  tenant_id: number
  company_name: string | null
  subdomain: string
  request_count: number
  tenant: {
    id: number
    name: string | null
    subdomain: string
    status: string | null
    company_name: string | null
    logo_url: string | null
    public_email: string | null
    public_phone: string | null
  }
}

export interface SettlementRequest {
  id: string
  tenant_id: number
  booking_numbers: string[]
  booking_ids: number[]
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requested_by: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
  tenant?: {
    id: number
    name: string | null
    subdomain: string
    status: string | null
    company_name: string | null
    logo_url: string | null
    public_email: string | null
    public_phone: string | null
  }
  bookings?: Array<{
    id: number
    booking_number: string
    total_price: number
    fee: number
    vehicle: {
      make: string
      model: string
      year: number
      license_plate?: string | null
    } | null
    customer: { name: string; surname: string } | null
    startDateTime: string
    endDateTime: string
  }>
}

export interface PartnershipRequest {
  id: string
  tenant_id: number
  created_at: string
  updated_at: string | null
  is_partnership: boolean
  percentage: number | null
  partner_start_date: string | null
  partnership_status: 'pending' | 'approved' | 'rejected'
  tenant: {
    id: number
    name: string | null
    subdomain: string
    status: string | null
    company_name: string | null
    logo_url: string | null
    public_email: string | null
    public_phone: string | null
  }
}

export interface SuperadminBooking {
  id: number
  booking_number: string
  status: string
  total_price: number
  fee: number
  created_at: string
  startDateTime: string
  endDateTime: string
  tenant: {
    id: number
    name: string | null
    subdomain: string | null
    company_name?: string | null
  } | null
}
