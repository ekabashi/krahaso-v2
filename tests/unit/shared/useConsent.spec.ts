import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieRef = { value: null as { analytics: boolean; marketing: boolean; timestamp: number } | null }
const stateRef = { value: null as typeof cookieRef.value }

vi.mock('nuxt/app', () => ({
  useCookie: () => cookieRef,
  useState: (_key: string, init?: () => unknown) => {
    if (stateRef.value === undefined && init) stateRef.value = init() as typeof stateRef.value
    return stateRef
  },
}))

describe('useConsent', () => {
  beforeEach(() => {
    cookieRef.value = null
    stateRef.value = null
  })

  it('setConsent updates state and cookie', async () => {
    const { useConsent } = await import('../../../layers/shared/app/composables/useConsent')
    const { setConsent } = useConsent()
    setConsent(true, false)
    expect(cookieRef.value).toEqual(expect.objectContaining({ analytics: true, marketing: false }))
    expect(stateRef.value).toEqual(expect.objectContaining({ analytics: true, marketing: false }))
  })

  it('acceptAll sets both to true', async () => {
    const { useConsent } = await import('../../../layers/shared/app/composables/useConsent')
    const { acceptAll } = useConsent()
    acceptAll()
    expect(cookieRef.value?.analytics).toBe(true)
    expect(cookieRef.value?.marketing).toBe(true)
  })

  it('rejectAll sets both to false', async () => {
    const { useConsent } = await import('../../../layers/shared/app/composables/useConsent')
    const { rejectAll } = useConsent()
    rejectAll()
    expect(cookieRef.value?.analytics).toBe(false)
    expect(cookieRef.value?.marketing).toBe(false)
  })

  it('clearConsent nulls state and cookie', async () => {
    const { useConsent } = await import('../../../layers/shared/app/composables/useConsent')
    const { setConsent, clearConsent } = useConsent()
    setConsent(true, true)
    clearConsent()
    expect(cookieRef.value).toBeNull()
    expect(stateRef.value).toBeNull()
  })

  it('clearConsent does not throw when gtag is on globalThis', async () => {
    const gtag = vi.fn()
    ;(globalThis as unknown as { gtag?: typeof gtag }).gtag = gtag
    const { useConsent } = await import('../../../layers/shared/app/composables/useConsent')
    const { clearConsent } = useConsent()
    clearConsent()
    // In Node import.meta.client is false so gtag is not called; in browser it would be
    delete (globalThis as unknown as { gtag?: unknown }).gtag
  })
})