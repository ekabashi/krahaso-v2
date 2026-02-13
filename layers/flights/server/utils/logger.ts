import type { H3Event } from 'h3'

export function getFlightsLogger(_event: H3Event) {
  return {
    info(msg: string, meta?: Record<string, unknown>) {
      console.info(msg, meta ?? '')
    },
    warn(msg: string, meta?: Record<string, unknown>) {
      console.warn(msg, meta ?? '')
    },
    error(msg: string, err?: Error, meta?: Record<string, unknown>) {
      console.error(msg, err, meta ?? '')
    },
  }
}
