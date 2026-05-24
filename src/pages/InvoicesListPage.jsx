import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlerts } from '../context/AlertsContext.jsx'
import {
  INVOICE_FILTER_STATUSES,
  PAYMENT_METHOD_OPTIONS,
  listFinanceClients,
  listInvoices,
  markInvoiceAsPaid,
} from '../lib/finance.js'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const INVOICE_STATUS_LABELS = {
  all: 'Todos',
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  canceled: 'Cancelado',
}

const PAYMENT_METHOD_LABELS = {
  pix: 'Pix',
  boleto: 'Boleto',
  transfer: 'Transferência',
  card: 'Cartão',
  cash: 'Dinheiro',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

function getBadgeVariant(status) {
  if (status === 'paid') return 'success'
  if (status === 'overdue') return 'danger'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

function getInvoiceStatusLabel(status) {
  return INVOICE_STATUS_LABELS[status] ?? status
}

function InvoicesListPage() {
  const { user } = useAuth()
  const ownerId = user?.id
  const { refresh: refreshAlerts } = useAlerts()

  const [clients, setClients] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingInvoiceId, setSavingInvoiceId] = useState('')
  const [error, setError] = useState('')

  const [statusInput, setStatusInput] = useState('all')
  const [clientInput, setClientInput] = useState('all')
  const [referenceMonthInput, setReferenceMonthInput] = useState('')
  const [paymentMethodsByInvoice, setPaymentMethodsByInvoice] = useState({})
  const [appliedFilters, setAppliedFilters] = useState({
    status: 'all',
    clientId: 'all',
    referenceMonth: '',
  })

  const loadClients = useCallback(async () => {
    if (!ownerId) return

    try {
      const data = await listFinanceClients({ ownerId })
      setClients(data)
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [ownerId])

  const loadInvoices = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await listInvoices({
        ownerId,
        status: appliedFilters.status,
        clientId: appliedFilters.clientId,
        referenceMonth: appliedFilters.referenceMonth,
      })

      setInvoices(data)
      setPaymentMethodsByInvoice((current) => {
        const next = { ...current }
        for (const invoice of data) {
          if (!next[invoice.id]) {
            next[invoice.id] = invoice.payment_method ?? 'pix'
          }
        }
        return next
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters.clientId, appliedFilters.referenceMonth, appliedFilters.status, ownerId])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const activeClientName = useMemo(() => {
    if (appliedFilters.clientId === 'all') return null
    return clients.find((client) => client.id === appliedFilters.clientId)?.name ?? null
  }, [appliedFilters.clientId, clients])

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters({
      status: statusInput,
      clientId: clientInput,
      referenceMonth: referenceMonthInput.trim(),
    })
  }

  const handleResetFilters = () => {
    setStatusInput('all')
    setClientInput('all')
    setReferenceMonthInput('')
    setAppliedFilters({
      status: 'all',
      clientId: 'all',
      referenceMonth: '',
    })
  }

  const handleMarkAsPaid = async (invoice) => {
    if (!ownerId) return

    const paymentMethod = paymentMethodsByInvoice[invoice.id] ?? 'pix'

    setSavingInvoiceId(invoice.id)
    setError('')

    try {
      await markInvoiceAsPaid({
        ownerId,
        invoiceId: invoice.id,
        paymentMethod,
      })
      await loadInvoices()
      refreshAlerts()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingInvoiceId('')
    }
  }

  const handleWhatsAppCharge = (invoice) => {
    const dateParts = invoice.due_date ? invoice.due_date.split('-') : [];
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : invoice.due_date;

    const text = `Olá ${invoice.client_name}, verificamos que a fatura no valor de ${formatCurrency(invoice.value)} com vencimento em ${formattedDate} encontra-se em aberto. Poderia verificar, por favor?`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg">
        <div>
          <h2 className="text-[24px] font-semibold text-white tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-dn-accent/20 flex items-center justify-center text-dn-accent">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            </div>
            Cobranças
          </h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">
            Lista de cobranças emitidas. Gerencie vencimentos e faça baixas manuais.
          </p>
        </div>
        <Link to="/app/finance">
          <Button variant="ghost">Voltar para Financeiro</Button>
        </Link>
      </div>

      {/* FILTROS */}
      <form
        onSubmit={handleApplyFilters}
        className="grid gap-4 rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-6 shadow-lg md:grid-cols-4 items-end"
      >
        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">STATUS</label>
          <Select
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
          >
            {INVOICE_FILTER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getInvoiceStatusLabel(status)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">CLIENTE</label>
          <Select
            value={clientInput}
            onChange={(event) => setClientInput(event.target.value)}
          >
            <option value="all">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">MÊS DE REFERÊNCIA</label>
          <Input
            type="text"
            value={referenceMonthInput}
            onChange={(event) => setReferenceMonthInput(event.target.value)}
            placeholder="YYYY-MM"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Filtrar
          </Button>
          <Button type="button" variant="ghost" onClick={handleResetFilters}>
            Limpar
          </Button>
        </div>
      </form>

      {appliedFilters.status !== 'all' || activeClientName || appliedFilters.referenceMonth ? (
        <div className="flex items-center gap-2 text-dn-caption text-dn-text-secondary bg-dn-bg-card/50 px-4 py-2 rounded-dn-md border-[0.5px] border-dn-border inline-flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          Filtros ativos:
          {appliedFilters.status !== 'all' && <span className="text-white bg-white/5 px-2 py-0.5 rounded ml-1">{getInvoiceStatusLabel(appliedFilters.status)}</span>}
          {activeClientName && <span className="text-white bg-white/5 px-2 py-0.5 rounded ml-1">{activeClientName}</span>}
          {appliedFilters.referenceMonth && <span className="text-white bg-white/5 px-2 py-0.5 rounded ml-1">{appliedFilters.referenceMonth}</span>}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-dn-md border-[0.5px] border-dn-danger/50 bg-[#161B26] p-4 text-sm text-dn-danger">{error}</p>
      ) : null}

      {loading ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-8 animate-dn-shimmer text-center">
          <p className="text-dn-body text-dn-text-muted">Carregando cobranças...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-12 text-center opacity-70">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 text-dn-text-muted mx-auto mb-4"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <p className="text-dn-body text-dn-text-muted">Nenhuma cobrança encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => {
            const canMarkAsPaid =
              invoice.display_status === 'pending' || invoice.display_status === 'overdue'

            return (
              <article key={invoice.id} className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-dn-border-hover relative overflow-hidden group">
                {invoice.display_status === 'overdue' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-dn-danger"></div>
                )}
                {invoice.display_status === 'paid' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-dn-success"></div>
                )}
                
                <div className="flex-1 ml-2">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white">{invoice.client_name}</h3>
                    <Badge variant={getBadgeVariant(invoice.display_status)}>
                      {getInvoiceStatusLabel(invoice.display_status)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-dn-body text-dn-text-secondary">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Valor</span>
                      <span className="font-mono text-white text-lg">{formatCurrency(invoice.value)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Vencimento</span>
                      <span className="font-medium text-white">{invoice.due_date ? invoice.due_date.split('-').reverse().join('/') : '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Ref / Método</span>
                      <span>
                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-xs mr-2">{invoice.reference_month ?? '-'}</span>
                        {invoice.payment_method ? PAYMENT_METHOD_LABELS[invoice.payment_method] ?? invoice.payment_method : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {canMarkAsPaid ? (
                  <div className="flex flex-col sm:flex-row items-end gap-3 bg-dn-bg-elevated p-4 rounded-dn-lg border-[0.5px] border-dn-border w-full md:w-auto">
                    <div className="w-full sm:w-auto">
                      <label className="block text-[10px] text-dn-text-muted uppercase tracking-wider mb-1.5">MÉTODO DE RECEBIMENTO</label>
                      <Select
                        value={paymentMethodsByInvoice[invoice.id] ?? 'pix'}
                        onChange={(event) =>
                          setPaymentMethodsByInvoice((current) => ({
                            ...current,
                            [invoice.id]: event.target.value,
                          }))
                        }
                        className="h-9 min-w-[140px]"
                      >
                        {PAYMENT_METHOD_OPTIONS.map((method) => (
                          <option key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method] ?? method}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        onClick={() => handleMarkAsPaid(invoice)}
                        disabled={savingInvoiceId === invoice.id}
                        className="flex-1 sm:flex-none h-9 whitespace-nowrap bg-dn-success text-black hover:bg-dn-success/90"
                      >
                        {savingInvoiceId === invoice.id ? 'SALVANDO...' : 'MARCAR COMO PAGO'}
                      </Button>
                      
                      {invoice.display_status === 'overdue' && (
                        <Button 
                          type="button"
                          onClick={() => handleWhatsAppCharge(invoice)}
                          title="Cobrar via WhatsApp"
                          className="h-9 px-3 bg-[#25D366] hover:bg-[#128C7E] text-white border-none shadow-[0_0_10px_rgba(37,211,102,0.2)] hover:shadow-[0_0_15px_rgba(37,211,102,0.4)] transition-all"
                        >
                          <IconWhatsApp />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default InvoicesListPage
