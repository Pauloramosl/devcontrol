import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlerts } from '../context/AlertsContext.jsx'
import {
  EXPENSE_FILTER_STATUSES,
  listExpenses,
  markExpenseAsPaid,
  markExpenseAsPending,
} from '../lib/finance.js'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'

const EXPENSE_STATUS_LABELS = {
  all: 'Todas',
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  canceled: 'Cancelado',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

function getExpenseStatusLabel(status) {
  return EXPENSE_STATUS_LABELS[status] ?? status
}

function getBadgeVariant(status) {
  if (status === 'paid') return 'success'
  if (status === 'overdue') return 'danger'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

function ExpensesListPage() {
  const { user } = useAuth()
  const ownerId = user?.id
  const { refresh: refreshAlerts } = useAlerts()

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingExpenseId, setSavingExpenseId] = useState('')
  const [error, setError] = useState('')

  const [statusInput, setStatusInput] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({
    status: 'all',
    searchTerm: '',
    category: '',
  })

  const loadExpenses = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await listExpenses({
        ownerId,
        status: appliedFilters.status,
        searchTerm: appliedFilters.searchTerm,
        category: appliedFilters.category,
      })
      setExpenses(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters.category, appliedFilters.searchTerm, appliedFilters.status, ownerId])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters({
      status: statusInput,
      searchTerm: searchInput.trim(),
      category: categoryInput.trim(),
    })
  }

  const handleResetFilters = () => {
    setStatusInput('all')
    setSearchInput('')
    setCategoryInput('')
    setAppliedFilters({
      status: 'all',
      searchTerm: '',
      category: '',
    })
  }

  const handleMarkAsPaid = async (expenseId) => {
    if (!ownerId) return

    setSavingExpenseId(expenseId)
    setError('')

    try {
      await markExpenseAsPaid({
        ownerId,
        expenseId,
      })
      await loadExpenses()
      refreshAlerts()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingExpenseId('')
    }
  }

  const handleMarkAsPending = async (expenseId) => {
    if (!ownerId) return

    setSavingExpenseId(expenseId)
    setError('')

    try {
      await markExpenseAsPending({
        ownerId,
        expenseId,
      })
      await loadExpenses()
      refreshAlerts()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingExpenseId('')
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
            Despesas
          </h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">Contas a pagar com status e filtros básicos.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/finance">
            <Button variant="ghost">Voltar para Financeiro</Button>
          </Link>
          <Link to="/app/finance/expenses/new">
            <Button>Nova despesa</Button>
          </Link>
        </div>
      </div>

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
            {EXPENSE_FILTER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getExpenseStatusLabel(status)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">BUSCA POR DESCRIÇÃO</label>
          <Input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Ex: internet"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">CATEGORIA</label>
          <Input
            type="text"
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder="Ex: Operacional"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">
            Aplicar
          </Button>
          <Button type="button" variant="ghost" onClick={handleResetFilters}>
            Limpar
          </Button>
        </div>
      </form>

      {error ? (
        <p className="rounded-dn-md border-[0.5px] border-dn-danger/50 bg-[#161B26] p-4 text-sm text-dn-danger">{error}</p>
      ) : null}

      {loading ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-8 animate-dn-shimmer text-center">
          <p className="text-dn-body text-dn-text-muted">Carregando despesas...</p>
        </div>
      ) : null}

      {!loading && !error && expenses.length === 0 ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-12 text-center opacity-70">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 text-dn-text-muted mx-auto mb-4"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <p className="text-dn-body text-dn-text-muted">Nenhuma despesa encontrada com os filtros atuais.</p>
        </div>
      ) : null}

      {!loading && !error && expenses.length > 0 ? (
        <div className="grid gap-4">
          {expenses.map((expense) => {
            const canMarkAsPaid = expense.display_status === 'pending' || expense.display_status === 'overdue'
            const canMarkAsPending = expense.status === 'paid'

            return (
              <article key={expense.id} className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-dn-border-hover relative overflow-hidden group">
                {expense.display_status === 'overdue' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-dn-danger"></div>
                )}
                {expense.display_status === 'paid' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-dn-success"></div>
                )}
                {expense.display_status === 'pending' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-dn-warning"></div>
                )}

                <div className="flex-1 ml-2">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white">{expense.description}</h3>
                    <Badge variant={getBadgeVariant(expense.display_status)}>
                      {getExpenseStatusLabel(expense.display_status)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-dn-body text-dn-text-secondary">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Valor</span>
                      <span className="font-mono text-white text-lg">{formatCurrency(expense.value)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Vencimento</span>
                      <span className="font-medium text-white">{expense.due_date ? expense.due_date.split('-').reverse().join('/') : '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-dn-text-muted">Categoria</span>
                      <span className="font-medium text-white">{expense.category ?? '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-3 bg-dn-bg-elevated p-4 rounded-dn-lg border-[0.5px] border-dn-border w-full md:w-auto">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link to={`/app/finance/expenses/${expense.id}`} className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full">
                        Editar
                      </Button>
                    </Link>
                    {canMarkAsPaid ? (
                      <Button
                        type="button"
                        onClick={() => handleMarkAsPaid(expense.id)}
                        disabled={savingExpenseId === expense.id}
                        className="flex-1 sm:flex-none whitespace-nowrap bg-dn-success text-black hover:bg-dn-success/90"
                      >
                        {savingExpenseId === expense.id ? 'Salvando...' : 'Marcar como paga'}
                      </Button>
                    ) : null}
                    {canMarkAsPending ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleMarkAsPending(expense.id)}
                        disabled={savingExpenseId === expense.id}
                        className="flex-1 sm:flex-none whitespace-nowrap"
                      >
                        {savingExpenseId === expense.id ? 'Salvando...' : 'Marcar como pendente'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

export default ExpensesListPage
