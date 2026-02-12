import { test, expect } from '@playwright/test'
import { baseURL, requestJson } from '../../helpers/http'

test.describe('Flights providers health smoke', () => {
  test('GET /api/providers returns 200 and array', async () => {
    const { status, data } = await requestJson<{ providers?: unknown[] }>('GET', '/api/providers')
    expect(status).toBe(200)
    expect(Array.isArray((data as { providers?: unknown[] }).providers)).toBe(true)
  })

  test('GET /api/providers/:id/health returns 200 or 404', async () => {
    const { data: list } = await requestJson<{ providers?: { id: string }[] }>('GET', '/api/providers')
    const providers = (list as { providers?: { id: string }[] }).providers ?? []
    const id = providers[0]?.id ?? 'nonexistent-id-123'
    const url = id.startsWith('nonexistent') ? `${baseURL}/api/providers/${id}/health` : `/api/providers/${id}/health`
    const { status } = await requestJson('GET', url)
    expect([200, 404]).toContain(status)
  })
})
