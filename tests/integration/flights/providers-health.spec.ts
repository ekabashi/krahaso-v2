import { describe, it, expect } from 'vitest'
import { baseURL, requestJson } from '../../helpers/http'

type ProviderItem = { id: string; name?: string; health?: unknown }
type ProvidersResponse = { providers?: ProviderItem[]; total?: number }

describe('Flights Providers Health Integration', () => {
  it('GET /api/providers returns 200 and array', async () => {
    const { status, data } = await requestJson<ProvidersResponse>('GET', '/api/providers')
    expect(status).toBe(200)
    expect(data).toBeDefined()
    const providers = (data as ProvidersResponse).providers
    expect(Array.isArray(providers)).toBe(true)
  })

  it('GET /api/providers/:id/health returns 200 for existing id or 404', async () => {
    const { status: listStatus, data: listData } = await requestJson<ProvidersResponse>(
      'GET',
      '/api/providers',
    )
    expect(listStatus).toBe(200)
    const providers = (listData as ProvidersResponse).providers ?? []
    const firstId = providers[0]?.id

    if (firstId) {
      const { status } = await requestJson('GET', `/api/providers/${encodeURIComponent(firstId)}/health`)
      expect([200, 404]).toContain(status)
    } else {
      const { status } = await requestJson('GET', `${baseURL}/api/providers/nonexistent-id-12345/health`)
      expect(status).toBe(404)
    }
  })
})
