export function toSafeSegment(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim()
}

export function normalizeBucketName(value: string | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '')
  if (withoutProtocol.includes('/')) {
    const segments = withoutProtocol.split('/').filter(Boolean)
    const last = segments.at(-1)
    return last ?? ''
  }
  return trimmed
}
