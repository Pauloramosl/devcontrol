import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  RECURRENCE_STATUSES,
  createRecurrence,
  deleteRecurrence,
  getRecurrenceById,
  listFinanceClients,
  updateRecurrence,
} from '../lib/finance.js'

const EMPTY_FORM = {
  client_id: '',
  value: '',
  start_date: '',
  due_day: '',
  status: 'active',
  notes: '',
}

const RECURRENCE_STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  canceled: 'Cancelado',
}

function RecurrenceFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const ownerId = user?.id
  const isEditMode = Boolean(id)

  const [clients, setClients] = useState([])
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
        const clientsData = await listFinanceClients({ ownerId })
        if (!mounted) return

        setClients(clientsData)

        if (!isEditMode || !id) {
          setLoading(false)
          return
        }

        const recurrence = await getRecurrenceById({
          ownerId,
          recurrenceId: id,
        })

        if (!mounted) return

        if (!recurrence) {
          setError('Recorrência não encontrada.')
          setLoading(false)
          return
        }

        setFormData({
          client_id: recurrence.client_id ?? '',
          value: recurrence.value?.toString() ?? '',
          start_date: recurrence.start_date ?? '',
          due_day: recurrence.due_day?.toString() ?? '',
          status: recurrence.status ?? 'active',
          notes: recurrence.notes ?? '',
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
    () => (isEditMode ? 'Editar recorrência' : 'Nova recorrência'),
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

    const valueNumber = Number(formData.value)
    const dueDayNumber = Number.parseInt(formData.due_day, 10)

    if (!formData.client_id) {
      setError('Cliente e obrigatorio.')
      return
    }

    if (!Number.isFinite(valueNumber) || valueNumber <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }

    if (!formData.start_date) {
      setError('Data de inicio e obrigatoria.')
      return
    }

    if (!Number.isInteger(dueDayNumber) || dueDayNumber < 1 || dueDayNumber > 31) {
      setError('Dia do vencimento deve estar entre 1 e 31.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (isEditMode && id) {
        await updateRecurrence({
          ownerId,
          recurrenceId: id,
          input: formData,
        })
      } else {
        await createRecurrence({
          ownerId,
          input: formData,
        })
      }

      navigate('/app/finance/recurrences', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!ownerId || !id) return

    const confirmed = window.confirm('Excluir recorrência?')
    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await deleteRecurrence({
        ownerId,
        recurrenceId: id,
      })
      navigate('/app/finance/recurrences', { replace: true })
    } catch (deleteError) {
      setError(deleteError.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando formulário de recorrência...</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">{pageTitle}</h2>
        <Link
          to="/app/finance/recurrences"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Voltar para Recorrências
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2"
      >
        <label className="block text-sm text-slate-700 md:col-span-2">
          Cliente *
          <select
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">Selecione...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
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
          Data de início *
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Dia do vencimento *
          <input
            type="number"
            name="due_day"
            value={formData.due_day}
            onChange={handleChange}
            required
            min="1"
            max="31"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Status
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            {RECURRENCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RECURRENCE_STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700 md:col-span-2">
          Observacoes
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
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

export default RecurrenceFormPage
