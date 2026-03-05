import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  deleteRecurrence,
  generateCurrentMonthInvoices,
  listRecurrences,
} from '../lib/finance.js'

const RECURRENCE_STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  canceled: 'Cancelado',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

function RecurrencesListPage() {
  const { user } = useAuth()
  const ownerId = user?.id

  const [recurrences, setRecurrences] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resultMessage, setResultMessage] = useState('')

  const loadRecurrences = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await listRecurrences({ ownerId })
      setRecurrences(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadRecurrences()
  }, [loadRecurrences])

  const handleDeleteRecurrence = async (recurrence) => {
    if (!ownerId) return

    const confirmed = window.confirm(`Excluir recorrencia do cliente "${recurrence.client_name}"?`)
    if (!confirmed) return

    setSaving(true)
    setError('')
    setResultMessage('')

    try {
      await deleteRecurrence({
        ownerId,
        recurrenceId: recurrence.id,
      })
      await loadRecurrences()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateCurrentMonth = async () => {
    if (!ownerId) return

    setSaving(true)
    setError('')
    setResultMessage('')

    try {
      const result = await generateCurrentMonthInvoices({ ownerId })
      setResultMessage(
        `Mês ${result.referenceMonth}: ${result.createdCount} cobrança(s) criada(s), ${result.skippedCount} ignorada(s).`,
      )
    } catch (generateError) {
      setError(generateError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Recorrências</h2>
          <p className="mt-1 text-sm text-slate-600">Gestão de contratos recorrentes por cliente.</p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/app/finance"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Voltar para Financeiro
          </Link>
          <button
            type="button"
            onClick={handleGenerateCurrentMonth}
            disabled={saving}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {saving ? 'Gerando...' : 'Gerar mês atual'}
          </button>
          <Link
            to="/app/finance/recurrences/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Nova recorrência
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando recorrências...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {resultMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {resultMessage}
        </p>
      ) : null}

      {!loading && !error && recurrences.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhuma recorrência cadastrada.</p>
        </div>
      ) : null}

      {!loading && !error && recurrences.length > 0 ? (
        <ul className="space-y-3">
          {recurrences.map((recurrence) => (
            <li
              key={recurrence.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{recurrence.client_name}</h3>
                  <p className="text-sm text-slate-600">
                    Valor: {formatCurrency(recurrence.value)} | Dia do vencimento: {recurrence.due_day}
                  </p>
                  <p className="text-xs text-slate-500">
                    Início: {recurrence.start_date} | Status:{' '}
                    {RECURRENCE_STATUS_LABELS[recurrence.status] ?? recurrence.status}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/app/finance/recurrences/${recurrence.id}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecurrence(recurrence)}
                    disabled={saving}
                    className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default RecurrencesListPage
