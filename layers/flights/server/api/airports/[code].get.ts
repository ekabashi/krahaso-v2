import { getAirportByCode } from '../../database/queries'

/**
 * GET /api/airports/:code
 * Get a specific airport by IATA code
 */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')

  if (!code) {
    throw createError({
      statusCode: 400,
      message: 'Airport code is required'
    })
  }

  const airport = await getAirportByCode(code.toUpperCase())

  if (!airport) {
    throw createError({
      statusCode: 404,
      message: `Airport with code ${code} not found`
    })
  }

  return airport
})
