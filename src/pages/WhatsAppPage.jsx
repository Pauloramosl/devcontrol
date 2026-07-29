import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/Button.jsx'
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppQrCode,
  getWhatsAppStatus,
  listWhatsAppConversations,
  listWhatsAppMessages,
  sendWhatsAppMessage,
} from '../lib/whatsapp.js'

const STATUS_LABELS = {
  connected: 'Conectado',
  connecting: 'Conectando',
  qr: 'Aguardando QR',
  reconnecting: 'Reconectando',
  disconnecting: 'Desconectando',
  disconnected: 'Desconectado',
  error: 'Erro',
}

const STATUS_CLASSES = {
  connected: 'border-dn-success/30 bg-dn-success/10 text-dn-success',
  connecting: 'border-dn-accent/30 bg-dn-accent/10 text-dn-accent',
  qr: 'border-dn-warning/30 bg-dn-warning/10 text-dn-warning',
  reconnecting: 'border-dn-warning/30 bg-dn-warning/10 text-dn-warning',
  disconnecting: 'border-dn-warning/30 bg-dn-warning/10 text-dn-warning',
  disconnected: 'border-white/10 bg-white/5 text-dn-text-secondary',
  error: 'border-dn-danger/30 bg-dn-danger/10 text-dn-danger',
}

function WhatsAppIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.224-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.889-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.895 6.994c-.003 5.45-4.437 9.884-9.889 9.884M20.464 3.488A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.946L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

function SendIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

function formatTime(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getConversationName(conversation) {
  return conversation?.name || conversation?.phone || 'Contato'
}

function getInitials(value) {
  const source = String(value ?? 'W').trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }

  return source.substring(0, 2).toUpperCase()
}

function StatusBadge({ status }) {
  const statusKey = status || 'disconnected'

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_CLASSES[statusKey] ?? STATUS_CLASSES.disconnected}`}>
      <span className={`h-2 w-2 rounded-full ${statusKey === 'connected' ? 'bg-dn-success' : statusKey === 'disconnected' ? 'bg-dn-text-muted' : 'bg-current animate-pulse'}`} />
      {STATUS_LABELS[statusKey] ?? statusKey}
    </span>
  )
}

function WhatsAppPage() {
  const [statusInfo, setStatusInfo] = useState({
    provider: 'baileys',
    status: 'disconnected',
  })
  const [qrCode, setQrCode] = useState('')
  const [conversations, setConversations] = useState([])
  const [selectedConversationId, setSelectedConversationId] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const connectionStatus = statusInfo?.status ?? 'disconnected'
  const isConnected = connectionStatus === 'connected'
  const showQrPanel = ['connecting', 'qr', 'reconnecting'].includes(connectionStatus)
  const canSend = Boolean(isConnected && selectedConversation && draft.trim() && !sending)

  const refreshQrCode = useCallback(async ({ silent = false } = {}) => {
    try {
      const data = await getWhatsAppQrCode()
      if (data.status) {
        setStatusInfo(data.status)
      }
      setQrCode(data.qrCode ?? '')
    } catch (qrError) {
      if (!silent) {
        setError(qrError?.message ?? 'Nao foi possivel carregar o QR Code.')
      }
    }
  }, [])

  const refreshStatus = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingStatus(true)

    try {
      const data = await getWhatsAppStatus()
      const status = data.status ?? {}
      setStatusInfo(status)

      if (status.qrCode) {
        setQrCode(status.qrCode)
      }

      if (status.status === 'connected' || status.status === 'disconnected') {
        setQrCode('')
      }

      if (status.lastError && !silent) {
        setError(status.lastError)
      }
    } catch (statusError) {
      if (!silent) {
        setError(statusError?.message ?? 'Nao foi possivel carregar o status do WhatsApp.')
      }
    } finally {
      if (!silent) setLoadingStatus(false)
    }
  }, [])

  const refreshConversations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingConversations(true)

    try {
      const data = await listWhatsAppConversations()
      setConversations(data.conversations ?? [])
    } catch (conversationError) {
      if (!silent) {
        setError(conversationError?.message ?? 'Nao foi possivel carregar as conversas.')
      }
    } finally {
      if (!silent) setLoadingConversations(false)
    }
  }, [])

  const refreshMessages = useCallback(async ({ silent = false } = {}) => {
    if (!selectedConversationId) {
      setMessages([])
      return
    }

    if (!silent) setLoadingMessages(true)

    try {
      const data = await listWhatsAppMessages(selectedConversationId)
      setMessages(data.messages ?? [])
    } catch (messagesError) {
      if (!silent) {
        setError(messagesError?.message ?? 'Nao foi possivel carregar as mensagens.')
      }
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [selectedConversationId])

  useEffect(() => {
    refreshStatus()
    refreshConversations()

    const interval = window.setInterval(() => {
      refreshStatus({ silent: true })
      refreshConversations({ silent: true })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [refreshConversations, refreshStatus])

  useEffect(() => {
    if (!showQrPanel || qrCode) return undefined

    refreshQrCode({ silent: true })
    const interval = window.setInterval(() => refreshQrCode({ silent: true }), 3000)

    return () => window.clearInterval(interval)
  }, [qrCode, refreshQrCode, showQrPanel])

  useEffect(() => {
    if (!selectedConversationId && conversations.length) {
      setSelectedConversationId(conversations[0].id)
    }
  }, [conversations, selectedConversationId])

  useEffect(() => {
    refreshMessages()

    if (!selectedConversationId) return undefined

    const interval = window.setInterval(() => {
      refreshMessages({ silent: true })
    }, 3500)

    return () => window.clearInterval(interval)
  }, [refreshMessages, selectedConversationId])

  const handleConnect = async () => {
    setError('')
    setActionLoading('connect')

    try {
      const data = await connectWhatsApp()
      setStatusInfo(data.status ?? {})

      if (data.status?.lastError) {
        setError(data.status.lastError)
      }

      if (data.status?.qrCode) {
        setQrCode(data.status.qrCode)
      } else {
        await refreshQrCode({ silent: true })
      }
    } catch (connectError) {
      setError(connectError?.message ?? 'Nao foi possivel iniciar a conexao.')
    } finally {
      setActionLoading('')
      refreshStatus({ silent: true })
    }
  }

  const handleDisconnect = async () => {
    setError('')
    setActionLoading('disconnect')

    try {
      const data = await disconnectWhatsApp()
      setStatusInfo(data.status ?? {})
      setQrCode('')
    } catch (disconnectError) {
      setError(disconnectError?.message ?? 'Nao foi possivel desconectar o WhatsApp.')
    } finally {
      setActionLoading('')
      refreshStatus({ silent: true })
    }
  }

  const handleSend = async (event) => {
    event?.preventDefault()

    const message = draft.trim()
    if (!canSend || !message) return

    setSending(true)
    setError('')

    try {
      await sendWhatsAppMessage({
        conversationId: selectedConversation.id,
        to: selectedConversation.phone,
        message,
      })
      setDraft('')
      await Promise.all([
        refreshMessages({ silent: true }),
        refreshConversations({ silent: true }),
      ])
    } catch (sendError) {
      setError(sendError?.message ?? 'Nao foi possivel enviar a mensagem.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] space-y-5 pb-8 pt-4">
      <section className="rounded-[28px] border border-white/[0.06] bg-dn-bg-card p-5 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/15 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.16)]">
              <WhatsAppIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white">WhatsApp CRM</h1>
              <p className="mt-1 text-sm text-dn-text-secondary">
                Provider {statusInfo.provider ?? 'baileys'} {statusInfo.phoneNumber ? `- ${statusInfo.phoneNumber}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={connectionStatus} />
            <Button type="button" onClick={handleConnect} disabled={actionLoading === 'connect' || isConnected}>
              {actionLoading === 'connect' ? 'Conectando...' : 'Conectar WhatsApp'}
            </Button>
            <Button type="button" variant="danger" onClick={handleDisconnect} disabled={actionLoading === 'disconnect'}>
              {actionLoading === 'disconnect'
                ? 'Desconectando...'
                : connectionStatus === 'disconnected'
                  ? 'Limpar sessao'
                  : 'Desconectar'}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-dn-danger/30 bg-dn-danger/10 px-4 py-3 text-sm font-medium text-dn-danger">
            {error}
          </div>
        ) : null}
      </section>

      {showQrPanel ? (
        <section className="grid gap-5 rounded-[28px] border border-white/[0.06] bg-dn-bg-card p-5 shadow-2xl lg:grid-cols-[280px_1fr]">
          <div className="flex min-h-[260px] items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
            {qrCode ? (
              <img src={qrCode} alt="QR Code do WhatsApp" className="h-56 w-56 rounded-xl bg-white p-3" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-dn-text-secondary">
                <span className="h-8 w-8 rounded-full border-2 border-dn-accent border-t-transparent animate-spin" />
                <span className="text-sm">Aguardando QR Code...</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-dn-accent">Conexao</span>
            <h2 className="mt-2 text-xl font-bold text-white">Escaneie o QR Code pelo WhatsApp</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-dn-text-secondary">
              A sessao fica salva em <span className="font-mono text-dn-text-primary">storage/baileys-auth</span> para tentar reconectar depois que o servidor reiniciar.
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid min-h-[640px] gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-white/[0.06] bg-dn-bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
            <div>
              <h2 className="text-base font-bold text-white">Conversas</h2>
              <p className="text-xs text-dn-text-muted">{conversations.length} registros</p>
            </div>
            {loadingConversations ? (
              <span className="h-4 w-4 rounded-full border-2 border-dn-accent border-t-transparent animate-spin" />
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!loadingConversations && conversations.length === 0 ? (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.025] p-6 text-center text-sm text-dn-text-secondary">
                Nenhuma conversa salva ainda.
              </div>
            ) : null}

            <div className="space-y-2">
              {conversations.map((conversation) => {
                const active = conversation.id === selectedConversationId

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                      active
                        ? 'border-dn-accent/45 bg-dn-accent/15 shadow-[0_0_18px_rgba(58,191,255,0.12)]'
                        : 'border-white/[0.05] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.055]'
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-xs font-bold text-emerald-300">
                      {getInitials(getConversationName(conversation))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-white">
                          {getConversationName(conversation)}
                        </span>
                        <span className="shrink-0 text-[10px] text-dn-text-muted">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-dn-text-secondary">
                          {conversation.last_message || conversation.phone}
                        </span>
                        {conversation.unread_count > 0 ? (
                          <span className="shrink-0 rounded-full bg-dn-accent px-2 py-0.5 text-[10px] font-bold text-white">
                            {conversation.unread_count}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="flex min-h-[640px] flex-col overflow-hidden rounded-[28px] border border-white/[0.06] bg-dn-bg-card shadow-2xl">
          {selectedConversation ? (
            <>
              <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-white">{getConversationName(selectedConversation)}</h2>
                  <p className="text-xs text-dn-text-muted">
                    {selectedConversation.phone} {selectedConversation.last_message_at ? `- Ultima mensagem ${formatDateTime(selectedConversation.last_message_at)}` : ''}
                  </p>
                </div>
                {loadingMessages ? (
                  <span className="h-4 w-4 rounded-full border-2 border-dn-accent border-t-transparent animate-spin" />
                ) : null}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#07111f]/45 p-4">
                {!loadingMessages && messages.length === 0 ? (
                  <div className="flex h-full min-h-[300px] items-center justify-center text-center text-sm text-dn-text-secondary">
                    Nenhuma mensagem nesta conversa.
                  </div>
                ) : null}

                {messages.map((message) => {
                  const outgoing = message.direction === 'outgoing'

                  return (
                    <article key={message.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl border px-4 py-3 shadow-lg ${
                        outgoing
                          ? 'border-dn-accent/25 bg-dn-accent/20 text-white'
                          : 'border-white/10 bg-white/[0.055] text-dn-text-primary'
                      }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                        <div className={`mt-2 flex items-center gap-2 text-[10px] ${outgoing ? 'justify-end text-sky-100/75' : 'text-dn-text-muted'}`}>
                          <span>{formatTime(message.sent_at || message.received_at || message.created_at)}</span>
                          <span>{message.status}</span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <form onSubmit={handleSend} className="border-t border-white/[0.06] p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        handleSend(event)
                      }
                    }}
                    disabled={!isConnected}
                    placeholder={isConnected ? 'Digite sua mensagem...' : 'Conecte o WhatsApp para enviar mensagens'}
                    className="min-h-[46px] flex-1 resize-none rounded-2xl border border-white/10 bg-[#0d1728] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-dn-text-muted focus:border-dn-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={2}
                  />
                  <Button type="submit" disabled={!canSend} className="h-[46px] gap-2 rounded-2xl">
                    <SendIcon />
                    {sending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full min-h-[640px] items-center justify-center p-6 text-center">
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                  <WhatsAppIcon className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-white">Selecione uma conversa</h2>
                <p className="mt-2 text-sm text-dn-text-secondary">
                  {loadingStatus ? 'Carregando WhatsApp...' : 'As mensagens recebidas aparecem aqui depois da conexao.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default WhatsAppPage
