import { z } from 'zod'
import {
  dateSchema,
  timeSchema,
  paginationSchema,
  optionalCommaSeparatedToArray,
  optionalCommaSeparatedToNumberArray,
} from '../common'

const sortBySchema = z.enum([
  'price-asc',
  'price-desc',
  'year-desc',
  'name-asc',
])

const dateTimeSearchSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  location: z.string().optional(),
  dropoffLocation: z.string().optional(),
})

const filterSchema = z.object({
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  transmission: optionalCommaSeparatedToArray,
  fuel: optionalCommaSeparatedToArray,
  seats: optionalCommaSeparatedToNumberArray,
  category: optionalCommaSeparatedToArray,
  color: optionalCommaSeparatedToArray,
  sortBy: sortBySchema.optional(),
})

const vehicleIdSchema = z.object({
  vehicle_id: z.coerce.number().int().positive(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
})

const fullSearchSchema = dateTimeSearchSchema
  .extend(filterSchema.shape)
  .extend(paginationSchema.shape)

export const carSearchQuerySchema = z.union([
  vehicleIdSchema,
  fullSearchSchema,
])

export type CarSearchQuery = z.infer<typeof carSearchQuerySchema>
export type CarSearchByVehicleId = z.infer<typeof vehicleIdSchema>
export type CarSearchByDateTime = z.infer<typeof fullSearchSchema>

export function isVehicleIdSearch(
  query: CarSearchQuery,
): query is CarSearchByVehicleId {
  return 'vehicle_id' in query && typeof (query as CarSearchByVehicleId).vehicle_id === 'number'
}
