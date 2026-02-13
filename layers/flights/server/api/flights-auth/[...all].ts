/**
 * Better Auth API handler for Flights
 */

import { auth } from '../../utils/auth'

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
