import { z } from 'zod'

export const bookingByNumberParamsSchema = z.object({
  bookingNumber: z.string().min(1, 'Booking number is required').trim(),
})

export type BookingByNumberParams = z.infer<typeof bookingByNumberParamsSchema>
