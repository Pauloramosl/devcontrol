import { Router } from 'express'
import { requireSupabaseUser } from '../middleware/auth.js'
import { asyncRoute, createHttpError } from '../utils/http.js'
import { isLikelyLid, normalizePhoneNumber, toLikelyLidJid } from '../utils/phone.js'
import { getWhatsAppProvider } from '../whatsapp/providerFactory.js'
import {
  getOwnerRuntimeStatus,
  initWhatsAppRuntime,
  setActiveWhatsAppOwner,
  waitForOwnerRuntimeStatus,
} from '../whatsapp/runtime.js'
import {
  getConversationById,
  getWhatsAppSession,
  listConversations,
  listMessages,
  saveOutgoingMessage,
  upsertWhatsAppSession,
} from '../whatsapp/store.js'

const router = Router()

initWhatsAppRuntime()

router.use(requireSupabaseUser)

router.get('/status', asyncRoute(async (req, res) => {
  const status = await getOwnerRuntimeStatus(req.user.id)
  res.json({ status })
}))

router.post('/connect', asyncRoute(async (req, res) => {
  setActiveWhatsAppOwner(req.user.id)
  const currentSession = await getWhatsAppSession({
    ownerId: req.user.id,
    provider: 'baileys',
  })
  const provider = getWhatsAppProvider()

  const shouldStartFresh = !currentSession || currentSession.status !== 'connected'

  if (shouldStartFresh) {
    await provider.disconnect({ clearSession: true })
  }

  await upsertWhatsAppSession({
    ownerId: req.user.id,
    status: 'connecting',
    qrCode: null,
  })

  await provider.connect()
  const status = await waitForOwnerRuntimeStatus(req.user.id)

  res.json({ status })
}))

router.post('/disconnect', asyncRoute(async (req, res) => {
  setActiveWhatsAppOwner(req.user.id)
  const provider = getWhatsAppProvider()
  await provider.disconnect()

  await upsertWhatsAppSession({
    ownerId: req.user.id,
    status: 'disconnected',
    phoneNumber: null,
    qrCode: null,
    lastDisconnectedAt: new Date().toISOString(),
  })

  const status = await getOwnerRuntimeStatus(req.user.id)
  res.json({ status })
}))

router.get('/qr', asyncRoute(async (req, res) => {
  const status = await getOwnerRuntimeStatus(req.user.id)
  res.json({ qrCode: status.qrCode ?? null, status })
}))

router.get('/conversations', asyncRoute(async (req, res) => {
  const conversations = await listConversations({ ownerId: req.user.id })
  res.json({ conversations })
}))

router.get('/conversations/:id', asyncRoute(async (req, res) => {
  const conversation = await getConversationById({
    ownerId: req.user.id,
    conversationId: req.params.id,
  })

  if (!conversation) {
    throw createHttpError(404, 'conversation_not_found', 'Conversation not found.')
  }

  res.json({ conversation })
}))

router.get('/conversations/:id/messages', asyncRoute(async (req, res) => {
  const conversation = await getConversationById({
    ownerId: req.user.id,
    conversationId: req.params.id,
  })

  if (!conversation) {
    throw createHttpError(404, 'conversation_not_found', 'Conversation not found.')
  }

  const messages = await listMessages({
    ownerId: req.user.id,
    conversationId: conversation.id,
  })

  res.json({ messages })
}))

router.post('/send-message', asyncRoute(async (req, res) => {
  const conversationId = String(req.body?.conversationId ?? '').trim()
  const message = String(req.body?.message ?? '').trim()
  const provider = getWhatsAppProvider()
  const connectionStatus = provider.getConnectionStatus()

  if (!message) {
    throw createHttpError(400, 'empty_message', 'Message cannot be empty.')
  }

  if (connectionStatus.status !== 'connected') {
    throw createHttpError(409, 'whatsapp_not_connected', 'WhatsApp is not connected.')
  }

  let conversation = null
  if (conversationId) {
    conversation = await getConversationById({
      ownerId: req.user.id,
      conversationId,
    })

    if (!conversation) {
      throw createHttpError(404, 'conversation_not_found', 'Conversation not found.')
    }
  }

  let to

  try {
    const requestedTarget = req.body?.to ?? conversation?.phone
    to = conversation?.remote_jid
      ?? (isLikelyLid(conversation?.phone) ? toLikelyLidJid(conversation.phone) : normalizePhoneNumber(requestedTarget))
  } catch (error) {
    throw createHttpError(400, 'invalid_phone', error.message)
  }

  let sent

  try {
    sent = await provider.sendMessage(to, message)
  } catch (error) {
    throw createHttpError(502, 'send_failed', error.message ?? 'Failed to send WhatsApp message.')
  }

  const savedMessage = await saveOutgoingMessage({
    ownerId: req.user.id,
    conversationId: conversation?.id ?? conversationId,
    to: sent.to ?? to,
    content: message,
    whatsappMessageId: sent.id,
    status: 'sent',
  })

  res.json({
    success: true,
    message: savedMessage,
    sentTo: sent.to ?? to,
  })
}))

export default router
