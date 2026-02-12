import { test, expect } from '@playwright/test'
import { baseURL } from '../../helpers/http'

test.describe('Go redirect smoke', () => {
  test('GET /api/go/:provider?t=web returns 302', async () => {
    const res = await fetch(`${baseURL}/api/go/airprishtina?t=web`, { redirect: 'manual' })
    expect(res.status).toBe(302)
    const loc = res.headers.get('location')
    expect(loc).toBeTruthy()
    expect(loc).toMatch(/^https:\/\//)
  })

  test('GET /api/go/:provider?t=phone returns 302 to tel:', async () => {
    const res = await fetch(`${baseURL}/api/go/airprishtina?t=phone`, { redirect: 'manual' })
    expect(res.status).toBe(302)
    const loc = res.headers.get('location')
    expect(loc).toMatch(/^tel:/)
  })
})
