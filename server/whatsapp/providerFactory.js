import { env } from '../config/env.js'
import { BaileysWhatsAppProvider } from './BaileysWhatsAppProvider.js'

let provider = null

export function getWhatsAppProvider() {
  if (provider) return provider

  if (env.whatsappProvider !== 'baileys') {
    throw new Error(`Unsupported WhatsApp provider: ${env.whatsappProvider}`)
  }

  provider = new BaileysWhatsAppProvider()
  return provider
}
