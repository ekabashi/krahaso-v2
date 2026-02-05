import type { H3Event } from 'h3'

export function getLogger(_event: H3Event) {
  return {
    info(_msg: string, _meta?: Record<string, unknown>) {
      // console.info(msg, meta)
    },
    error(_msg: string, _err?: Error, _meta?: Record<string, unknown>) {
      // console.error(msg, err, meta)
    },
  }
}
