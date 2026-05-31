import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlerts } from '../context/AlertsContext.jsx'
import { createExpense, deleteExpense, getExpenseById, updateExpense } from '../lib/finance.js'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'

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
  const { refresh: refreshAlerts } = useAlerts()
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
          setError('Despesa não encontrada.')
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
      setError('Sessão inválida. Faça login novamente.')
      return
    }

    if (!formData.description.trim()) {
      setError('Descrição é obrigatória.')
      return
    }

    const valueNumber = Number(formData.value)
    if (!Number.isFinite(valueNumber) || valueNumber <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }

    if (!formData.due_date) {
      setError('Data de vencimento é obrigatória.')
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

      refreshAlerts()
      navigate('/app/finance/expenses', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!ownerId || !id) return

    const confirmed = window.confirm('Tem certeza que deseja excluir esta despesa permanentemente?')
    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await deleteExpense({
        ownerId,
        expenseId: id,
      })
      refreshAlerts()
      navigate('/app/finance/expenses', { replace: true })
    } catch (deleteError) {
      setError(deleteError.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6 animate-dn-shimmer">
        <p className="text-dn-body text-dn-text-muted">Carregando formulário de despesa...</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold text-white tracking-tight">{pageTitle}</h2>
          <p className="text-dn-body text-dn-text-secondary mt-1">
            {isEditMode ? 'Edite os dados desta despesa.' : 'Registre uma nova saída financeira.'}
          </p>
        </div>
        <Link to="/app/finance/expenses">
          <Button variant="ghost">Voltar para Despesas</Button>
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-[32px] border-[0.5px] border-dn-border bg-dn-bg-card p-8 md:grid-cols-2 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle top edge glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dn-danger/20 to-transparent"></div>

        <div className="md:col-span-2">
          <label className="block text-dn-label text-dn-text-muted mb-2">DESCRIÇÃO DA DESPESA *</label>
          <Input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Ex: Licença de Software, Material de Escritório"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">CATEGORIA</label>
          <Input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="Ex: Infraestrutura"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">VALOR (R$) *</label>
          <Input
            type="number"
            name="value"
            value={formData.value}
            onChange={handleChange}
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">DATA DE VENCIMENTO *</label>
          <Input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            required
          />
        </div>

        {error ? (
          <div className="md:col-span-2 rounded-dn-md border-[0.5px] border-dn-danger/50 bg-[#161B26] px-4 py-3 text-dn-body text-dn-danger">
            {error}
          </div>
        ) : null}

        <div className="md:col-span-2 pt-6 border-t-[0.5px] border-dn-border mt-4 flex flex-wrap gap-4 justify-end">
          {isEditMode ? (
            <Button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="bg-transparent border border-dn-danger text-dn-danger hover:bg-dn-danger/10 shadow-none mr-auto"
            >
              Excluir Despesa
            </Button>
          ) : null}
          
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? 'SALVANDO...' : (isEditMode ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR DESPESA')}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default ExpenseFormPage
