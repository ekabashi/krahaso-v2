interface MetaCapiServiceConfig {
  pixelId: string
  accessToken: string
  testEventCode?: string
}

interface MetaLeadEventInput {
  eventId: string
  eventSourceUrl?: string
  clientIpAddress?: string
  clientUserAgent?: string
  fbp?: string
  fbc?: string
}

interface MetaCapiUserData {
  client_ip_address?: string
  client_user_agent?: string
  fbp?: string
  fbc?: string
}

interface MetaCapiEventData {
  event_name: 'Lead'
  event_time: number
  event_id: string
  action_source: 'website'
  event_source_url?: string
  user_data: MetaCapiUserData
}

interface MetaCapiRequest {
  data: MetaCapiEventData[]
  test_event_code?: string
}

export class MetaCapiService {
  constructor(private config: MetaCapiServiceConfig) {}

  async sendLeadEvent(input: MetaLeadEventInput): Promise<void> {
    if (!this.config.pixelId || !this.config.accessToken) {
      throw new Error('Meta CAPI configuration is missing')
    }

    const endpoint = `https://graph.facebook.com/v18.0/${this.config.pixelId}/events`
    const userData: MetaCapiUserData = {}

    if (input.clientIpAddress) {
      userData.client_ip_address = input.clientIpAddress
    }
    if (input.clientUserAgent) {
      userData.client_user_agent = input.clientUserAgent
    }
    if (input.fbp) {
      userData.fbp = input.fbp
    }
    if (input.fbc) {
      userData.fbc = input.fbc
    }

    const eventData: MetaCapiEventData = {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: 'website',
      user_data: userData,
    }

    if (input.eventSourceUrl) {
      eventData.event_source_url = input.eventSourceUrl
    }

    const requestBody: MetaCapiRequest = {
      data: [eventData],
    }

    if (this.config.testEventCode) {
      requestBody.test_event_code = this.config.testEventCode
    }

    await $fetch(endpoint, {
      method: 'POST',
      query: {
        access_token: this.config.accessToken,
      },
      body: requestBody,
    })
  }
}
