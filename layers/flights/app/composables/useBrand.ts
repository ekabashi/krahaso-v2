export const useBrand = () =>
  useState<'aviopika' | 'krahaso' | null>('brand', () => null)
