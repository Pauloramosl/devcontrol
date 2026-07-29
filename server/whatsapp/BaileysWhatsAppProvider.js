import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { phoneFromJid, toBaileysJid, normalizePhoneNumber } from '../utils/phone.js'
import { WhatsAppProvider } from './WhatsAppProvider.js'

function timestampToIso(value) {
  const raw = typeof value === 'number' ? value : Number(value?.low ?? value ?? Date.now())
  const milliseconds = raw > 1000000000000 ? raw : raw * 1000
  return new Date(milliseconds).toISOString()
}

function unwrapMessage(message) {
  return message?.ephemeralMessage?.message
    ?? message?.viewOnceMessage?.message
    ?? message?.viewOnceMessageV2?.message
    ?? message?.documentWithCaptionMessage?.message
    ?? message
}

function extractTextMessage(message) {
  const payload = unwrapMessage(message)

  return payload?.conversation
    ?? payload?.extendedTextMessage?.text
    ?? payload?.imageMessage?.caption
    ?? payload?.videoMessage?.caption
    ?? payload?.documentMessage?.caption
    ?? payload?.buttonsResponseMessage?.selectedDisplayText
    ?? payload?.templateButtonReplyMessage?.selectedDisplayText
    ?? payload?.listResponseMessage?.title
    ?? payload?.listResponseMessage?.singleSelectReply?.selectedRowId
    ?? payload?.reactionMessage?.text
    ?? ''
}

function withTimeout(promise, milliseconds, message) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error(message)), milliseconds)
    }),
  ])
}

function isLidJid(value) {
  return String(value ?? '').trim().endsWith('@lid')
}

export class BaileysWhatsAppProvider extends WhatsAppProvider {
  constructor() {
    super()
    this.events = new EventEmitter()
    this.socket = null
    this.status = 'disconnected'
    this.qrCode = null
    this.phoneNumber = null
    this.lastConnectedAt = null
    this.lastDisconnectedAt = null
    this.lastError = null
    this.startPromise = null
    this.manualDisconnect = false
    this.reconnectTimer = null
    this.authDir = path.resolve(env.baileysAuthDir)
    this.logger = pino({ level: env.baileysLogLevel }).child({ provider: 'baileys' })
  }

  async connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.status === 'connected' && this.socket) {
      return this.getConnectionStatus()
    }

    if (this.startPromise) {
      return this.startPromise
    }

    this.manualDisconnect = false
    this.lastError = null
    this.status = this.status === 'reconnecting' ? 'reconnecting' : 'connecting'
    this.emitStatus()

    this.startPromise = this.startSocket().finally(() => {
      this.startPromise = null
    })

    return this.startPromise
  }

  async startSocket() {
    await fs.mkdir(this.authDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir)
    let version

    try {
      const versionInfo = await fetchLatestBaileysVersion()
      version = versionInfo.version
    } catch (error) {
      logger.warn({ error: error?.message }, 'Could not fetch latest Baileys version; using bundled default.')
    }

    const socketOptions = {
      auth: state,
      logger: this.logger,
      printQRInTerminal: false,
      syncFullHistory: false,
      browser: ['DevControl', 'Chrome', '1.0.0'],
    }

    if (version) {
      socketOptions.version = version
    }

    this.socket = makeWASocket(socketOptions)
    this.socket.ev.on('creds.update', saveCreds)
    this.socket.ev.on('connection.update', (update) => this.handleConnectionUpdate(update))
    this.socket.ev.on('messages.upsert', (payload) => this.handleMessagesUpsert(payload))

    return this.getConnectionStatus()
  }

  async disconnect({ clearSession = true } = {}) {
    this.manualDisconnect = true
    this.lastError = null

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.status = 'disconnecting'
    this.emitStatus()

    try {
      if (this.socket) {
        await withTimeout(
          this.socket.logout(),
          5000,
          'Baileys logout timed out.',
        )
      }
    } catch (error) {
      logger.warn({ error: error?.message }, 'Baileys logout failed; forcing local disconnect state.')
    } finally {
      this.closeSocket()

      if (clearSession) {
        await fs.rm(this.authDir, { recursive: true, force: true })
        await fs.mkdir(this.authDir, { recursive: true })
      }

      this.socket = null
      this.qrCode = null
      this.phoneNumber = null
      this.status = 'disconnected'
      this.lastDisconnectedAt = new Date().toISOString()
      this.emitStatus()
    }

    return this.getConnectionStatus()
  }

  getConnectionStatus() {
    return {
      provider: 'baileys',
      status: this.status,
      phoneNumber: this.phoneNumber,
      hasQrCode: Boolean(this.qrCode),
      qrCode: this.qrCode,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastError: this.lastError,
    }
  }

  async sendMessage(to, message) {
    const rawTo = String(to ?? '').trim()
    const targetJid = rawTo.includes('@') ? rawTo : toBaileysJid(normalizePhoneNumber(rawTo))
    const text = String(message ?? '').trim()

    if (!this.socket || this.status !== 'connected') {
      throw new Error('WhatsApp is not connected.')
    }

    const sendText = async (jid) => this.socket.sendMessage(jid, { text })
    let result
    let sentTo = targetJid

    try {
      result = await sendText(targetJid)
    } catch (error) {
      const fallbackJid = isLidJid(targetJid)
        ? await this.resolvePhoneJidForLid(targetJid)
        : null

      if (!fallbackJid || fallbackJid === targetJid) {
        throw error
      }

      logger.warn(
        { error: error?.message, targetType: 'lid' },
        'Baileys send failed for LID target; retrying with mapped phone JID.',
      )

      result = await sendText(fallbackJid)
      sentTo = fallbackJid
    }

    return {
      id: result?.key?.id ?? null,
      to: sentTo,
    }
  }

  onMessage(callback) {
    this.events.on('message', callback)
    return () => this.events.off('message', callback)
  }

  onQrCode(callback) {
    this.events.on('qr', callback)
    return () => this.events.off('qr', callback)
  }

  onStatus(callback) {
    this.events.on('status', callback)
    return () => this.events.off('status', callback)
  }

  emitStatus() {
    this.events.emit('status', this.getConnectionStatus())
  }

  closeSocket() {
    try {
      this.socket?.ev?.removeAllListeners?.('connection.update')
      this.socket?.ev?.removeAllListeners?.('messages.upsert')
      this.socket?.ev?.removeAllListeners?.('creds.update')
      this.socket?.ws?.close?.()
    } catch (error) {
      logger.warn({ error: error?.message }, 'Failed to close Baileys socket cleanly.')
    }
  }

  async resolvePhoneJidForLid(lidJid) {
    try {
      const phoneJid = await this.socket?.signalRepository?.lidMapping?.getPNForLID?.(lidJid)
      return phoneJid ? toBaileysJid(phoneFromJid(phoneJid)) : null
    } catch (error) {
      logger.warn({ error: error?.message }, 'Failed to resolve phone JID for LID target.')
      return null
    }
  }

  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update
    const statusCode = lastDisconnect?.error?.output?.statusCode

    if (connection || qr || statusCode) {
      logger.info({ connection, statusCode, hasQr: Boolean(qr) }, 'Baileys connection update.')
    }

    if (qr) {
      this.qrCode = qr
      this.status = 'qr'
      this.events.emit('qr', qr)
      this.emitStatus()
    }

    if (connection === 'open') {
      this.status = 'connected'
      this.qrCode = null
      this.lastError = null
      this.phoneNumber = phoneFromJid(this.socket?.user?.id)
      this.lastConnectedAt = new Date().toISOString()
      this.emitStatus()
      return
    }

    if (connection === 'close') {
      const shouldReconnect = !this.manualDisconnect
        && ![
          DisconnectReason.loggedOut,
          DisconnectReason.connectionReplaced,
          DisconnectReason.multideviceMismatch,
          DisconnectReason.forbidden,
          DisconnectReason.badSession,
        ].includes(statusCode)

      if (statusCode === DisconnectReason.connectionReplaced) {
        this.lastError = 'A sessao foi substituida por outra conexao do WhatsApp Web.'
      } else if (statusCode === DisconnectReason.loggedOut) {
        this.lastError = 'Sessao encerrada no WhatsApp.'
      } else if (statusCode && !shouldReconnect) {
        this.lastError = `Conexao encerrada pelo WhatsApp (${statusCode}).`
      }

      this.closeSocket()
      this.socket = null
      this.qrCode = null
      this.lastDisconnectedAt = new Date().toISOString()
      this.status = shouldReconnect ? 'reconnecting' : 'disconnected'
      this.emitStatus()

      if (shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null
          this.connect().catch((error) => {
            logger.error({ error: error?.message }, 'Baileys reconnect failed.')
          })
        }, 3000)
      }
    }
  }

  handleMessagesUpsert(payload) {
    for (const message of payload?.messages ?? []) {
      const remoteJid = message?.key?.remoteJid

      if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) {
        continue
      }

      if (message?.key?.fromMe) {
        continue
      }

      const content = extractTextMessage(message?.message).trim()

      if (!content) {
        continue
      }

      const phone = phoneFromJid(remoteJid)

      if (!phone) {
        continue
      }

      this.events.emit('message', {
        id: message?.key?.id ?? null,
        phone,
        remoteJid,
        name: message?.pushName ?? null,
        type: 'text',
        content,
        receivedAt: timestampToIso(message?.messageTimestamp),
      })
    }
  }
}
