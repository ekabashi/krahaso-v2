declare module 'qrcode-terminal' {
  interface QRCodeOptions {
    small?: boolean
  }

  function generate(text: string, options?: QRCodeOptions, callback?: (qr: string) => void): void
  function generate(text: string, callback?: (qr: string) => void): void

  export { generate }
  export default { generate }
}

declare module 'whatsapp-web.js' {
  export interface Message {
    from: string
    body: string
    reply(content: string): Promise<Message>
  }

  export interface ClientOptions {
    authStrategy?: any
    puppeteer?: {
      headless?: boolean
      args?: string[]
    }
  }

  export class Client {
    constructor(options?: ClientOptions)
    on(event: 'qr', callback: (qr: string) => void): void
    on(event: 'ready', callback: () => void): void
    on(event: 'authenticated', callback: () => void): void
    on(event: 'auth_failure', callback: (msg: string) => void): void
    on(event: 'disconnected', callback: (reason: string) => void): void
    on(event: 'message', callback: (msg: Message) => void): void
    initialize(): Promise<void>
    destroy(): Promise<void>
  }

  export class LocalAuth {
    constructor(options?: { dataPath?: string })
  }

  const pkg: {
    Client: typeof Client
    LocalAuth: typeof LocalAuth
    Message: Message
  }

  export default pkg
}
