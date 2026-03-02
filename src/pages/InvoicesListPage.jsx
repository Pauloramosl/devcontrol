import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  INVOICE_FILTER_STATUSES,
  PAYMENT_METHOD_OPTIONS,
  listFinanceClients,
  listInvoices,
  markInvoiceAsPaid,
} from '../lib/finance.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

function statusColor(status) {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-800'
  if (status === 'overdue') return 'bg-red-100 text-red-800'
  if (status === 'pending') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function InvoicesListPage() {
  const { user } = useAuth()
  const ownerId = user?.id

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
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingInvoiceId('')
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Cobrancas</h2>
        <p className="mt-1 text-sm text-slate-600">
          Lista de invoices com overdue derivado e baixa manual de pagamento.
        </p>
      </div>

      <form
        onSubmit={handleApplyFilters}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4"
      >
        <label className="block text-sm text-slate-700">
          Status
          <select
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            {INVOICE_FILTER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Cliente
          <select
            value={clientInput}
            onChange={(event) => setClientInput(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">all</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Mes referencia
          <input
            type="text"
            value={referenceMonthInput}
            onChange={(event) => setReferenceMonthInput(event.target.value)}
            placeholder="YYYY-MM"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            Limpar
          </button>
        </div>
      </form>

      {appliedFilters.status !== 'all' || activeClientName || appliedFilters.referenceMonth ? (
        <p className="text-sm text-slate-500">
          Filtros ativos:
          {appliedFilters.status !== 'all' ? ` status="${appliedFilters.status}"` : ''}
          {activeClientName ? ` cliente="${activeClientName}"` : ''}
          {appliedFilters.referenceMonth ? ` referencia="${appliedFilters.referenceMonth}"` : ''}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando cobrancas...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && !error && invoices.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhuma cobranca encontrada.</p>
        </div>
      ) : null}

      {!loading && !error && invoices.length > 0 ? (
        <ul className="space-y-3">
          {invoices.map((invoice) => {
            const canMarkAsPaid =
              invoice.display_status === 'pending' || invoice.display_status === 'overdue'

            return (
              <li key={invoice.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{invoice.client_name}</h3>
                    <p className="text-sm text-slate-600">
                      Valor: {formatCurrency(invoice.value)} | Due: {invoice.due_date}
                    </p>
                    <p className="text-xs text-slate-500">
                      Ref: {invoice.reference_month ?? '-'} | Metodo: {invoice.payment_method ?? '-'}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(invoice.display_status)}`}
                      >
                        {invoice.display_status}
                      </span>
                    </div>
                  </div>

                  {canMarkAsPaid ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="text-xs text-slate-600">
                        Metodo
                        <select
                          value={paymentMethodsByInvoice[invoice.id] ?? 'pix'}
                          onChange={(event) =>
                            setPaymentMethodsByInvoice((current) => ({
                              ...current,
                              [invoice.id]: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        >
                          {PAYMENT_METHOD_OPTIONS.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleMarkAsPaid(invoice)}
                        disabled={savingInvoiceId === invoice.id}
                        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {savingInvoiceId === invoice.id ? 'Salvando...' : 'Marcar como pago'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

export default InvoicesListPage
