import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { generateCurrentMonthInvoices, getFinanceSummary } from '../lib/finance.js'
import { getAlertCounts } from '../lib/alerts.js'

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
    payableTotal: 0,
    predictedIncoming: 0,
    predictedOutgoing: 0,
    predictedBalance: 0,
    overdueCount: 0,
    overdueTotal: 0,
    upcomingInvoices: [],
  })
  const [alertSummary, setAlertSummary] = useState({
    overdueInvoices: 0,
    overdueExpenses: 0,
    overdueTasks: 0,
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
      const [data, alerts] = await Promise.all([
        getFinanceSummary({ ownerId }),
        getAlertCounts({ ownerId }),
      ])
      setSummary(data)
      setAlertSummary({
        overdueInvoices: alerts.overdueInvoices,
        overdueExpenses: alerts.overdueExpenses,
        overdueTasks: alerts.overdueTasks,
      })
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
        `Mes ${result.referenceMonth}: ${result.createdCount} cobranca(s) criada(s), ${result.skippedCount} ignorada(s).`,
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
            Recorrencias, cobrancas, despesas e indicadores basicos de fluxo de caixa.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerateCurrentMonth}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Gerando...' : 'Gerar mes atual'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/app/finance/recurrences"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Ver recorrencias
        </Link>
        <Link
          to="/app/finance/invoices"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Ver cobrancas
        </Link>
        <Link
          to="/app/finance/expenses"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Ver despesas
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
            <p className="text-sm text-slate-600">Inadimplencia</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {summary.overdueCount} | {formatCurrency(summary.overdueTotal)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Total a pagar</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(summary.payableTotal)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Saldo previsto</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(summary.predictedBalance)}
            </p>
          </article>
        </div>
      ) : null}

      {!loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-900">Previsao</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <article className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Entradas previstas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatCurrency(summary.predictedIncoming)}
              </p>
            </article>
            <article className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Saidas previstas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatCurrency(summary.predictedOutgoing)}
              </p>
            </article>
            <article className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Saldo previsto</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatCurrency(summary.predictedBalance)}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Resumo de alertas</h3>
            <Link
              to="/app/alerts"
              className="text-sm font-medium text-slate-700 underline"
            >
              Ver alertas
            </Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <article className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Cobrancas vencidas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {alertSummary.overdueInvoices}
              </p>
            </article>
            <article className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Despesas vencidas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {alertSummary.overdueExpenses}
              </p>
            </article>
            <article className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Tarefas atrasadas</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {alertSummary.overdueTasks}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-900">Proximos vencimentos</h3>
          {summary.upcomingInvoices.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Sem cobrancas pendentes no momento.</p>
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
