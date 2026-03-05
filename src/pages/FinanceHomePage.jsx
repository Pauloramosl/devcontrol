import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { generateCurrentMonthInvoices, getFinanceSummary } from '../lib/finance.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

function FinanceHomePage() {
  const { user } = useAuth()
  const ownerId = user?.id

  const [summary, setSummary] = useState({
    mrr: 0,
    receivableTotal: 0,
    overdueCount: 0,
    overdueTotal: 0,
    upcomingInvoices: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generateMessage, setGenerateMessage] = useState('')

  const loadSummary = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await getFinanceSummary({ ownerId })
      setSummary(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const handleGenerateCurrentMonth = async () => {
    if (!ownerId) return

    setSaving(true)
    setError('')
    setGenerateMessage('')

    try {
      const result = await generateCurrentMonthInvoices({ ownerId })
      setGenerateMessage(
        `Mês ${result.referenceMonth}: ${result.createdCount} cobrança(s) criada(s), ${result.skippedCount} ignorada(s).`,
      )
      await loadSummary()
    } catch (generateError) {
      setError(generateError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Financeiro</h2>
          <p className="mt-1 text-sm text-slate-600">
            Recorrências, cobranças e indicadores básicos do caixa.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerateCurrentMonth}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Gerando...' : 'Gerar mês atual'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/app/finance/recurrences"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Ver recorrências
        </Link>
        <Link
          to="/app/finance/invoices"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Ver cobranças
        </Link>
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando resumo financeiro...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {generateMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {generateMessage}
        </p>
      ) : null}

      {!loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">MRR</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(summary.mrr)}</p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Total a receber</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(summary.receivableTotal)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Inadimplência</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {summary.overdueCount} | {formatCurrency(summary.overdueTotal)}
            </p>
          </article>
        </div>
      ) : null}

      {!loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-900">Próximos vencimentos</h3>
          {summary.upcomingInvoices.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Sem cobranças pendentes no momento.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {summary.upcomingInvoices.map((invoice) => (
                <li key={invoice.id} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">{invoice.client_name}</p>
                  <p className="text-xs text-slate-500">
                    Vencimento: {invoice.due_date ?? '-'} | Valor: {formatCurrency(invoice.value)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </section>
  )
}

export default FinanceHomePage
