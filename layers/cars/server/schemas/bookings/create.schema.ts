import { z } from 'zod'
import {
  tenantIdSchema,
  emailSchema,
  phoneSchema,
  addressSchema,
} from '../common'

const bookingOptionsSchema = z.object({
  secondDriver: z.boolean().default(false),
  gps: z.boolean().default(false),
  maksikos: z.boolean().default(false),
  greenCard: z.boolean().default(false),
  europeanCard: z.boolean().default(false),
  roadAssistance: z.boolean().default(false),
  outOfKosovo: z.boolean().default(false),
})

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  surname: z.string().min(1, 'Surname is required').trim(),
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  PersonalNr: z.string().optional(),
  licenseClasses: z.array(z.string()).optional(),
  frontIdFile: z.union([z.string(), z.null()]).optional(),
  backIdFile: z.union([z.string(), z.null()]).optional(),
  passportFile: z.union([z.string(), z.null()]).optional(),
  patentShoferFile: z.union([z.string(), z.null()]).optional(),
})

export const createBookingSchema = z.object({
  vehicle_id: z.number().int().positive('Vehicle ID is required'),
  tenant_id: tenantIdSchema,
  pickupPoint: z.string().min(1, 'Pickup point is required'),
  returnPoint: z.string().min(1, 'Return point is required'),
  startDateTime: z.string().min(1, 'Start date/time is required'),
  endDateTime: z.string().min(1, 'End date/time is required'),
  options: bookingOptionsSchema,
  customer: customerSchema,
  description: z.string().optional(),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
