import { serverSupabaseClient } from '#supabase/server'
import { readMultipartFormData } from 'h3'
import type { H3Event } from 'h3'
import type { BookingFormData } from '../../types'
import { BookingService } from '../../services/bookings/booking.service'
import { StorageService } from '../../services/storage/storage.service'
import { EmailService } from '../../services/email/email.service'
import { normalizeBucketName } from '../../utils/string.utils'
import { getLogger } from '../../utils/logger'
import { validateBody } from '../../utils/validate'
import { createBookingSchema } from '../../schemas/bookings/create.schema'
import { getDaysDifference } from '../../utils/date.utils'
import dayjs from 'dayjs'

type MultipartFile = {
  name?: string
  filename?: string
  type?: string
  data: Buffer
}

export default defineEventHandler(async (event: H3Event) => {
  const log = getLogger(event)
  const client = await serverSupabaseClient(event)
  const runtimeConfig = useRuntimeConfig()
  const storageBucket = normalizeBucketName(
    (runtimeConfig as Record<string, unknown>).supabaseStorageBucket as
      | string
      | undefined,
  )
  const baseUrl =
    (runtimeConfig.public as Record<string, unknown>).siteUrl as
      | string
      | undefined || 'https://krahaso.co'
  const brevoApiKey =
    ((runtimeConfig as Record<string, unknown>).brevoApiKey as string) || ''

  log.info('Creating new booking')

  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No form data provided',
    })
  }

  const payloadPart = formData.find((part) => part.name === 'payload')
  if (!payloadPart?.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing payload in form data',
    })
  }

  let rawBody: unknown
  try {
    rawBody = JSON.parse(payloadPart.data.toString())
  } catch (error) {
    log.error('Failed to parse booking payload', error as Error)
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid JSON in payload',
    })
  }

  const body = validateBody(createBookingSchema, rawBody) as BookingFormData

  const fileMap = formData
    .filter(
      (part): part is MultipartFile & { name: string } =>
        !!part.filename && !!part.name,
    )
    .reduce<Record<string, MultipartFile>>((acc, part) => {
      acc[part.name] = part
      return acc
    }, {})

  log.info('Processing booking', {
    vehicleId: body.vehicle_id,
    tenantId: body.tenant_id,
    fileCount: Object.keys(fileMap).length,
  })

  const customerName =
    `${body.customer.name} ${body.customer.surname}`.trim() || 'customer'

  const { data: tenantPublic } = await client
    .from('company_public_info')
    .select('company_name, public_email')
    .eq('tenant_id', body.tenant_id)
    .maybeSingle<{ company_name?: string; public_email?: string | null }>()

  const tenantName = tenantPublic?.company_name ?? 'tenant'

  let customerDocuments: {
    frontIdFile: string | null
    backIdFile: string | null
    passportFile: string | null
    patentShoferFile: string | null
  }

  if (storageBucket && typeof storageBucket === 'string') {
    const storageService = new StorageService(client, storageBucket)
    customerDocuments = await storageService.uploadDocuments(
      fileMap,
      body.tenant_id,
      tenantName,
      customerName,
    )
  } else {
    customerDocuments = {
      frontIdFile: null,
      backIdFile: null,
      passportFile: null,
      patentShoferFile: null,
    }
  }

  const bookingService = new BookingService(client)
  const booking = await bookingService.createBooking(body, customerDocuments)

  log.info('Booking created successfully', {
    bookingId: booking.id,
    vehicleId: body.vehicle_id,
    bookingNumber: booking.booking_number,
  })

  if (!brevoApiKey?.trim()) {
    log.warn(
      'BREVO_API_KEY is not set; booking confirmation email will not be sent. Set env BREVO_API_KEY to enable emails.',
    )
  }

  try {
    const { data: vehicle } = await client
      .from('vehicles')
      .select('make, model, daily_rate')
      .eq('id', body.vehicle_id)
      .single<{ make: string; model: string; daily_rate: number }>()

    const pricingService = bookingService.getPricingService()
    const pricingResult = await pricingService.calculateTotalPrice(
      body.tenant_id,
      body.vehicle_id,
      body.startDateTime,
      body.endDateTime,
      body.options,
    )

    const rentalDays = getDaysDifference(
      body.startDateTime,
      body.endDateTime,
    )
    const startDateFormatted = dayjs(body.startDateTime).format(
      'DD MMM YYYY, HH:mm',
    )
    const endDateFormatted = dayjs(body.endDateTime).format(
      'DD MMM YYYY, HH:mm',
    )
    const qrCodeLink = `${baseUrl}/booking/${booking.booking_number}`

    const optionsPrices: Record<string, number | null> = {}
    const optionMapping: Array<{
      selectedKey: keyof typeof body.options
      addOnName: string
      emailKey: string
    }> = [
      { selectedKey: 'secondDriver', addOnName: 'Second Driver', emailKey: 'shoferIDyte' },
      { selectedKey: 'gps', addOnName: 'GPS Navigation', emailKey: 'gps' },
      { selectedKey: 'maksikos', addOnName: 'Maksikos Insurance', emailKey: 'ulesePerFemij' },
      { selectedKey: 'greenCard', addOnName: 'Green Card', emailKey: 'greenCard' },
      { selectedKey: 'europeanCard', addOnName: 'European Card', emailKey: 'europeanCard' },
      { selectedKey: 'roadAssistance', addOnName: 'Road Assistance', emailKey: 'AssistenceRrugore' },
      { selectedKey: 'outOfKosovo', addOnName: 'Out of Kosovo', emailKey: 'DaljejashtëKosovës' },
    ]

    for (const mapping of optionMapping) {
      if (body.options[mapping.selectedKey]) {
        const addOn = pricingResult.addOns.find(
          (a) => a.name === mapping.addOnName,
        )
        optionsPrices[mapping.emailKey] =
          addOn && addOn.totalCost > 0 ? addOn.totalCost : null
      }
    }

    if (!brevoApiKey?.trim()) {
      log.info('Skipping email send (no Brevo API key)')
    } else {
      const emailService = new EmailService(client, brevoApiKey)

      await emailService.sendBookingConfirmationEmail({
      booking_number: booking.booking_number,
      customer_name: customerName,
      customer_email: body.customer.email,
      pickup_point: body.pickupPoint,
      return_point: body.returnPoint,
      start_date: startDateFormatted,
      end_date: endDateFormatted,
      total_price: booking.total_price,
      qr_code_link: qrCodeLink,
      tenant_id: body.tenant_id,
      car_name: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Automjet',
      rentalDays,
      basePrice: pricingResult.dailyRate * rentalDays,
      options: optionsPrices,
      })

      log.info('Booking confirmation email sent', {
        bookingNumber: booking.booking_number,
        customerEmail: body.customer.email,
      })

      if (tenantPublic?.public_email) {
        try {
          const tenantInfo = await emailService.getTenantEmailInfo(body.tenant_id)
          const tenantBookingLink = `${tenantInfo.tenantPage}/qr-redirect?id=${booking.id}&booking_number=${booking.booking_number}`

          await emailService.sendTenantAdminNotificationEmail({
            tenant_email: tenantPublic.public_email,
            booking_number: booking.booking_number,
            customer_name: customerName,
            customer_email: body.customer.email,
            customer_phone: body.customer.phone,
            pickup_point: body.pickupPoint,
            return_point: body.returnPoint,
            start_date: startDateFormatted,
            end_date: endDateFormatted,
            total_price: booking.total_price,
            booking_link: tenantBookingLink,
            primaryColor: tenantInfo.primaryColor,
          })

          log.info('Tenant admin notification email sent', {
            bookingNumber: booking.booking_number,
            tenantEmail: tenantPublic.public_email,
          })
        } catch (adminEmailError) {
          log.error(
            'Failed to send tenant admin notification email',
            adminEmailError as Error,
            {
              bookingId: booking.id,
              bookingNumber: booking.booking_number,
              tenantEmail: tenantPublic.public_email,
            },
          )
        }
      }
    }
  } catch (emailError) {
    log.error(
      'Failed to send booking confirmation email',
      emailError as Error,
      {
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
      },
    )
  }

  return booking
})
