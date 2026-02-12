export function useLocalePath() {
  return (_opts: { name?: string }, locale: string) => `/${locale}`
}
