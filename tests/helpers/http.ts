const rawBase = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const baseURL = rawBase.replace(/\/$/, '')

// Safety: refuse to run against production
if (typeof baseURL === 'string' && baseURL.includes('krahaso.co')) {
  const lower = baseURL.toLowerCase()
  if (!lower.includes('staging') && !lower.includes('localhost')) {
    throw new Error('Refusing to run tests against production URL')
  }
}

export { baseURL }

export type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

/**
 * JSON request helper. Uses baseURL from TEST_BASE_URL (default http://localhost:3000).
 */
export async function requestJson<T = unknown>(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; data: T }> {
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`
  const h: Record<string, string> = {
    ...headers,
    ...(body !== undefined && body !== null ? { 'Content-Type': 'application/json' } : {}),
  }
  const res = await fetch(fullUrl, {
    method,
    headers: Object.keys(h).length ? h : undefined,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data: T
  try {
    data = text ? (JSON.parse(text) as T) : (undefined as T)
  } catch {
    data = text as unknown as T
  }
  return { status: res.status, data }
}

/**
 * Multipart form data request (e.g. for booking create with payload + files).
 */
export async function requestMultipart<T = unknown>(
  url: string,
  formData: FormData,
  headers?: Record<string, string>,
): Promise<{ status: number; data: T }> {
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: headers ?? {},
    body: formData,
  })
  const text = await res.text()
  let data: T
  try {
    data = text ? (JSON.parse(text) as T) : (undefined as T)
  } catch {
    data = text as unknown as T
  }
  return { status: res.status, data }
}
