import QRCode from 'qrcode'
import { logger } from '../lib/logger.js'
import {
  getLatestWhatsAppSession,
  getWhatsAppSession,
  saveIncomingMessage,
  upsertWhatsAppSession,
} from './store.js'
import { getWhatsAppProvider } from './providerFactory.js'

let listenersReady = false
let activeOwnerId = null

export function setActiveWhatsAppOwner(ownerId) {
  activeOwnerId = ownerId
}

async function resolveOwnerId() {
  if (activeOwnerId) return activeOwnerId

  const session = await getLatestWhatsAppSession()
  activeOwnerId = session?.owner_id ?? null
  return activeOwnerId
}

async function persistProviderStatus(status) {
  const ownerId = await resolveOwnerId()
  if (!ownerId) return

  await upsertWhatsAppSession({
    ownerId,
    provider: status.provider,
    status: status.status,
    phoneNumber: status.phoneNumber || undefined,
    qrCode: status.status === 'connected' || status.status === 'disconnected' ? null : undefined,
    lastConnectedAt: status.lastConnectedAt || undefined,
    lastDisconnectedAt: status.lastDisconnectedAt || undefined,
  })
}

export function initWhatsAppRuntime() {
  if (listenersReady) return

  const provider = getWhatsAppProvider()

  provider.onMessage(async (message) => {
    try {
      const ownerId = await resolveOwnerId()

      if (!ownerId) {
        logger.warn('Incoming WhatsApp message ignored because no active owner was found.')
        return
      }

      await saveIncomingMessage({ ownerId, message })
    } catch (error) {
      logger.error({ error: error?.message }, 'Failed to persist incoming WhatsApp message.')
    }
  })

  provider.onQrCode(async (qrCode) => {
    try {
      const ownerId = await resolveOwnerId()
      if (!ownerId) return

      const qrCodeDataUrl = await QRCode.toDataURL(qrCode)
      await upsertWhatsAppSession({
        ownerId,
        status: 'qr',
        qrCode: qrCodeDataUrl,
      })
    } catch (error) {
      logger.error({ error: error?.message }, 'Failed to persist WhatsApp QR Code.')
    }
  })

  provider.onStatus(async (status) => {
    try {
      await persistProviderStatus(status)
    } catch (error) {
      logger.error({ error: error?.message }, 'Failed to persist WhatsApp connection status.')
    }
  })

  listenersReady = true
}

export async function bootstrapWhatsAppRuntime() {
  initWhatsAppRuntime()

  const session = await getLatestWhatsAppSession()
  if (!session) return

  activeOwnerId = session.owner_id

  if (session.status === 'disconnected') {
    return
  }

  const provider = getWhatsAppProvider()

  try {
    await upsertWhatsAppSession({
      ownerId: session.owner_id,
      status: 'reconnecting',
      qrCode: null,
    })
    await provider.connect()
  } catch (error) {
    logger.error({ error: error?.message }, 'Failed to bootstrap WhatsApp reconnection.')
  }
}

export async function getOwnerRuntimeStatus(ownerId) {
  setActiveWhatsAppOwner(ownerId)

  const provider = getWhatsAppProvider()
  const providerStatus = provider.getConnectionStatus()
  const session = await getWhatsAppSession({ ownerId, provider: providerStatus.provider })
  const shouldExposeQrCode = !['connected', 'disconnected'].includes(providerStatus.status)

  let qrCode = shouldExposeQrCode ? session?.qr_code ?? null : null

  if (shouldExposeQrCode && !qrCode && providerStatus.qrCode) {
    qrCode = await QRCode.toDataURL(providerStatus.qrCode)
    await upsertWhatsAppSession({
      ownerId,
      status: 'qr',
      qrCode,
    })
  }

  if (!shouldExposeQrCode && session?.qr_code) {
    await upsertWhatsAppSession({
      ownerId,
      provider: providerStatus.provider,
      qrCode: null,
    })
  }

  return {
    provider: providerStatus.provider,
    status: providerStatus.status,
    phoneNumber: providerStatus.phoneNumber ?? session?.phone_number ?? null,
    qrCode,
    hasQrCode: Boolean(qrCode || providerStatus.hasQrCode),
    lastConnectedAt: providerStatus.lastConnectedAt ?? session?.last_connected_at ?? null,
    lastDisconnectedAt: providerStatus.lastDisconnectedAt ?? session?.last_disconnected_at ?? null,
    lastError: providerStatus.lastError ?? null,
    updatedAt: session?.updated_at ?? null,
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

export async function waitForOwnerRuntimeStatus(
  ownerId,
  { timeoutMs = 15000, intervalMs = 500 } = {},
) {
  const startedAt = Date.now()
  let status = await getOwnerRuntimeStatus(ownerId)

  while (
    Date.now() - startedAt < timeoutMs
    && !status.qrCode
    && !['qr', 'connected', 'disconnected', 'error'].includes(status.status)
  ) {
    await sleep(intervalMs)
    status = await getOwnerRuntimeStatus(ownerId)
  }

  return status
}
