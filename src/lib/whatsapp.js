import { supabase } from './supabase.js'

const API_BASE_URL = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function request(path, { method = 'GET', body } = {}) {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  const token = data.session?.access_token

  if (!token) {
    throw new Error('Sessao expirada. Entre novamente.')
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (requestError) {
    throw new Error(
      `API do WhatsApp indisponivel. Confirme se o backend esta rodando com npm run dev. Detalhe: ${requestError.message}`,
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { error: { message: await response.text() } }

  if (!response.ok) {
    const message = payload?.error?.message?.trim()
    throw new Error(
      message
        ? `API do WhatsApp retornou erro ${response.status}: ${message}`
        : `API do WhatsApp retornou erro ${response.status}. Confirme se o backend esta rodando com npm run dev.`,
    )
  }

  return payload
}

export function getWhatsAppStatus() {
  return request('/api/whatsapp/status')
}

export function connectWhatsApp() {
  return request('/api/whatsapp/connect', { method: 'POST' })
}

export function disconnectWhatsApp() {
  return request('/api/whatsapp/disconnect', { method: 'POST' })
}

export function getWhatsAppQrCode() {
  return request('/api/whatsapp/qr')
}

export function listWhatsAppConversations() {
  return request('/api/whatsapp/conversations')
}

export function getWhatsAppConversation(conversationId) {
  return request(`/api/whatsapp/conversations/${conversationId}`)
}

export function listWhatsAppMessages(conversationId) {
  return request(`/api/whatsapp/conversations/${conversationId}/messages`)
}

export function sendWhatsAppMessage({ conversationId, to, message }) {
  return request('/api/whatsapp/send-message', {
    method: 'POST',
    body: {
      conversationId,
      to,
      message,
    },
  })
}
