import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CLIENT_STATUSES, listClients, getClientById, updateClient } from '../lib/clients.js'
import { createAppointment } from '../lib/appointments.js'
import { listTags } from '../lib/tags.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const STATUS_OPTIONS = ['all', ...CLIENT_STATUSES]

const CLIENT_STATUS_LABELS = {
  all: 'Todos',
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
}

function getStatusBadgeVariant(status) {
  const s = status.toLowerCase()
  if (s === 'ativo' || s === 'active') return 'active'
  if (s === 'paused' || s === 'pausado') return 'warning'
  if (s === 'closed' || s === 'encerrado') return 'danger'
  return 'active'
}

function splitClientName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function buildClientName({ firstName, lastName }) {
  return [firstName, lastName].map((part) => String(part ?? '').trim()).filter(Boolean).join(' ')
}

function getTomorrowDateString() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildClientUpdateInput(client, overrides = {}) {
  return {
    name: client?.name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    company: client?.company ?? '',
    document_number: client?.document_number ?? '',
    status: client?.status ?? 'active',
    notes: client?.notes ?? '',
    ...overrides,
  }
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function WhatsAppBrandIcon({ className = 'h-[18px] w-[18px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.224-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.889-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.895 6.994c-.003 5.45-4.437 9.884-9.889 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.946L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

function GmailBrandIcon({ className = 'h-[19px] w-[21px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 256 193" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 70.155 0 54.676v120.92c0 9.096 7.37 16.455 16.455 16.455h41.727Z" />
      <path fill="#34A853" d="M197.818 192.05h41.727c9.096 0 16.455-7.37 16.455-16.455V54.676l-29.302 16.914-28.88 21.55v98.91Z" />
      <path fill="#EA4335" d="m58.182 93.14 69.818 52.364 69.818-52.364V0L128 52.364 58.182 0v93.14Z" />
      <path fill="#FBBC04" d="M197.818 0v93.14L256 49.505v-33.05c0-12.521-14.3-19.665-24.436-12.153L197.818 0Z" />
      <path fill="#C5221F" d="M0 49.505 26.759 69.574 58.182 93.14V0L24.436 4.302C14.3-3.21 0 3.934 0 16.455v33.05Z" />
    </svg>
  )
}

function OutlookBrandIcon({ className = 'h-[19px] w-[19px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <rect x="8.2" y="4.2" width="12.8" height="15.6" rx="2" fill="#0078D4" />
      <path fill="#50A5F1" d="M20.9 7.2v9.6l-6.35-4.05L20.9 7.2Z" />
      <path fill="#0A5EBE" d="M8.2 7.2h12.7l-6.35 5.55L8.2 7.2Z" />
      <path fill="#185ABD" d="M8.2 16.8h12.7l-6.35-4.05L8.2 16.8Z" />
      <rect x="3" y="6.3" width="11.1" height="11.4" rx="1.8" fill="#0B5CAD" />
      <path fill="#FFFFFF" d="M8.45 15.25c-2.04 0-3.4-1.52-3.4-3.75s1.36-3.75 3.4-3.75 3.4 1.52 3.4 3.75-1.36 3.75-3.4 3.75Zm0-1.45c1.02 0 1.62-.86 1.62-2.3s-.6-2.3-1.62-2.3-1.62.86-1.62 2.3.6 2.3 1.62 2.3Z" />
    </svg>
  )
}

function YahooMailIcon({ className = 'h-[18px] w-[18px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#6001D2" />
      <path fill="#FFFFFF" d="M10.78 13.36 6.35 6.55h2.7l2.92 4.72 2.94-4.72h2.64l-4.47 6.83v4.07h-2.3v-4.09Z" />
      <path fill="#FFFFFF" d="M17.08 16.28c.7 0 1.18.49 1.18 1.11 0 .64-.48 1.11-1.18 1.11-.68 0-1.16-.47-1.16-1.11 0-.62.48-1.11 1.16-1.11Zm-.93-9.73h2.16l-.33 8.54h-1.5l-.33-8.54Z" />
    </svg>
  )
}

function ICloudMailIcon({ className = 'h-[19px] w-[19px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <path fill="#38BDF8" d="M17.86 10.12A5.8 5.8 0 0 0 6.7 8.7a4.72 4.72 0 0 0 .02 9.44h10.72a4 4 0 0 0 .42-8.02Z" />
      <path fill="#FFFFFF" d="M7.4 10.85h9.2c.5 0 .9.4.9.9v4.65c0 .5-.4.9-.9.9H7.4c-.5 0-.9-.4-.9-.9v-4.65c0-.5.4-.9.9-.9Zm.62 1.35 3.98 2.87 3.98-2.87H8.02Zm8.13 3.95v-2.67l-3.65 2.63a.86.86 0 0 1-1 0l-3.65-2.63v2.67h8.3Z" />
    </svg>
  )
}

function ProtonMailIcon({ className = 'h-[18px] w-[18px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <rect x="2.5" y="3.5" width="19" height="17" rx="4" fill="#6D4AFF" />
      <path fill="#A78BFA" d="M4.6 7.2 12 13.15 19.4 7.2v9.6a1.35 1.35 0 0 1-1.35 1.35H5.95A1.35 1.35 0 0 1 4.6 16.8V7.2Z" />
      <path fill="#FFFFFF" d="M5.2 6.55h13.6l-6.8 5.42-6.8-5.42Z" />
      <path fill="#4C1D95" d="M4.6 7.2v9.6c0 .75.6 1.35 1.35 1.35h12.1c.75 0 1.35-.6 1.35-1.35L12 12.08 4.6 7.2Z" opacity=".28" />
    </svg>
  )
}

function ZohoMailIcon({ className = 'h-[18px] w-[18px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <rect x="3" y="3" width="8.6" height="8.6" rx="1.8" fill="#E42527" />
      <rect x="12.4" y="3" width="8.6" height="8.6" rx="1.8" fill="#089949" />
      <rect x="3" y="12.4" width="8.6" height="8.6" rx="1.8" fill="#F9B21D" />
      <rect x="12.4" y="12.4" width="8.6" height="8.6" rx="1.8" fill="#226DB4" />
      <path fill="#FFFFFF" d="M5.1 9.65 8.2 5.1H5.35V4.1h4.5v.84L6.72 9.5H9.9v1H5.1v-.85Zm9.58-5.55h3.55v1h-2.42v1.65h2.07v.98h-2.07v1.78h2.5v.99h-3.63V4.1Zm-8.95 10.7h1.13v2.52h2.1V14.8h1.13v6.1H8.96v-2.58h-2.1v2.58H5.73v-6.1Zm10.82 6.25c-1.72 0-2.77-1.3-2.77-3.2s1.05-3.2 2.77-3.2 2.78 1.3 2.78 3.2-1.06 3.2-2.78 3.2Zm0-.98c.98 0 1.57-.86 1.57-2.22s-.59-2.21-1.57-2.21-1.56.85-1.56 2.21.58 2.22 1.56 2.22Z" />
    </svg>
  )
}

function GenericMailIcon({ className = 'h-[18px] w-[18px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function PhoneSolidIcon({ className = 'h-[18px] w-[18px]', dimmed = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${className}${dimmed ? ' opacity-45' : ''}`} aria-hidden="true">
      <path d="M6.62 10.79a15.464 15.464 0 0 0 6.59 6.59l2.2-2.2a1.01 1.01 0 0 1 1.02-.24 11.72 11.72 0 0 0 3.57.57c.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z" />
    </svg>
  )
}

function CopySolidIcon({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1Zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 16H8V7h11v14Z" />
    </svg>
  )
}

const EMAIL_PROVIDER_CONFIGS = [
  {
    key: 'gmail',
    label: 'Gmail',
    domains: ['gmail.com', 'googlemail.com'],
    Icon: GmailBrandIcon,
    buttonClassName: 'border-red-300/20 bg-white/[0.04] shadow-[0_0_14px_rgba(239,68,68,0.12)] hover:border-red-300/45 hover:bg-white/[0.08]',
  },
  {
    key: 'outlook',
    label: 'Outlook',
    domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'],
    Icon: OutlookBrandIcon,
    buttonClassName: 'border-blue-300/20 bg-blue-500/10 shadow-[0_0_14px_rgba(59,130,246,0.12)] hover:border-blue-300/45 hover:bg-blue-500/15',
  },
  {
    key: 'yahoo',
    label: 'Yahoo Mail',
    domains: ['yahoo.com', 'yahoo.com.br', 'ymail.com', 'rocketmail.com'],
    Icon: YahooMailIcon,
    buttonClassName: 'border-violet-300/20 bg-violet-500/10 shadow-[0_0_14px_rgba(139,92,246,0.12)] hover:border-violet-300/45 hover:bg-violet-500/15',
  },
  {
    key: 'icloud',
    label: 'iCloud Mail',
    domains: ['icloud.com', 'me.com', 'mac.com'],
    Icon: ICloudMailIcon,
    buttonClassName: 'border-sky-300/20 bg-sky-500/10 shadow-[0_0_14px_rgba(56,189,248,0.12)] hover:border-sky-300/45 hover:bg-sky-500/15',
  },
  {
    key: 'proton',
    label: 'Proton Mail',
    domains: ['proton.me', 'protonmail.com', 'pm.me'],
    Icon: ProtonMailIcon,
    buttonClassName: 'border-fuchsia-300/20 bg-fuchsia-500/10 shadow-[0_0_14px_rgba(217,70,239,0.12)] hover:border-fuchsia-300/45 hover:bg-fuchsia-500/15',
  },
  {
    key: 'zoho',
    label: 'Zoho Mail',
    domains: ['zoho.com', 'zohomail.com', 'zohomail.com.br'],
    Icon: ZohoMailIcon,
    buttonClassName: 'border-amber-300/20 bg-amber-500/10 shadow-[0_0_14px_rgba(245,158,11,0.12)] hover:border-amber-300/45 hover:bg-amber-500/15',
  },
]

const GENERIC_EMAIL_PROVIDER = {
  key: 'generic',
  label: 'E-mail',
  Icon: GenericMailIcon,
  buttonClassName: 'border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.12)] hover:border-sky-300/45 hover:bg-sky-500 hover:text-white',
}

const MINI_ICON_BUTTON_CLASS = 'flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:border-dn-accent/45 hover:bg-dn-accent/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dn-accent/40'
const CARD_ACTION_BASE_CLASS = 'group flex h-10 w-10 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_24px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dn-accent/40 active:translate-y-0'
const CARD_ACTION_MUTED_CLASS = `${CARD_ACTION_BASE_CLASS} border-white/10 bg-white/[0.045] text-slate-400 hover:border-dn-accent/45 hover:bg-dn-accent/15 hover:text-white`
const FIELD_ICON_CLASS = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#15243b]/85 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(0,0,0,0.18)] mt-0.5'
const INLINE_EDIT_BUTTON_CLASS = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#15243b]/80 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:border-dn-accent/40 hover:bg-dn-accent/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dn-accent/35'
const CHANNEL_ACTION_BASE_CLASS = 'group flex h-8 w-8 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dn-accent/35 active:translate-y-0'
const CHANNEL_MUTED_BUTTON_CLASS = `${CHANNEL_ACTION_BASE_CLASS} border-white/10 bg-white/[0.045] text-slate-400 hover:border-dn-accent/35 hover:bg-dn-accent/15 hover:text-white`

function getEmailDomain(email) {
  const domain = String(email ?? '').trim().toLowerCase().split('@').pop()
  return domain && domain !== String(email ?? '').trim().toLowerCase() ? domain : ''
}

function domainMatchesProvider(domain, providerDomains) {
  return providerDomains.some((providerDomain) => domain === providerDomain || domain.endsWith(`.${providerDomain}`))
}

function getEmailProvider(email) {
  const domain = getEmailDomain(email)

  if (!domain) return GENERIC_EMAIL_PROVIDER

  return EMAIL_PROVIDER_CONFIGS.find((provider) => domainMatchesProvider(domain, provider.domains)) ?? GENERIC_EMAIL_PROVIDER
}

function EmailProviderIcon({ email, dimmed = false }) {
  const { Icon } = getEmailProvider(email)
  return <Icon dimmed={dimmed} />
}

function ClientsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [clients, setClients] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedClient, setSelectedClient] = useState(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [fieldDraft, setFieldDraft] = useState('')
  const [savingField, setSavingField] = useState('')
  const [cardNotice, setCardNotice] = useState(null)
  const [activePanel, setActivePanel] = useState(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    date: getTomorrowDateString(),
    time: '10:00',
    type: 'Ligação',
    description: '',
  })

  const [searchInput, setSearchInput] = useState('')
  const [statusInput, setStatusInput] = useState('all')
  const [tagInput, setTagInput] = useState('all')
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: '',
    status: 'all',
    tagId: 'all',
  })

  const ownerId = user?.id

  const selectedNameParts = useMemo(
    () => splitClientName(selectedClient?.name),
    [selectedClient?.name],
  )
  const selectedEmailProvider = useMemo(
    () => getEmailProvider(selectedClient?.email),
    [selectedClient?.email],
  )

  const syncSelectedClient = useCallback((client) => {
    if (!client) return

    setSelectedClient(client)
    setClients((currentClients) =>
      currentClients.map((item) =>
        item.id === client.id
          ? {
              ...item,
              name: client.name,
              email: client.email,
              company: client.company,
              status: client.status,
              tags: item.tags ?? client.tags ?? [],
            }
          : item,
      ),
    )
  }, [])

  const saveClientChanges = useCallback(async (overrides, { successMessage, savingKey = 'client' } = {}) => {
    if (!ownerId || !selectedClient) return null

    setSavingField(savingKey)
    setCardNotice(null)

    try {
      await updateClient({
        ownerId,
        clientId: selectedClient.id,
        input: buildClientUpdateInput(selectedClient, overrides),
      })

      const refreshedClient = await getClientById({ ownerId, clientId: selectedClient.id })
      syncSelectedClient(refreshedClient)

      if (successMessage) {
        setCardNotice({ type: 'success', text: successMessage })
      }

      return refreshedClient
    } catch (saveError) {
      setCardNotice({
        type: 'error',
        text: saveError?.message ?? 'Não foi possível salvar a alteração.',
      })
      return null
    } finally {
      setSavingField('')
    }
  }, [ownerId, selectedClient, syncSelectedClient])

  const openActionPanel = useCallback((panel) => {
    if (!selectedClient) return

    setOptionsOpen(false)
    setEditingField(null)
    setCardNotice(null)
    setActivePanel((currentPanel) => (currentPanel === panel ? null : panel))

    if (panel === 'note') {
      setNoteDraft(selectedClient.notes ?? '')
    }

    if (panel === 'schedule') {
      setScheduleForm({
        title: `Contato com ${selectedClient.name}`,
        date: getTomorrowDateString(),
        time: '10:00',
        type: 'Ligação',
        description: selectedClient.phone
          ? `Contato pelo telefone ${selectedClient.phone}`
          : 'Próximo contato com o cliente',
      })
    }
  }, [selectedClient])

  const startInlineEdit = useCallback((field) => {
    if (!selectedClient) return

    const values = {
      firstName: selectedNameParts.firstName,
      lastName: selectedNameParts.lastName,
      email: selectedClient.email ?? '',
      phone: selectedClient.phone ?? '',
    }

    setActivePanel(null)
    setOptionsOpen(false)
    setCardNotice(null)
    setEditingField(field)
    setFieldDraft(values[field] ?? '')
  }, [selectedClient, selectedNameParts.firstName, selectedNameParts.lastName])

  const cancelInlineEdit = useCallback(() => {
    setEditingField(null)
    setFieldDraft('')
  }, [])

  const handleInlineSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!selectedClient || !editingField) return

    const trimmedValue = fieldDraft.trim()
    let overrides = {}
    let successMessage = 'Campo atualizado.'

    if (editingField === 'firstName') {
      if (!trimmedValue) {
        setCardNotice({ type: 'error', text: 'O primeiro nome não pode ficar vazio.' })
        return
      }
      overrides = {
        name: buildClientName({
          firstName: trimmedValue,
          lastName: selectedNameParts.lastName,
        }),
      }
      successMessage = 'Primeiro nome atualizado.'
    }

    if (editingField === 'lastName') {
      const fullName = buildClientName({
        firstName: selectedNameParts.firstName,
        lastName: trimmedValue,
      })
      if (!fullName) {
        setCardNotice({ type: 'error', text: 'O cliente precisa ter pelo menos um nome.' })
        return
      }
      overrides = { name: fullName }
      successMessage = 'Sobrenome atualizado.'
    }

    if (editingField === 'email') {
      overrides = { email: trimmedValue }
      successMessage = trimmedValue ? 'E-mail atualizado.' : 'E-mail removido.'
    }

    if (editingField === 'phone') {
      overrides = { phone: trimmedValue }
      successMessage = trimmedValue ? 'Telefone atualizado.' : 'Telefone removido.'
    }

    const updatedClient = await saveClientChanges(overrides, {
      successMessage,
      savingKey: editingField,
    })

    if (updatedClient) {
      cancelInlineEdit()
    }
  }, [
    cancelInlineEdit,
    editingField,
    fieldDraft,
    saveClientChanges,
    selectedClient,
    selectedNameParts.firstName,
    selectedNameParts.lastName,
  ])

  const handleShareClient = useCallback(async () => {
    if (!selectedClient) return

    const clientUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/app/clients/${selectedClient.id}`
        : `/app/clients/${selectedClient.id}`
    const shareText = `${selectedClient.name}${selectedClient.email ? ` | ${selectedClient.email}` : ''}${selectedClient.phone ? ` | ${selectedClient.phone}` : ''}`

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: selectedClient.name,
          text: shareText,
          url: clientUrl,
        })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(clientUrl)
      } else if (typeof window !== 'undefined') {
        window.prompt('Copie o link do cliente:', clientUrl)
      }

      setCardNotice({ type: 'success', text: 'Link do cliente copiado/compartilhado.' })
      setOptionsOpen(false)
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') {
        setCardNotice({ type: 'error', text: 'Não foi possível compartilhar este cliente.' })
      }
    }
  }, [selectedClient])

  const handleCopyContact = useCallback(async () => {
    if (!selectedClient) return

    const contactText = [
      selectedClient.name,
      selectedClient.company ? `Empresa: ${selectedClient.company}` : null,
      selectedClient.email ? `E-mail: ${selectedClient.email}` : null,
      selectedClient.phone ? `Telefone: ${selectedClient.phone}` : null,
    ].filter(Boolean).join('\n')

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(contactText)
      } else if (typeof window !== 'undefined') {
        window.prompt('Copie os dados do contato:', contactText)
      }
      setCardNotice({ type: 'success', text: 'Contato copiado.' })
    } catch {
      setCardNotice({ type: 'error', text: 'Não foi possível copiar o contato.' })
    }
  }, [selectedClient])

  const handleNotesSubmit = useCallback(async (event) => {
    event.preventDefault()

    const updatedClient = await saveClientChanges(
      { notes: noteDraft },
      { successMessage: 'Nota do cliente salva.', savingKey: 'notes' },
    )

    if (updatedClient) {
      setActivePanel('history')
    }
  }, [noteDraft, saveClientChanges])

  const handleScheduleSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!ownerId || !selectedClient || !scheduleForm.title.trim() || !scheduleForm.date) return

    setSavingField('schedule')
    setCardNotice(null)

    try {
      await createAppointment({
        ownerId,
        input: {
          title: scheduleForm.title,
          date: scheduleForm.date,
          time: scheduleForm.time,
          client_name: selectedClient.name,
          description: scheduleForm.description,
          type: scheduleForm.type,
        },
      })

      setCardNotice({ type: 'success', text: 'Próximo contato agendado no calendário.' })
      setActivePanel(null)
    } catch (scheduleError) {
      setCardNotice({
        type: 'error',
        text: scheduleError?.message ?? 'Não foi possível agendar o contato.',
      })
    } finally {
      setSavingField('')
    }
  }, [ownerId, scheduleForm, selectedClient])

  const loadTags = useCallback(async () => {
    if (!ownerId) return

    try {
      const data = await listTags({ ownerId })
      setTags(data)
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [ownerId])

  const handleSelectClient = useCallback(async (clientId) => {
    if (!ownerId || !clientId) return
    setCardLoading(true)
    try {
      const fullClient = await getClientById({ ownerId, clientId })
      setSelectedClient(fullClient)
    } catch (err) {
      console.error('Erro ao carregar detalhes do cliente:', err)
    } finally {
      setCardLoading(false)
    }
  }, [ownerId])

  const loadClients = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await listClients({
        ownerId,
        searchTerm: appliedFilters.searchTerm,
        status: appliedFilters.status,
        tagId: appliedFilters.tagId,
      })

      setClients(data)
      
      // Auto-selecionar o primeiro cliente ao carregar a lista ou quando filtros mudarem
      if (data.length > 0) {
        const currentSelectedId = selectedClient?.id
        const stillInList = data.some((c) => c.id === currentSelectedId)
        if (!currentSelectedId || !stillInList) {
          handleSelectClient(data[0].id)
        }
      } else {
        setSelectedClient(null)
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters.searchTerm, appliedFilters.status, appliedFilters.tagId, ownerId, selectedClient, handleSelectClient])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    loadClients()
    // Desabilitamos a dependência direta de selectedClient e handleSelectClient no useEffect inicial para evitar loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters.searchTerm, appliedFilters.status, appliedFilters.tagId, ownerId])

  useEffect(() => {
    setEditingField(null)
    setFieldDraft('')
    setActivePanel(null)
    setOptionsOpen(false)
    setCardNotice(null)
  }, [selectedClient?.id])

  useEffect(() => {
    setNoteDraft(selectedClient?.notes ?? '')
  }, [selectedClient?.id, selectedClient?.notes])

  const activeTagName = useMemo(() => {
    if (appliedFilters.tagId === 'all') return null
    return tags.find((tag) => tag.id === appliedFilters.tagId)?.name ?? null
  }, [appliedFilters.tagId, tags])

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters({
      searchTerm: searchInput,
      status: statusInput,
      tagId: tagInput,
    })
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setStatusInput('all')
    setTagInput('all')
    setAppliedFilters({
      searchTerm: '',
      status: 'all',
      tagId: 'all',
    })
  }

  const renderEditableValue = (field, displayValue, placeholder = 'Digite aqui', type = 'text') => {
    if (editingField !== field) {
      return (
        <p className="text-sm font-semibold text-white mt-0.5 break-words">
          {displayValue || '-'}
        </p>
      )
    }

    return (
      <form className="mt-1 flex items-center gap-1.5" onSubmit={handleInlineSubmit}>
        <Input
          type={type}
          value={fieldDraft}
          onChange={(event) => setFieldDraft(event.target.value)}
          placeholder={placeholder}
          className="h-8 min-w-0 text-xs"
          autoFocus
        />
        <button
          type="submit"
          disabled={savingField === field}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dn-accent/30 bg-dn-accent/15 text-dn-accent transition-all hover:bg-dn-accent hover:text-white disabled:opacity-50"
          title="Salvar"
        >
          {savingField === field ? (
            <span className="h-3.5 w-3.5 animate-dn-spin rounded-full border-2 border-dn-accent/30 border-t-white" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={cancelInlineEdit}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/[0.03] text-dn-text-secondary transition-all hover:bg-white/[0.08] hover:text-white"
          title="Cancelar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </form>
    )
  }

  const renderInlineEditButton = (field, title) => (
    <button
      type="button"
      onClick={() => startInlineEdit(field)}
      className={INLINE_EDIT_BUTTON_CLASS}
      title={title}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
      </svg>
    </button>
  )

  return (
    <section className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-dn-h2 text-white">Clientes</h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary font-medium">
            Gerencie sua base de clientes, contatos e tags de forma ágil.
          </p>
        </div>
        <Link to="/app/clients/new">
          <Button variant="primary">Novo Cliente</Button>
        </Link>
      </div>

      {/* LAYOUT DE DUAS COLUNAS LADO A LADO */}
      <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_440px]">
        
        {/* COLUNA ESQUERDA: Filtros + Lista de Clientes */}
        <div className="w-full min-w-0 space-y-4">
          
          {/* Formulário de Filtros Compacto */}
          <form
            className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-[24px] p-5 space-y-3 shadow-lg relative overflow-hidden xl:grid xl:grid-cols-[minmax(240px,1fr)_minmax(280px,360px)_minmax(120px,170px)] xl:items-end xl:gap-3 xl:space-y-0"
            onSubmit={handleApplyFilters}
          >
            {/* Subtle top highlight */}
            <div className="absolute top-0 left-5 right-5 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

            <div>
              <label className="block text-[10px] font-bold text-dn-text-muted uppercase tracking-wider mb-1.5">Busca rápida</label>
              <Input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nome ou email"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-dn-text-muted uppercase tracking-wider mb-1.5">Status</label>
                <Select
                  value={statusInput}
                  onChange={(event) => setStatusInput(event.target.value)}
                  className="h-9 text-xs py-1"
                >
                  {STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption} value={statusOption} className="bg-dn-bg-elevated text-dn-text-primary text-xs">
                      {CLIENT_STATUS_LABELS[statusOption]}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-dn-text-muted uppercase tracking-wider mb-1.5">Tag</label>
                <Select
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  className="h-9 text-xs py-1"
                >
                  <option value="all" className="bg-dn-bg-elevated text-dn-text-primary text-xs">Todas</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id} className="bg-dn-bg-elevated text-dn-text-primary text-xs">
                      {tag.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-1 xl:pt-0">
              <Button type="submit" size="sm" className="w-full text-xs h-8">Filtrar</Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="h-8 px-2.5" title="Limpar filtros">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </Button>
            </div>
          </form>

          {/* Indicador de Filtros Ativos */}
          {appliedFilters.searchTerm || appliedFilters.status !== 'all' || activeTagName ? (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-dn-text-muted uppercase tracking-wider font-semibold mr-1">Filtros:</span>
              {appliedFilters.searchTerm && <Badge variant="active" className="text-[9px] py-0.5">busca: {appliedFilters.searchTerm}</Badge>}
              {appliedFilters.status !== 'all' && <Badge variant="active" className="text-[9px] py-0.5">status: {CLIENT_STATUS_LABELS[appliedFilters.status]}</Badge>}
              {activeTagName && <Badge variant="active" className="text-[9px] py-0.5">tag: {activeTagName}</Badge>}
            </div>
          ) : null}

          {/* Loader da Lista */}
          {loading && clients.length === 0 ? (
            <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-[24px] p-6 text-dn-text-secondary animate-pulse text-xs">
              Carregando lista de clientes...
            </div>
          ) : null}

          {/* Erro da Lista */}
          {!loading && error ? (
            <div className="bg-dn-danger-bg border-[0.5px] border-dn-danger/20 rounded-[16px] p-4 text-xs text-dn-danger">
              {error}
            </div>
          ) : null}

          {/* Lista Vazia */}
          {!loading && !error && clients.length === 0 ? (
            <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-[24px] p-8 flex flex-col items-center justify-center text-center shadow-lg">
              <div className="w-10 h-10 rounded-full bg-dn-bg-elevated flex items-center justify-center text-dn-text-muted mb-3">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Nenhum cliente cadastrado</h4>
              <p className="text-xs text-dn-text-secondary mb-3 max-w-[200px]">Não encontramos clientes com os filtros definidos.</p>
              <Button size="sm" variant="ghost" onClick={handleResetFilters} className="text-xs">Limpar Filtros</Button>
            </div>
          ) : null}

          {/* Listagem de Clientes Compacta */}
          {clients.length > 0 ? (
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 hide-scrollbar">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client.id)}
                  className={`p-4 rounded-[20px] border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    selectedClient?.id === client.id
                      ? 'border-dn-accent/40 bg-[#162236]/90 shadow-[0_4px_20px_rgba(58,191,255,0.12)]'
                      : 'border-white/5 bg-dn-bg-card hover:bg-[#162236]/40 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-white text-sm truncate">{client.name}</h4>
                      <p className="text-xs text-dn-text-secondary mt-0.5 truncate">{client.email || 'Sem email'}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(client.status)} className="uppercase text-[9px] px-2 py-0.5 shrink-0">
                      {CLIENT_STATUS_LABELS[client.status]}
                    </Badge>
                  </div>

                  {client.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {client.tags.map((tag) => (
                        <span key={tag.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded px-1.5 py-0.5 text-[9px] text-dn-text-secondary font-medium">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* COLUNA DIREITA: Card de Detalhes Completo */}
        <div className="w-full min-w-0 space-y-5 lg:justify-self-end">
          
          {cardLoading && !selectedClient ? (
            <div className="bg-dn-bg-card border border-white/5 rounded-[32px] p-10 text-center text-dn-text-secondary animate-pulse text-xs">
              Carregando detalhes do cliente...
            </div>
          ) : selectedClient ? (
            <>
              {/* 1. PAINEL DO AVATAR (SUPERIOR) - Compacto */}
              <div className="relative bg-gradient-to-b from-[#162236]/80 to-[#101b30]/95 border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.5)] rounded-[32px] p-5 text-center overflow-hidden">
                {/* Glow de fundo ambient lighting */}
                <div className="absolute -top-16 -left-16 w-36 h-36 bg-dn-accent/10 rounded-full blur-[60px] pointer-events-none"></div>
                <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-dn-purple/10 rounded-full blur-[60px] pointer-events-none"></div>

                {/* Topo com ações rápidas */}
                <div className="flex justify-between items-center mb-5">
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => openActionPanel('relations')} className={MINI_ICON_BUTTON_CLASS} title="Relações do cliente">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <path d="M18 8A6 6 0 0 0 6 8v8a6 6 0 0 0 12 0"></path><circle cx="6" cy="8" r="2"></circle><circle cx="18" cy="8" r="2"></circle><circle cx="12" cy="16" r="2"></circle>
                      </svg>
                    </button>
                    <button type="button" onClick={handleShareClient} className={MINI_ICON_BUTTON_CLASS} title="Compartilhar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setOptionsOpen((current) => !current)} className={MINI_ICON_BUTTON_CLASS} title="Opções">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle>
                      </svg>
                    </button>
                    <Link to={`/app/clients/${selectedClient.id}`} className={MINI_ICON_BUTTON_CLASS} title="Visualizar Detalhes Completos">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline>
                      </svg>
                    </Link>
                  </div>
                </div>

                {optionsOpen ? (
                  <div className="absolute right-5 top-[52px] z-20 w-48 rounded-[18px] border border-white/10 bg-[#101b30]/95 p-2 text-left shadow-2xl backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/clients/${selectedClient.id}`)}
                      className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-dn-text-secondary transition-all hover:bg-white/[0.06] hover:text-white"
                    >
                      Abrir detalhes
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/app/clients/${selectedClient.id}/edit`)}
                      className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-dn-text-secondary transition-all hover:bg-white/[0.06] hover:text-white"
                    >
                      Editar cadastro completo
                    </button>
                    <button
                      type="button"
                      onClick={handleShareClient}
                      className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-dn-text-secondary transition-all hover:bg-white/[0.06] hover:text-white"
                    >
                      Copiar link
                    </button>
                  </div>
                ) : null}

                {/* Avatar e Identidade - Reduzidos */}
                <div className="flex flex-col items-center">
                  <img 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedClient.name)}&backgroundColor=0ea5e9,3b82f6,6366f1,8b5cf6,ec4899,f43f5e,f97316,f59e0b,10b981`}
                    alt={selectedClient.name} 
                    className="w-20 h-20 rounded-full border border-dn-accent/30 p-1 bg-dn-bg-elevated object-cover shadow-[0_0_20px_rgba(58,191,255,0.15)]"
                  />
                  <h3 className="text-xl font-bold text-white tracking-tight mt-3">{selectedClient.name}</h3>
                  <p className="text-[11px] text-dn-text-secondary mt-1 font-medium max-w-sm px-4 truncate">
                    {selectedClient.company || 'Sem empresa vinculada'}
                  </p>
                </div>

                {/* Ações da base (6 botões) - Reduzidos */}
                <div className="flex justify-center gap-2.5 mt-5 border-t border-white/5 pt-4">
                  <Link 
                    to={`/app/clients/${selectedClient.id}/edit`}
                    className={`${CARD_ACTION_BASE_CLASS} border-sky-300/20 bg-sky-400/10 text-sky-200 hover:border-sky-300/45 hover:bg-sky-500 hover:text-white`}
                    title="Editar Cadastro"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                    </svg>
                  </Link>

                  {selectedClient.email ? (
                    <a 
                      href={`mailto:${selectedClient.email}`}
                      className={`${CARD_ACTION_BASE_CLASS} ${selectedEmailProvider.buttonClassName}`}
                      title={`Enviar E-mail (${selectedEmailProvider.label})`}
                    >
                      <EmailProviderIcon email={selectedClient.email} />
                    </a>
                  ) : (
                    <button type="button" onClick={() => startInlineEdit('email')} className={CARD_ACTION_MUTED_CLASS} title="Adicionar e-mail">
                      <EmailProviderIcon dimmed />
                    </button>
                  )}

                  {selectedClient.phone ? (
                    <a 
                      href={`tel:${selectedClient.phone}`}
                      className={`${CARD_ACTION_BASE_CLASS} border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:border-cyan-300/45 hover:bg-cyan-500 hover:text-white`}
                      title="Ligar"
                    >
                      <PhoneSolidIcon />
                    </a>
                  ) : (
                    <button type="button" onClick={() => startInlineEdit('phone')} className={CARD_ACTION_MUTED_CLASS} title="Adicionar telefone">
                      <PhoneSolidIcon dimmed />
                    </button>
                  )}

                  <button 
                    type="button"
                    onClick={() => openActionPanel('note')}
                    className={`${CARD_ACTION_BASE_CLASS} border-indigo-300/20 bg-indigo-400/10 text-indigo-200 hover:border-indigo-300/45 hover:bg-indigo-500 hover:text-white`}
                    title="Adicionar Nota / Atividade"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                      <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>

                  <button 
                    type="button"
                    onClick={() => openActionPanel('schedule')}
                    className={`${CARD_ACTION_BASE_CLASS} border-amber-300/20 bg-amber-400/10 text-amber-200 hover:border-amber-300/45 hover:bg-amber-500 hover:text-white`}
                    title="Agendar Próximo Contato"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </button>

                  <button 
                    type="button"
                    onClick={() => openActionPanel('history')}
                    className={`${CARD_ACTION_BASE_CLASS} border-slate-300/20 bg-slate-400/10 text-slate-200 hover:border-slate-300/45 hover:bg-slate-500 hover:text-white`}
                    title="Histórico de Contatos"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                      <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </button>
                </div>

                {cardNotice ? (
                  <div className={`mt-4 rounded-[16px] border px-4 py-3 text-left text-xs font-semibold ${
                    cardNotice.type === 'error'
                      ? 'border-dn-danger/30 bg-dn-danger-bg text-dn-danger'
                      : 'border-dn-success/25 bg-dn-success-bg text-dn-success'
                  }`}>
                    {cardNotice.text}
                  </div>
                ) : null}

                {activePanel === 'relations' ? (
                  <div className="mt-4 rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4 text-left">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-dn-text-muted">Relações</h5>
                    <div className="mt-3 grid gap-2 text-xs text-dn-text-secondary">
                      <p>Empresa: <span className="font-semibold text-white">{selectedClient.company || 'Sem empresa vinculada'}</span></p>
                      <p>Documento: <span className="font-semibold text-white">{selectedClient.document_number || 'Não informado'}</span></p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>Tags:</span>
                        {selectedClient.tags?.length ? (
                          selectedClient.tags.map((tag) => (
                            <span key={tag.id} className="rounded-full border border-dn-accent/20 bg-dn-accent/10 px-2 py-0.5 text-[10px] font-semibold text-dn-accent">
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="font-semibold text-white">Nenhuma tag</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => navigate(`/app/clients/${selectedClient.id}`)} className="h-8 text-xs">
                        Ver detalhes
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={handleCopyContact} className="h-8 text-xs">
                        Copiar contato
                      </Button>
                    </div>
                  </div>
                ) : null}

                {activePanel === 'note' ? (
                  <form className="mt-4 rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4 text-left" onSubmit={handleNotesSubmit}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dn-text-muted">Nota / Atividade</label>
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="Registre uma observação, combinado ou próxima ação..."
                      className="mt-3 min-h-[92px] w-full resize-none rounded-[14px] border border-white/10 bg-[#0d1728] px-3 py-2 text-sm text-white outline-none transition-all placeholder:text-dn-text-muted focus:border-dn-accent/50"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setActivePanel(null)} className="h-8 text-xs">
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={savingField === 'notes'} className="h-8 text-xs">
                        {savingField === 'notes' ? 'Salvando...' : 'Salvar nota'}
                      </Button>
                    </div>
                  </form>
                ) : null}

                {activePanel === 'schedule' ? (
                  <form className="mt-4 rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4 text-left" onSubmit={handleScheduleSubmit}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dn-text-muted">Próximo contato</label>
                    <div className="mt-3 space-y-2">
                      <Input type="text" value={scheduleForm.title} onChange={(event) => setScheduleForm((current) => ({ ...current, title: event.target.value }))} placeholder="Título" className="h-9 text-xs" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={scheduleForm.date} onChange={(event) => setScheduleForm((current) => ({ ...current, date: event.target.value }))} className="h-9 text-xs" />
                        <Input type="time" value={scheduleForm.time} onChange={(event) => setScheduleForm((current) => ({ ...current, time: event.target.value }))} className="h-9 text-xs" />
                      </div>
                      <Select value={scheduleForm.type} onChange={(event) => setScheduleForm((current) => ({ ...current, type: event.target.value }))} className="h-9 text-xs">
                        <option value="Ligação" className="bg-dn-bg-elevated text-dn-text-primary">Ligação</option>
                        <option value="Reunião" className="bg-dn-bg-elevated text-dn-text-primary">Reunião</option>
                        <option value="Follow-up" className="bg-dn-bg-elevated text-dn-text-primary">Follow-up</option>
                      </Select>
                      <textarea
                        value={scheduleForm.description}
                        onChange={(event) => setScheduleForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Descrição"
                        className="min-h-[72px] w-full resize-none rounded-[14px] border border-white/10 bg-[#0d1728] px-3 py-2 text-sm text-white outline-none transition-all placeholder:text-dn-text-muted focus:border-dn-accent/50"
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setActivePanel(null)} className="h-8 text-xs">
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={savingField === 'schedule'} className="h-8 text-xs">
                        {savingField === 'schedule' ? 'Agendando...' : 'Agendar'}
                      </Button>
                    </div>
                  </form>
                ) : null}

                {activePanel === 'history' ? (
                  <div className="mt-4 rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-4 text-left">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-dn-text-muted">Histórico do contato</h5>
                    <div className="mt-3 space-y-2 text-xs text-dn-text-secondary">
                      <p>Criado em: <span className="font-semibold text-white">{formatDateTime(selectedClient.created_at)}</span></p>
                      <p>Última atualização: <span className="font-semibold text-white">{formatDateTime(selectedClient.updated_at)}</span></p>
                      <div>
                        <span className="font-semibold text-dn-text-muted">Notas</span>
                        <p className="mt-1 whitespace-pre-wrap rounded-[14px] border border-white/5 bg-[#0d1728] p-3 text-white">
                          {selectedClient.notes || 'Nenhuma nota registrada.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" size="sm" variant="ghost" onClick={() => openActionPanel('note')} className="h-8 text-xs">
                        {selectedClient.notes ? 'Editar nota' : 'Adicionar nota'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 2. PAINEL DE INFORMAÇÕES DETALHADAS (INFERIOR) - Compacto */}
              <div className="bg-gradient-to-b from-[#162236]/80 to-[#101b30]/95 border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.5)] rounded-[32px] p-5 space-y-5">
                <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                  <h4 className="text-base font-bold text-white">Informações Detalhadas</h4>
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => startInlineEdit('firstName')} className={MINI_ICON_BUTTON_CLASS} title="Editar informações">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                      </svg>
                    </button>
                    <Link to={`/app/clients/${selectedClient.id}`} className={MINI_ICON_BUTTON_CLASS} title="Ver Detalhes">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline>
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Campos com o estilo do Figma */}
                <div className="grid grid-cols-1 gap-y-3.5">
                  {/* Primeiro Nome */}
                  <div className="flex items-center justify-between py-0.5 border-b border-white/[0.03] last:border-none">
                    <div className="flex items-start gap-3">
                      <div className={FIELD_ICON_CLASS}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-dn-text-muted uppercase tracking-wider font-bold">Primeiro Nome</span>
                        {renderEditableValue('firstName', selectedNameParts.firstName, 'Primeiro nome')}
                      </div>
                    </div>
                    {editingField === 'firstName' ? null : renderInlineEditButton('firstName', 'Alterar primeiro nome')}
                  </div>

                  {/* Sobrenome */}
                  <div className="flex items-center justify-between py-0.5 border-b border-white/[0.03] last:border-none">
                    <div className="flex items-start gap-3">
                      <div className={FIELD_ICON_CLASS}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-dn-text-muted uppercase tracking-wider font-bold">Sobrenome</span>
                        {renderEditableValue('lastName', selectedNameParts.lastName, 'Sobrenome')}
                      </div>
                    </div>
                    {editingField === 'lastName' ? null : renderInlineEditButton('lastName', 'Alterar sobrenome')}
                  </div>

                  {/* E-mail */}
                  <div className="flex items-center justify-between py-0.5 border-b border-white/[0.03] last:border-none">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={FIELD_ICON_CLASS}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-dn-text-muted uppercase tracking-wider font-bold">E-mail</span>
                        {renderEditableValue('email', selectedClient.email || 'Não informado', 'email@empresa.com', 'email')}
                      </div>
                    </div>
                    {editingField === 'email' ? null : renderInlineEditButton('email', selectedClient.email ? 'Alterar e-mail' : 'Adicionar e-mail')}
                  </div>

                  {/* Telefone */}
                  <div className="flex items-center justify-between py-0.5 border-b border-white/[0.03] last:border-none">
                    <div className="flex items-start gap-3">
                      <div className={FIELD_ICON_CLASS}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-dn-text-muted uppercase tracking-wider font-bold">Telefone</span>
                        {renderEditableValue('phone', selectedClient.phone || 'Não informado', '+55 11 99999-9999', 'tel')}
                      </div>
                    </div>
                    {editingField === 'phone' ? null : renderInlineEditButton('phone', selectedClient.phone ? 'Alterar telefone' : 'Adicionar telefone')}
                  </div>

                  {/* Canais / Integrados */}
                  <div className="flex items-center justify-between py-0.5 border-b border-white/[0.03] last:border-none">
                    <div className="flex items-start gap-3">
                      <div className={FIELD_ICON_CLASS}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-dn-text-muted uppercase tracking-wider font-bold">Canais</span>
                        <div className="flex items-center gap-2.5 mt-2">
                          {/* WhatsApp */}
                          {selectedClient.phone ? (
                            <a href={`https://wa.me/${selectedClient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={`${CHANNEL_ACTION_BASE_CLASS} border-emerald-400/25 bg-emerald-500/15 text-emerald-300 hover:border-emerald-300/50 hover:bg-emerald-500 hover:text-white`} title="WhatsApp">
                              <WhatsAppBrandIcon />
                            </a>
                          ) : (
                            <button type="button" onClick={() => startInlineEdit('phone')} className={CHANNEL_MUTED_BUTTON_CLASS} title="Adicionar telefone para WhatsApp">
                              <WhatsAppBrandIcon dimmed />
                            </button>
                          )}
                          {selectedClient.email ? (
                            <a href={`mailto:${selectedClient.email}`} className={`${CHANNEL_ACTION_BASE_CLASS} ${selectedEmailProvider.buttonClassName}`} title={`E-mail (${selectedEmailProvider.label})`}>
                              <EmailProviderIcon email={selectedClient.email} />
                            </a>
                          ) : (
                            <button type="button" onClick={() => startInlineEdit('email')} className={CHANNEL_MUTED_BUTTON_CLASS} title="Adicionar e-mail">
                              <EmailProviderIcon dimmed />
                            </button>
                          )}
                          {selectedClient.phone ? (
                            <a href={`tel:${selectedClient.phone}`} className={`${CHANNEL_ACTION_BASE_CLASS} border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:border-cyan-300/45 hover:bg-cyan-500 hover:text-white`} title="Telefone">
                              <PhoneSolidIcon />
                            </a>
                          ) : (
                            <button type="button" onClick={() => startInlineEdit('phone')} className={CHANNEL_MUTED_BUTTON_CLASS} title="Adicionar telefone">
                              <PhoneSolidIcon dimmed />
                            </button>
                          )}
                          <button type="button" onClick={handleCopyContact} className={`${CHANNEL_ACTION_BASE_CLASS} border-violet-300/20 bg-violet-400/10 text-violet-200 hover:border-violet-300/45 hover:bg-violet-500 hover:text-white`} title="Copiar contato">
                            <CopySolidIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Último Contato */}
                  <div className="flex items-center justify-between py-0.5 border-b border-white/[0.03] last:border-none">
                    <div className="flex items-start gap-3">
                      <div className={FIELD_ICON_CLASS}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                      <div>
                        <span className="text-[9px] text-dn-text-muted uppercase tracking-wider font-bold">Criado Em</span>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          {formatDateTime(selectedClient.created_at)}
                        </p>
                      </div>
                    </div>
                    <Link to={`/app/clients/${selectedClient.id}`} className={INLINE_EDIT_BUTTON_CLASS}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-dn-bg-card border border-white/5 rounded-[32px] p-10 text-center text-dn-text-secondary shadow-lg">
              Nenhum cliente selecionado. Selecione um cliente na lista ao lado para ver os detalhes.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ClientsListPage
