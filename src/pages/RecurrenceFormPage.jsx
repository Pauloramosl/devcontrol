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
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Button } from '../components/ui/Button.jsx'

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
      setError('Sessão inválida. Faça login novamente.')
      return
    }

    const valueNumber = Number(formData.value)
    const dueDayNumber = Number.parseInt(formData.due_day, 10)

    if (!formData.client_id) {
      setError('Cliente é obrigatório.')
      return
    }

    if (!Number.isFinite(valueNumber) || valueNumber <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }

    if (!formData.start_date) {
      setError('Data de início é obrigatória.')
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
      <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6 animate-dn-shimmer">
        <p className="text-dn-body text-dn-text-muted">Carregando formulário de recorrência...</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold text-white tracking-tight">{pageTitle}</h2>
          <p className="text-dn-body text-dn-text-secondary mt-1">
            {isEditMode ? 'Edite os dados desta receita recorrente.' : 'Cadastre um novo plano ou serviço de assinatura mensal.'}
          </p>
        </div>
        <Link to="/app/finance/recurrences">
          <Button variant="ghost">Voltar para Recorrências</Button>
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-[32px] border-[0.5px] border-dn-border bg-dn-bg-card p-8 md:grid-cols-2 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle top edge glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dn-accent/20 to-transparent"></div>

        <div className="md:col-span-2">
          <label className="block text-dn-label text-dn-text-muted mb-2">CLIENTE VINCULADO *</label>
          <Select
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            required
          >
            <option value="">Selecione o cliente...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">VALOR MENSAL (R$) *</label>
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
          <label className="block text-dn-label text-dn-text-muted mb-2">DATA DE INÍCIO *</label>
          <Input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">DIA DO VENCIMENTO *</label>
          <Input
            type="number"
            name="due_day"
            value={formData.due_day}
            onChange={handleChange}
            required
            min="1"
            max="31"
            placeholder="Ex: 5"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">STATUS</label>
          <Select
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            {RECURRENCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RECURRENCE_STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-dn-label text-dn-text-muted mb-2">OBSERVAÇÕES (OPCIONAL)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md px-4 py-3 text-dn-body text-white outline-none focus:border-dn-accent/50 focus:ring-1 focus:ring-dn-accent/50 transition-all resize-none"
            placeholder="Detalhes sobre a assinatura, escopo recorrente, etc."
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
              Excluir Recorrência
            </Button>
          ) : null}
          
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? 'SALVANDO...' : (isEditMode ? 'SALVAR ALTERAÇÕES' : 'CRIAR RECORRÊNCIA')}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default RecurrenceFormPage
