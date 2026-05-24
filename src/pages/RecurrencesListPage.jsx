import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlerts } from '../context/AlertsContext.jsx'
import {
  deleteRecurrence,
  generateCurrentMonthInvoices,
  listRecurrences,
} from '../lib/finance.js'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const RECURRENCE_STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  canceled: 'Cancelado',
}

function getBadgeVariant(status) {
  if (status === 'active') return 'success'
  if (status === 'canceled') return 'danger'
  if (status === 'paused') return 'warning'
  return 'neutral'
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
  const { refresh: refreshAlerts } = useAlerts()

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

    const confirmed = window.confirm(`Excluir recorrência do cliente "${recurrence.client_name}"?`)
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
      refreshAlerts()
    } catch (generateError) {
      setError(generateError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg">
        <div>
          <h2 className="text-[24px] font-semibold text-white tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-dn-accent/20 flex items-center justify-center text-dn-accent">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            </div>
            Recorrências
          </h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">Gestão de contratos recorrentes por cliente.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/app/finance">
            <Button variant="ghost">Voltar para Financeiro</Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateCurrentMonth}
            disabled={saving}
          >
            {saving ? 'Gerando...' : 'Gerar mês atual'}
          </Button>
          <Link to="/app/finance/recurrences/new">
            <Button>Nova recorrência</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-8 animate-dn-shimmer text-center">
          <p className="text-dn-body text-dn-text-muted">Carregando recorrências...</p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-dn-md border-[0.5px] border-dn-danger/50 bg-[#161B26] p-4 text-sm text-dn-danger">{error}</p>
      ) : null}

      {resultMessage ? (
        <p className="rounded-dn-md border-[0.5px] border-dn-success/50 bg-[#10241A] p-4 text-sm text-dn-success">{resultMessage}</p>
      ) : null}

      {!loading && !error && recurrences.length === 0 ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-12 text-center opacity-70">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 text-dn-text-muted mx-auto mb-4"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <p className="text-dn-body text-dn-text-muted">Nenhuma recorrência cadastrada.</p>
        </div>
      ) : null}

      {!loading && !error && recurrences.length > 0 ? (
        <div className="grid gap-4">
          {recurrences.map((recurrence) => (
            <article
              key={recurrence.id}
              className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-dn-border-hover relative overflow-hidden group"
            >
              {recurrence.status === 'active' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-dn-success"></div>
              )}
              {recurrence.status === 'canceled' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-dn-danger"></div>
              )}
              {recurrence.status === 'paused' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-dn-warning"></div>
              )}

              <div className="flex-1 ml-2">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-white">{recurrence.client_name}</h3>
                  <Badge variant={getBadgeVariant(recurrence.status)}>
                    {RECURRENCE_STATUS_LABELS[recurrence.status] ?? recurrence.status}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-dn-body text-dn-text-secondary">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Valor</span>
                    <span className="font-mono text-white text-lg">{formatCurrency(recurrence.value)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Dia do vencimento</span>
                    <span className="font-medium text-white">{recurrence.due_day}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Início</span>
                    <span className="font-medium text-white">{recurrence.start_date ? recurrence.start_date.split('-').reverse().join('/') : '-'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end gap-3 bg-dn-bg-elevated p-4 rounded-dn-lg border-[0.5px] border-dn-border w-full md:w-auto">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Link to={`/app/finance/recurrences/${recurrence.id}`} className="flex-1 sm:flex-none">
                    <Button variant="outline" className="w-full">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleDeleteRecurrence(recurrence)}
                    disabled={saving}
                    className="flex-1 sm:flex-none"
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default RecurrencesListPage
