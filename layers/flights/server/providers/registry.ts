import type { IFlightProvider } from '../types/provider'
import { AirPrishtinaProvider } from './airprishtina.provider'
import { KosovaFlyProvider } from './kosovafly.provider'
import { DituriaProvider } from './dituria.provider'
import { EriflyProvider } from './erifly.provider'
import { AirTiketaProvider } from './airtiketa.provider'
import { PrishtinaTicketProvider } from './prishtinaticket.provider'
import { FlyKsaProvider } from './flyksa.provider'

export class ProviderRegistry {
  private providers = new Map<string, IFlightProvider>()
  private initialized = false

  register(provider: IFlightProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`[ProviderRegistry] Provider ${provider.id} already registered, skipping`)
      return
    }

    this.providers.set(provider.id, provider)
    console.log(`[ProviderRegistry] Registered provider: ${provider.name} (${provider.id})`)
  }

  get(id: string): IFlightProvider | undefined {
    return this.providers.get(id)
  }

  getAll(): IFlightProvider[] {
    return Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority)
  }

  getEnabled(): IFlightProvider[] {
    return this.getAll()
  }

  getIds(): string[] {
    return Array.from(this.providers.keys())
  }

  has(id: string): boolean {
    return this.providers.has(id)
  }

  get count(): number {
    return this.providers.size
  }

  private initializeDefaults(): void {
    if (this.initialized) return

    this.register(new AirPrishtinaProvider())
    this.register(new KosovaFlyProvider())
    this.register(new DituriaProvider())
    this.register(new EriflyProvider())
    this.register(new AirTiketaProvider())
    this.register(new PrishtinaTicketProvider())
    this.register(new FlyKsaProvider())
    this.initialized = true
  }
}

let registryInstance: ProviderRegistry | null = null

export function useProviderRegistry(): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry()
    registryInstance.initializeDefaults()
  }
  return registryInstance
}

export function getProvider(id: string): IFlightProvider | undefined {
  return useProviderRegistry().get(id)
}

export function getAllProviders(): IFlightProvider[] {
  return useProviderRegistry().getEnabled()
}
