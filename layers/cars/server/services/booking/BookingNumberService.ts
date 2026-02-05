import type { SupabaseClient } from '@supabase/supabase-js'

export class BookingNumberService {
  constructor(private client: SupabaseClient) {}

  async generateUniqueBookingNumber(tenantId: number): Promise<string> {
    let isUnique = false
    let bookingNumber = ''

    while (!isUnique) {
      bookingNumber = this.generateBookingNumber(tenantId)
      const exists = await this.checkExists(bookingNumber)
      isUnique = !exists
    }

    return bookingNumber
  }

  private generateBookingNumber(tenantId: number): string {
    const randomString = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()
    return `${String(tenantId)}-${randomString}`
  }

  async checkExists(bookingNumber: string): Promise<boolean> {
    const { data } = await this.client
      .from('bookings')
      .select('id')
      .eq('booking_number', bookingNumber)
      .maybeSingle()

    return data !== null
  }

  isValidBookingNumber(bookingNumber: string): boolean {
    const pattern = /^\d+-[A-Z0-9]{8}$/
    return pattern.test(bookingNumber)
  }

  extractTenantId(bookingNumber: string): number | null {
    const parts = bookingNumber.split('-')
    if (parts.length !== 2) return null
    const tenantId = parseInt(parts[0] ?? '', 10)
    return Number.isNaN(tenantId) ? null : tenantId
  }
}
