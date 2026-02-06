import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import { CarService } from '../../services/car.service'
import { getLogger } from '../../utils/logger'
import { validateQuery } from '../../utils/validate'
import {
  carSearchQuerySchema,
  isVehicleIdSearch,
} from '../../schemas/cars/search.schema'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

export default defineEventHandler(async (event: H3Event) => {
  const log = getLogger(event)
  const client = await serverSupabaseClient(event)
  const rawQuery = getQuery(event)

  const query = validateQuery(carSearchQuerySchema, rawQuery)

  if (isVehicleIdSearch(query)) {
    const carService = new CarService(client)

    let vehicleOptions:
      | { startDateTime?: string; endDateTime?: string }
      | undefined

    if (query.startDate && query.endDate && query.startTime && query.endTime) {
      const searchStart = dayjs
        .utc(`${query.startDate}T${query.startTime}`)
        .toISOString()
      const searchEnd = dayjs
        .utc(`${query.endDate}T${query.endTime}`)
        .toISOString()
      vehicleOptions = { startDateTime: searchStart, endDateTime: searchEnd }
    }

    const vehicle = await carService.getVehicleById(
      query.vehicle_id,
      vehicleOptions,
    )

    if (!vehicle) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Vehicle not found',
        data: { vehicle_id: query.vehicle_id },
      })
    }

    return {
      cars: [vehicle],
      total: 1,
      page: 1,
      limit: 1,
    }
  }

  const {
    startDate,
    endDate,
    startTime,
    endTime,
    location: pickupLocation,
    dropoffLocation: returnLocation,
    page,
    limit,
    minPrice,
    maxPrice,
    transmission,
    fuel,
    seats,
    category,
    color,
    sortBy,
  } = query

  log.info('Searching available cars', {
    startDate,
    endDate,
    startTime,
    endTime,
    pickupLocation,
    returnLocation,
    page,
    limit,
  })

  try {
    const searchStart = dayjs.utc(`${startDate}T${startTime}`).toISOString()
    const searchEnd = dayjs.utc(`${endDate}T${endTime}`).toISOString()

    const carService = new CarService(client)
    const result = await carService.searchAvailableCars({
      startDateTime: searchStart,
      endDateTime: searchEnd,
      pickupLocation,
      returnLocation,
      page,
      limit,
      minPrice,
      maxPrice,
      transmission,
      fuel,
      seats,
      category,
      color,
      sortBy,
    })

    log.info('Car search completed successfully', {
      count: result.cars.length,
    })

    return result
  } catch (error) {
    log.error('Failed to search cars', error as Error, {
      startDate,
      endDate,
      startTime,
      endTime,
      pickupLocation,
      returnLocation,
    })
    throw error
  }
})
