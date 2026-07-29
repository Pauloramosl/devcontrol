import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { normalizePhoneNumber, onlyDigits, phonesLookEqual } from '../utils/phone.js'

const SESSION_COLUMNS = `
  id,
  owner_id,
  provider,
  status,
  phone_number,
  qr_code,
  last_connected_at,
  last_disconnected_at,
  created_at,
  updated_at
`

const CONVERSATION_COLUMNS = `
  id,
  owner_id,
  client_id,
  phone,
  remote_jid,
  name,
  profile_picture_url,
  last_message,
  last_message_at,
  unread_count,
  status,
  created_at,
  updated_at
`

const MESSAGE_COLUMNS = `
  id,
  owner_id,
  conversation_id,
  whatsapp_message_id,
  phone,
  remote_jid,
  direction,
  type,
  content,
  media_url,
  status,
  sent_at,
  received_at,
  created_at
`

function removeUndefinedValues(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function normalizeConversationPhone({ phone, remoteJid }) {
  const rawPhone = phone ?? onlyDigits(String(remoteJid ?? '').split('@')[0])

  if (!rawPhone) {
    throw new Error('Conversation phone or remote JID is required.')
  }

  if (String(remoteJid ?? '').endsWith('@lid')) {
    return onlyDigits(rawPhone)
  }

  return normalizePhoneNumber(rawPhone)
}

export async function upsertWhatsAppSession({
  ownerId,
  provider = 'baileys',
  status,
  phoneNumber,
  qrCode,
  lastConnectedAt,
  lastDisconnectedAt,
}) {
  const payload = removeUndefinedValues({
    owner_id: ownerId,
    provider,
    status,
    phone_number: phoneNumber,
    qr_code: qrCode,
    last_connected_at: lastConnectedAt,
    last_disconnected_at: lastDisconnectedAt,
  })

  const { data, error } = await supabaseAdmin
    .from('whatsapp_sessions')
    .upsert(payload, { onConflict: 'owner_id,provider' })
    .select(SESSION_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function getWhatsAppSession({ ownerId, provider = 'baileys' }) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select(SESSION_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getLatestWhatsAppSession({ provider = 'baileys' } = {}) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select(SESSION_COLUMNS)
    .eq('provider', provider)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

async function findMatchingClient({ ownerId, phone, remoteJid }) {
  if (String(remoteJid ?? '').endsWith('@lid')) {
    return null
  }

  const normalizedPhone = normalizePhoneNumber(phone)

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone')
    .eq('owner_id', ownerId)
    .not('phone', 'is', null)

  if (error) throw error

  return (data ?? []).find((client) => phonesLookEqual(client.phone, normalizedPhone)) ?? null
}

export async function findOrCreateConversationByPhone({ ownerId, phone, name, remoteJid }) {
  const normalizedPhone = normalizeConversationPhone({ phone, remoteJid })
  const normalizedRemoteJid = remoteJid ? String(remoteJid).trim() : null

  if (normalizedRemoteJid) {
    const { data: existingByJid, error: jidError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select(CONVERSATION_COLUMNS)
      .eq('owner_id', ownerId)
      .eq('remote_jid', normalizedRemoteJid)
      .maybeSingle()

    if (jidError) throw jidError
    if (existingByJid) return existingByJid
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('phone', normalizedPhone)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    if ((!existing.name && name) || !existing.client_id || (!existing.remote_jid && normalizedRemoteJid)) {
      const client = existing.client_id ? null : await findMatchingClient({
        ownerId,
        phone: normalizedPhone,
        remoteJid: normalizedRemoteJid,
      })
      const updates = removeUndefinedValues({
        name: existing.name || name || client?.name,
        client_id: existing.client_id ?? client?.id,
        remote_jid: existing.remote_jid ?? normalizedRemoteJid ?? undefined,
      })

      if (Object.keys(updates).length) {
        const { data, error } = await supabaseAdmin
          .from('whatsapp_conversations')
          .update(updates)
          .eq('owner_id', ownerId)
          .eq('id', existing.id)
          .select(CONVERSATION_COLUMNS)
          .single()

        if (error) throw error
        return data
      }
    }

    return existing
  }

  const client = await findMatchingClient({
    ownerId,
    phone: normalizedPhone,
    remoteJid: normalizedRemoteJid,
  })

  const { data, error } = await supabaseAdmin
    .from('whatsapp_conversations')
    .insert({
      owner_id: ownerId,
      client_id: client?.id ?? null,
      phone: normalizedPhone,
      remote_jid: normalizedRemoteJid,
      name: name || client?.name || normalizedPhone,
      unread_count: 0,
      status: 'open',
    })
    .select(CONVERSATION_COLUMNS)
    .single()

  if (error) throw error
  return data
}

export async function listConversations({ ownerId }) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('owner_id', ownerId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getConversationById({ ownerId, conversationId }) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('id', conversationId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function listMessages({ ownerId, conversationId }) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_messages')
    .select(MESSAGE_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function saveIncomingMessage({ ownerId, message }) {
  if (message.id) {
    const { data: existing, error: duplicateError } = await supabaseAdmin
      .from('whatsapp_messages')
      .select(MESSAGE_COLUMNS)
      .eq('owner_id', ownerId)
      .eq('whatsapp_message_id', message.id)
      .maybeSingle()

    if (duplicateError) throw duplicateError
    if (existing) return existing
  }

  const conversation = await findOrCreateConversationByPhone({
    ownerId,
    phone: message.phone,
    remoteJid: message.remoteJid,
    name: message.name,
  })

  const receivedAt = message.receivedAt ?? new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('whatsapp_messages')
    .insert({
      owner_id: ownerId,
      conversation_id: conversation.id,
      whatsapp_message_id: message.id,
      phone: normalizeConversationPhone({ phone: message.phone, remoteJid: message.remoteJid }),
      remote_jid: message.remoteJid ?? conversation.remote_jid,
      direction: 'incoming',
      type: message.type ?? 'text',
      content: message.content,
      status: 'received',
      received_at: receivedAt,
    })
    .select(MESSAGE_COLUMNS)
    .single()

  if (error) throw error

  const { error: updateError } = await supabaseAdmin
    .from('whatsapp_conversations')
    .update({
      last_message: message.content,
      last_message_at: receivedAt,
      unread_count: (conversation.unread_count ?? 0) + 1,
    })
    .eq('owner_id', ownerId)
    .eq('id', conversation.id)

  if (updateError) throw updateError
  return data
}

export async function saveOutgoingMessage({
  ownerId,
  conversationId,
  to,
  content,
  whatsappMessageId,
  status = 'sent',
}) {
  let conversation = conversationId
    ? await getConversationById({ ownerId, conversationId })
    : null

  if (!conversation) {
    conversation = await findOrCreateConversationByPhone({
      ownerId,
      phone: to,
      remoteJid: String(to ?? '').includes('@') ? String(to).trim() : undefined,
    })
  }

  const sentAt = new Date().toISOString()
  const outgoingRemoteJid = conversation.remote_jid ?? (String(to ?? '').includes('@') ? String(to).trim() : null)

  const { data, error } = await supabaseAdmin
    .from('whatsapp_messages')
    .insert({
      owner_id: ownerId,
      conversation_id: conversation.id,
      whatsapp_message_id: whatsappMessageId,
      phone: normalizeConversationPhone({ phone: to ?? conversation.phone, remoteJid: outgoingRemoteJid }),
      remote_jid: outgoingRemoteJid,
      direction: 'outgoing',
      type: 'text',
      content,
      status,
      sent_at: sentAt,
    })
    .select(MESSAGE_COLUMNS)
    .single()

  if (error) throw error

  const { error: updateError } = await supabaseAdmin
    .from('whatsapp_conversations')
    .update(removeUndefinedValues({
      last_message: content,
      last_message_at: sentAt,
      remote_jid: conversation.remote_jid ?? outgoingRemoteJid ?? undefined,
    }))
    .eq('owner_id', ownerId)
    .eq('id', conversation.id)

  if (updateError) throw updateError
  return data
}
