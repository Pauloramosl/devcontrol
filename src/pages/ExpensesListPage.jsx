import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  EXPENSE_FILTER_STATUSES,
  listExpenses,
  markExpenseAsPaid,
  markExpenseAsPending,
} from '../lib/finance.js'

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

function statusColor(status) {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-800'
  if (status === 'overdue') return 'bg-red-100 text-red-800'
  if (status === 'pending') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function ExpensesListPage() {
  const { user } = useAuth()
  const ownerId = user?.id

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
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingExpenseId('')
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Despesas</h2>
          <p className="mt-1 text-sm text-slate-600">Contas a pagar com status e filtros básicos.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/app/finance"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Voltar para Financeiro
          </Link>
          <Link
            to="/app/finance/expenses/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Nova despesa
          </Link>
        </div>
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
            {EXPENSE_FILTER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getExpenseStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Busca por descrição
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Ex: internet"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Categoria
          <input
            type="text"
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder="Ex: Operacional"
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

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando despesas...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && !error && expenses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhuma despesa encontrada.</p>
        </div>
      ) : null}

      {!loading && !error && expenses.length > 0 ? (
        <ul className="space-y-3">
          {expenses.map((expense) => {
            const canMarkAsPaid =
              expense.display_status === 'pending' || expense.display_status === 'overdue'
            const canMarkAsPending = expense.status === 'paid'

            return (
              <li key={expense.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{expense.description}</h3>
                    <p className="text-sm text-slate-600">
                      Valor: {formatCurrency(expense.value)} | Vencimento: {expense.due_date}
                    </p>
                    <p className="text-xs text-slate-500">Categoria: {expense.category ?? '-'}</p>
                    <div className="mt-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(expense.display_status)}`}
                      >
                        {getExpenseStatusLabel(expense.display_status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/app/finance/expenses/${expense.id}`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
                    >
                      Editar
                    </Link>
                    {canMarkAsPaid ? (
                      <button
                        type="button"
                        onClick={() => handleMarkAsPaid(expense.id)}
                        disabled={savingExpenseId === expense.id}
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {savingExpenseId === expense.id ? 'Salvando...' : 'Marcar como paga'}
                      </button>
                    ) : null}
                    {canMarkAsPending ? (
                      <button
                        type="button"
                        onClick={() => handleMarkAsPending(expense.id)}
                        disabled={savingExpenseId === expense.id}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        {savingExpenseId === expense.id ? 'Salvando...' : 'Marcar como pendente'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

export default ExpensesListPage
