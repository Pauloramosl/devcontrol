import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { createExpense, deleteExpense, getExpenseById, updateExpense } from '../lib/finance.js'

const EMPTY_FORM = {
  description: '',
  category: '',
  value: '',
  due_date: '',
  status: 'pending',
}

function ExpenseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const ownerId = user?.id
  const isEditMode = Boolean(id)

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ownerId) return

    let mounted = true

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        if (!isEditMode || !id) {
          setLoading(false)
          return
        }

        const expense = await getExpenseById({
          ownerId,
          expenseId: id,
        })

        if (!mounted) return

        if (!expense) {
          setError('Despesa nao encontrada.')
          setLoading(false)
          return
        }

        setFormData({
          description: expense.description ?? '',
          category: expense.category ?? '',
          value: expense.value?.toString() ?? '',
          due_date: expense.due_date ?? '',
          status: expense.status ?? 'pending',
        })
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [id, isEditMode, ownerId])

  const pageTitle = useMemo(
    () => (isEditMode ? 'Editar despesa' : 'Nova despesa'),
    [isEditMode],
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!ownerId) {
      setError('Sessao invalida. Faca login novamente.')
      return
    }

    if (!formData.description.trim()) {
      setError('Descricao e obrigatoria.')
      return
    }

    const valueNumber = Number(formData.value)
    if (!Number.isFinite(valueNumber) || valueNumber <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }

    if (!formData.due_date) {
      setError('Data de vencimento e obrigatoria.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (isEditMode && id) {
        await updateExpense({
          ownerId,
          expenseId: id,
          input: formData,
        })
      } else {
        await createExpense({
          ownerId,
          input: formData,
        })
      }

      navigate('/app/finance/expenses', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!ownerId || !id) return

    const confirmed = window.confirm('Excluir despesa?')
    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await deleteExpense({
        ownerId,
        expenseId: id,
      })
      navigate('/app/finance/expenses', { replace: true })
    } catch (deleteError) {
      setError(deleteError.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando formulario de despesa...</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">{pageTitle}</h2>
        <Link
          to="/app/finance/expenses"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Voltar para Despesas
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2"
      >
        <label className="block text-sm text-slate-700 md:col-span-2">
          Descricao *
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Categoria
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Valor *
          <input
            type="number"
            name="value"
            value={formData.value}
            onChange={handleChange}
            required
            min="0.01"
            step="0.01"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Data de vencimento *
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>

          {isEditMode ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
            >
              Excluir
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}

export default ExpenseFormPage
