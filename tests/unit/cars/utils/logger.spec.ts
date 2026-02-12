import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLogger } from '../../../../layers/cars/server/utils/logger'

describe('cars/server/utils/logger', () => {
  const mockEvent = {} as import('h3').H3Event

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns object with info, warn, error methods', () => {
    const logger = getLogger(mockEvent)
    expect(logger).toHaveProperty('info', expect.any(Function))
    expect(logger).toHaveProperty('warn', expect.any(Function))
    expect(logger).toHaveProperty('error', expect.any(Function))
  })

  it('info calls console.info with message and meta', () => {
    const logger = getLogger(mockEvent)
    logger.info('test message', { key: 'value' })
    expect(console.info).toHaveBeenCalledWith('test message', { key: 'value' })
  })

  it('warn calls console.warn with message and meta', () => {
    const logger = getLogger(mockEvent)
    logger.warn('warn message', { code: 1 })
    expect(console.warn).toHaveBeenCalledWith('warn message', { code: 1 })
  })

  it('error calls console.error with message, err and meta', () => {
    const logger = getLogger(mockEvent)
    const err = new Error('fail')
    logger.error('error message', err, { stack: 'x' })
    expect(console.error).toHaveBeenCalledWith('error message', err, { stack: 'x' })
  })
})
