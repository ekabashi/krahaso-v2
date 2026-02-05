export interface Partner {
  id: string
  name: string
  url: string
  logo: string
}

interface PartnersResponse {
  partners: Partner[]
  total: number
  lastUpdated: string
}

/**
 * Fetch partner logos via server proxy
 */
export function usePartners() {
  const { data, error, pending, refresh } = useFetch<PartnersResponse>(
    '/api/partners',
    {
      key: 'partners',
      dedupe: 'defer'
    }
  )

  const partners = computed(() => data.value?.partners ?? [])

  return {
    partners,
    partnersData: data,
    isLoading: pending,
    error,
    refresh
  }
}
