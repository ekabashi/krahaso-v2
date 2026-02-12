import { describe, it, expect, vi } from 'vitest'

const mockUseRuntimeConfig = vi.fn(() => ({
  public: { siteUrl: 'https://krahaso.co' },
}))
const mockRoute = { name: 'index', params: {}, fullPath: '/sq' }
const mockLocalePath = vi.fn((_opts: { name?: string }, locale: string) => `/${locale}`)
const mockUseHead = vi.fn()

vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => mockUseRuntimeConfig(),
  useRoute: () => mockRoute,
  useLocalePath: () => mockLocalePath,
  useHead: (fn: () => unknown) => mockUseHead(fn),
}))

describe('useSeoPage', () => {
  it('calls useHead with alternates and canonicalHref (canonical not starting with http)', async () => {
    const { useSeoPage } = await import('../../../layers/shared/app/composables/useSeoPage')
    useSeoPage({
      title: 'Test',
      description: 'Desc',
      canonical: '/sq/page',
    })
    expect(mockUseHead).toHaveBeenCalled()
    const headFn = mockUseHead.mock.calls[0][0]
    const result = headFn()
    expect(result.link).toBeDefined()
    const canonical = result.link?.find((l: { rel: string }) => l.rel === 'canonical')
    expect(canonical?.href).toBe('https://krahaso.co/sq/page')
    const alternates = result.link?.filter((l: { rel: string }) => l.rel === 'alternate')
    expect(alternates?.length).toBeGreaterThan(0)
  })

  it('keeps canonical as-is when it starts with http', async () => {
    const { useSeoPage } = await import('../../../layers/shared/app/composables/useSeoPage')
    mockUseHead.mockClear()
    useSeoPage({
      title: 'T',
      description: 'D',
      canonical: 'https://other.com/page',
    })
    const headFn = mockUseHead.mock.calls[0][0]
    const result = headFn()
    const canonical = result.link?.find((l: { rel: string }) => l.rel === 'canonical')
    expect(canonical?.href).toBe('https://other.com/page')
  })
})
