import { CookieJar } from 'tough-cookie'

/**
 * HTTP Client with Cookie/Session support for scraping APIs
 */
export class HttpClient {
  private cookieJar: CookieJar
  private baseUrl: string
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  private requestTimeoutMs = Number(process.env.PROVIDER_HTTP_TIMEOUT_MS || '15000')
  private maxRetries = Number(process.env.PROVIDER_HTTP_MAX_RETRIES || '2')
  private retryBaseDelayMs = Number(process.env.PROVIDER_HTTP_RETRY_DELAY_MS || '750')

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.cookieJar = new CookieJar()
  }

  /**
   * Initialize session by visiting the main page
   */
  async initSession(initUrl?: string): Promise<void> {
    const url = initUrl || this.baseUrl
    console.log(`[HttpClient] Initializing session at ${url}`)

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
        }
      })

      // Extract and store cookies from response
      const setCookieHeaders = response.headers.getSetCookie?.() || []
      for (const cookieStr of setCookieHeaders) {
        try {
          await this.cookieJar.setCookie(cookieStr, url)
        } catch {
          // Ignore invalid cookies
        }
      }

      console.log(`[HttpClient] Session initialized, cookies: ${this.getCookieCount()}`)
    } catch (error) {
      console.error(`[HttpClient] Session init failed:`, error)
      throw error
    }
  }

  /**
   * Make a GET request with cookies
   */
  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl)
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const cookies = await this.cookieJar.getCookieString(url.toString())

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Cookie': cookies,
        'Referer': this.baseUrl
      }
    })

    // Update cookies from response
    await this.updateCookies(response, url.toString())

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Make a POST request with cookies
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl)
    const cookies = await this.cookieJar.getCookieString(url.toString())

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'Referer': this.baseUrl,
        'Origin': new URL(this.baseUrl).origin
      },
      body: JSON.stringify(body)
    })

    // Update cookies from response
    await this.updateCookies(response, url.toString())

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Make a request and return the raw response (cookies preserved).
   */
  async requestRaw(path: string, init: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : new URL(path, this.baseUrl).toString()
    const cookies = await this.cookieJar.getCookieString(url)
    const headers = new Headers(init.headers || {})

    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', this.userAgent)
    }
    if (!headers.has('Accept-Language')) {
      headers.set('Accept-Language', 'de-DE,de;q=0.9,en;q=0.8')
    }
    if (!headers.has('Cookie')) {
      headers.set('Cookie', cookies)
    }
    if (!headers.has('Referer')) {
      headers.set('Referer', this.baseUrl)
    }

    const response = await this.fetchWithRetry(url, { ...init, headers })
    await this.updateCookies(response, url)
    return response
  }

  /**
   * Update cookie jar from response headers
   */
  private async updateCookies(response: Response, url: string): Promise<void> {
    const setCookieHeaders = response.headers.getSetCookie?.() || []
    for (const cookieStr of setCookieHeaders) {
      try {
        await this.cookieJar.setCookie(cookieStr, url)
      } catch {
        // Ignore invalid cookies
      }
    }
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let attempt = 0
    while (true) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs)

      try {
        const response = await fetch(url, { ...init, signal: controller.signal })
        if (this.isRetryableStatus(response.status) && attempt < this.maxRetries) {
          const delay = this.retryBaseDelayMs * Math.pow(2, attempt)
          attempt++
          await this.delay(delay)
          continue
        }
        return response
      } catch (error) {
        if (attempt >= this.maxRetries || !this.isRetryableError(error)) {
          throw error
        }
        const delay = this.retryBaseDelayMs * Math.pow(2, attempt)
        attempt++
        await this.delay(delay)
      } finally {
        clearTimeout(timeoutId)
      }
    }
  }

  private isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|network|fetch failed|aborted/i.test(message)
  }

  private isRetryableStatus(status: number): boolean {
    return status >= 500 && status < 600
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current cookie count
   */
  getCookieCount(): number {
    const cookies = this.cookieJar.getCookiesSync(this.baseUrl)
    return cookies.length
  }

  /**
   * Clear all cookies
   */
  clearCookies(): void {
    this.cookieJar = new CookieJar()
  }

  /**
   * Check if session is active (has cookies)
   */
  hasSession(): boolean {
    return this.getCookieCount() > 0
  }
}

// =============================================================================
// Singleton clients for each provider
// =============================================================================

const clients = new Map<string, HttpClient>()

/**
 * Get or create HTTP client for a provider
 */
export function getHttpClient(providerId: string, baseUrl: string): HttpClient {
  if (!clients.has(providerId)) {
    clients.set(providerId, new HttpClient(baseUrl))
  }
  return clients.get(providerId)!
}

/**
 * Reset HTTP client for a provider (clear session)
 */
export function resetHttpClient(providerId: string): void {
  clients.delete(providerId)
}
