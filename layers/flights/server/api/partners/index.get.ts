import { useProviderRegistry } from '../../providers/registry'

export default defineEventHandler(async () => {
  const registry = useProviderRegistry()
  const providers = registry.getAll()

  const partnerLogos = providers.map((provider) => {
    return {
      id: provider.id,
      name: provider.name,
      url: getProviderUrl(provider.id),
      logo: getLogoPath(provider.id)
    }
  })

  return {
    partners: partnerLogos,
    total: partnerLogos.length,
    lastUpdated: new Date().toISOString()
  }
})

function getProviderUrl(providerId: string): string {
  const urls: Record<string, string> = {
    airprishtina: 'https://www.airprishtina.com',
    kosovafly: 'https://www.kosova-fly.de',
    dituria: 'https://www.dituria.net',
    erifly: 'https://www.erifly.eu',
    airtiketa: 'https://www.airtiketa.com',
    prishtinaticket: 'https://www.prishtinaticket.net',
    flyksa: 'https://www.flyksa.com'
  }

  return urls[providerId] || '#'
}

function getLogoPath(providerId: string): string {
  const logoPaths: Record<string, string> = {
    airprishtina: '/img/airprishtina-logo.svg',
    kosovafly: '/img/kosovaFly-logo.png',
    dituria: '/img/dituria-logo.jpg',
    erifly: '/img/erifly-logo.png',
    airtiketa: '/img/airtiketa-logo.png',
    prishtinaticket: '/img/prishtinaticket-logo.png',
    flyksa: '/img/flyksa-logo.svg'
  }

  return logoPaths[providerId] || `/img/${providerId}-logo.png`
}
