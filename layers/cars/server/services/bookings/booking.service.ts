import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BookingFormData,
  BookingResponse,
  BookingOptions,
  AddressPoint,
} from '../../types'
import { PricingService } from '../pricing/PricingService'
import { BookingNumberService } from '../booking/BookingNumberService'
import { BookingOptionsService } from '../booking/BookingOptionsService'
import { AddressPointService } from '../address/AddressPointService'
import { CustomerService } from '../customers/customer.service'

type CustomerInsert = {
  tenant_id: number
  name: string
  surname: string
  email: string
  phone: string
  address: Record<string, unknown>
  PersonalNr?: string | null
  licenseClasses?: string[]
  status?: string
  frontIdFile?: string | null
  backIdFile?: string | null
  passportFile?: string | null
  patentShoferFile?: string | null
}

type BookingResponseRow = {
  id: number
  booking_number: string
  status: string
  total_price: number
}

type BookingInsertPayload = {
  tenant_id: number
  vehicle_id: number
  customer_id: number
  startDateTime: string
  endDateTime: string
  pickupPoint: string
  returnPoint: string
  total_price: number
  status: string
  options: BookingFormData['options']
  description: string | null
  booking_number: string
  vehicle_price: string
  created_by: string
}

export class BookingService {
  private pricingService: PricingService
  private bookingNumberService: BookingNumberService
  private bookingOptionsService: BookingOptionsService
  private addressPointService: AddressPointService
  private customerService: CustomerService

  constructor(private client: SupabaseClient) {
    this.pricingService = new PricingService(client)
    this.bookingNumberService = new BookingNumberService(client)
    this.bookingOptionsService = new BookingOptionsService(client)
    this.addressPointService = new AddressPointService(client)
    this.customerService = new CustomerService(client)
  }

  async getOptions(tenantId: number): Promise<BookingOptions> {
    return this.bookingOptionsService.getOptions(tenantId)
  }

  async getAddressPoints(tenantId: number): Promise<AddressPoint[]> {
    return this.addressPointService.getAddressPoints(tenantId)
  }

  async createBooking(
    bookingData: BookingFormData,
    customerDocuments: {
      frontIdFile: string | null
      backIdFile: string | null
      passportFile: string | null
      patentShoferFile: string | null
    },
  ): Promise<BookingResponse> {
    if (!bookingData.vehicle_id || !bookingData.tenant_id) {
      throw new Error('vehicle_id and tenant_id are required')
    }

    const customerData = {
      ...bookingData.customer,
      ...customerDocuments,
    }

    const customerId = await this.findOrCreateCustomer(
      bookingData.tenant_id,
      customerData,
    )

    const pricingResult = await this.pricingService.calculateTotalPrice(
      bookingData.tenant_id,
      bookingData.vehicle_id,
      bookingData.startDateTime,
      bookingData.endDateTime,
      bookingData.options,
    )

    const bookingNumber =
      await this.bookingNumberService.generateUniqueBookingNumber(
        bookingData.tenant_id,
      )

    const bookingPayload: BookingInsertPayload = {
      tenant_id: bookingData.tenant_id,
      vehicle_id: bookingData.vehicle_id,
      customer_id: customerId,
      startDateTime: bookingData.startDateTime,
      endDateTime: bookingData.endDateTime,
      pickupPoint: bookingData.pickupPoint,
      returnPoint: bookingData.returnPoint,
      total_price: pricingResult.totalPrice,
      status: 'upcoming',
      options: bookingData.options,
      description: bookingData.description ?? null,
      booking_number: bookingNumber,
      vehicle_price: pricingResult.dailyRate.toString(),
      created_by: 'autopika',
    }

    const { data: booking, error: bookingError } = await this.client
      .from('bookings')
      .insert(bookingPayload as Record<string, unknown>)
      .select('id, booking_number, status, total_price')
      .single<BookingResponseRow>()

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`)
    }

    return {
      id: booking.id,
      booking_number: booking.booking_number,
      status: booking.status,
      total_price: booking.total_price,
      message: 'Booking created successfully',
    }
  }

  private async findOrCreateCustomer(
    tenantId: number,
    customerData: BookingFormData['customer'] & {
      frontIdFile?: string | null
      backIdFile?: string | null
      passportFile?: string | null
      patentShoferFile?: string | null
    },
  ): Promise<number> {
    const { data: existingCustomer, error: existingCustomerError } =
      await this.client
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', customerData.email)
        .maybeSingle<{ id: number }>()

    if (existingCustomerError) {
      throw new Error(
        `Failed to fetch customer: ${existingCustomerError.message}`,
      )
    }

    if (existingCustomer) {
      await this.updateCustomerDocuments(existingCustomer.id, customerData)
      return existingCustomer.id
    }

    const { data: newCustomer, error: customerError } = await this.client
      .from('customers')
      .insert<CustomerInsert>([
        {
          tenant_id: tenantId,
          name: customerData.name,
          surname: customerData.surname,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          PersonalNr: customerData.PersonalNr,
          licenseClasses: customerData.licenseClasses ?? [],
          status: 'active',
          frontIdFile: customerData.frontIdFile ?? null,
          backIdFile: customerData.backIdFile ?? null,
          passportFile: customerData.passportFile ?? null,
          patentShoferFile: customerData.patentShoferFile ?? null,
        } as CustomerInsert,
      ])
      .select('id')
      .single<{ id: number }>()

    if (customerError !== null) {
      throw new Error(`Failed to create customer: ${customerError.message}`)
    }

    return newCustomer.id
  }

  private async updateCustomerDocuments(
    customerId: number,
    customerData: BookingFormData['customer'] & {
      frontIdFile?: string | null
      backIdFile?: string | null
      passportFile?: string | null
      patentShoferFile?: string | null
    },
  ): Promise<void> {
    const documentUpdates: Partial<CustomerInsert> = {}
    if (customerData.frontIdFile)
      documentUpdates.frontIdFile = customerData.frontIdFile as string
    if (customerData.backIdFile)
      documentUpdates.backIdFile = customerData.backIdFile as string
    if (customerData.passportFile)
      documentUpdates.passportFile = customerData.passportFile as string
    if (customerData.patentShoferFile)
      documentUpdates.patentShoferFile =
        customerData.patentShoferFile as string

    if (Object.keys(documentUpdates).length === 0) return

    const { error: documentUpdateError } = await this.client
      .from('customers')
      .update(documentUpdates)
      .eq('id', customerId)

    if (documentUpdateError) {
      throw new Error(
        `Failed to update customer documents: ${documentUpdateError.message}`,
      )
    }
  }

  async getBookingByNumber(bookingNumber: string) {
    if (!bookingNumber || bookingNumber.trim() === '') {
      throw new Error('booking_number is required')
    }

    const { data: booking, error } = await this.client
      .from('bookings')
      .select(
        `
        id,
        booking_number,
        status,
        total_price,
        startDateTime,
        endDateTime,
        pickupPoint,
        returnPoint,
        description,
        vehicle_price,
        options,
        vehicles:vehicle_id (
          id,
          make,
          model,
          year,
          images,
          category
        ),
        customers:customer_id (
          id,
          name,
          surname,
          email,
          phone,
          address
        )
      `,
      )
      .eq('booking_number', bookingNumber.trim())
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch booking: ${error.message}`)
    }

    return booking
  }

  async getSuperadminBookings(createdBy: string): Promise<Array<{
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
      company_name: string | null
    } | null
  }>> {
    const { data: partnerships, error: partnershipsError } = await this.client
      .from('partnership')
      .select('tenant_id, percentage')
      .eq('is_partnership', true)

    if (partnershipsError) {
      throw new Error(`Failed to fetch partnerships: ${partnershipsError.message}`)
    }

    if (!partnerships || partnerships.length === 0) {
      return []
    }

    const tenantIds = partnerships.map((p) => p.tenant_id as number)
    const partnershipMap = new Map<number, number | null>(
      partnerships.map((p) => [p.tenant_id as number, p.percentage as number | null]),
    )

    const { data: tenants, error: tenantsError } = await this.client
      .from('tenants')
      .select('id, name, subdomain')
      .in('id', tenantIds)

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`)
    }

    const tenantMap = new Map<number, { id: number; name: string | null; subdomain: string | null }>()
    ;(tenants || []).forEach((t: { id: number; name: string | null; subdomain: string | null }) => {
      tenantMap.set(t.id, { id: t.id, name: t.name, subdomain: t.subdomain })
    })

    const { data: companyInfos, error: companyInfoError } = await this.client
      .from('company_public_info')
      .select('tenant_id, company_name')
      .in('tenant_id', tenantIds)

    if (companyInfoError) {
      throw new Error(`Failed to fetch company info: ${companyInfoError.message}`)
    }

    const companyInfoMap = new Map<number, string | null>()
    ;(companyInfos || []).forEach((info: { tenant_id: number; company_name: string | null }) => {
      companyInfoMap.set(info.tenant_id, info.company_name)
    })

    const { data: bookings, error: bookingsError } = await this.client
      .from('bookings')
      .select('id,booking_number,tenant_id,total_price,status,created_at,startDateTime,endDateTime')
      .in('tenant_id', tenantIds)
      .eq('created_by', createdBy)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
    }

    return (bookings || []).map((b: { id: number; booking_number: string; tenant_id: number; total_price: string | number; status: string; created_at: string; startDateTime: string; endDateTime: string }) => {
      const tenantData = tenantMap.get(b.tenant_id)
      const companyName = companyInfoMap.get(b.tenant_id) ?? null
      const percentage = partnershipMap.get(b.tenant_id) ?? 0
      const totalPrice = Number(b.total_price) || 0
      const fee =
        percentage > 0
          ? Math.round((totalPrice * percentage) / 100 * 100) / 100
          : 0
      return {
        id: b.id,
        booking_number: b.booking_number,
        status: b.status,
        total_price: totalPrice,
        fee,
        created_at: b.created_at,
        startDateTime: b.startDateTime,
        endDateTime: b.endDateTime,
        tenant: tenantData
          ? {
              id: tenantData.id,
              name: tenantData.name,
              subdomain: tenantData.subdomain,
              company_name: companyName,
            }
          : null,
      }
    })
  }

  getPricingService(): PricingService {
    return this.pricingService
  }

  getBookingNumberService(): BookingNumberService {
    return this.bookingNumberService
  }
}
