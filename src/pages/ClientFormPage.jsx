import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CLIENT_STATUSES, createClient, getClientById, updateClient } from '../lib/clients.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Button } from '../components/ui/Button.jsx'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  company: '',
  document_number: '',
  status: 'active',
  notes: '',
}

const CLIENT_STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
}

function ClientFormPage({ mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const ownerId = user?.id
  const isEditMode = mode === 'edit'

  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!isEditMode || !id || !ownerId) return

    let mounted = true

    const loadClient = async () => {
      setLoading(true)
      setError('')

      try {
        const client = await getClientById({ ownerId, clientId: id })
        if (!mounted) return

        if (!client) {
          setError('Cliente não encontrado.')
          return
        }

        setFormData({
          name: client.name ?? '',
          email: client.email ?? '',
          phone: client.phone ?? '',
          company: client.company ?? '',
          document_number: client.document_number ?? '',
          status: client.status ?? 'active',
          notes: client.notes ?? '',
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

    loadClient()

    return () => {
      mounted = false
    }
  }, [id, isEditMode, ownerId])

  const pageTitle = useMemo(
    () => (isEditMode ? 'Editar Cliente' : 'Novo Cliente'),
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
    setError('')

    if (!ownerId) {
      setError('Sessão inválida. Faça login novamente.')
      return
    }

    if (!formData.name.trim()) {
      setError('Nome do cliente é obrigatório.')
      return
    }

    if (!CLIENT_STATUSES.includes(formData.status)) {
      setError('Status inválido.')
      return
    }

    setSaving(true)

    try {
      if (isEditMode) {
        const updated = await updateClient({
          ownerId,
          clientId: id,
          input: formData,
        })

        navigate(`/app/clients/${updated.id}`, { replace: true })
      } else {
        const created = await createClient({
          ownerId,
          input: formData,
        })

        navigate(`/app/clients/${created.id}`, { replace: true })
      }
    } catch (submitError) {
      setError(submitError.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6 animate-dn-shimmer">
        <p className="text-dn-body text-dn-text-muted">Carregando formulário do cliente...</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold text-white tracking-tight">{pageTitle}</h2>
          <p className="text-dn-body text-dn-text-secondary mt-1">
            {isEditMode ? 'Edite os dados cadastrais e o status do cliente.' : 'Adicione um novo cliente à sua carteira.'}
          </p>
        </div>
        <Link to={isEditMode ? `/app/clients/${id}` : '/app/clients'}>
          <Button variant="ghost">Cancelar</Button>
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-[32px] border-[0.5px] border-dn-border bg-dn-bg-card p-8 md:grid-cols-2 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle top edge glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dn-accent/20 to-transparent"></div>

        <div className="md:col-span-2">
          <label className="block text-dn-label text-dn-text-muted mb-2">NOME / RAZÃO SOCIAL *</label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Nome Completo ou Razão Social"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">EMAIL PRINCIPAL</label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="contato@empresa.com.br"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">TELEFONE / WHATSAPP</label>
          <Input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">NOME FANTASIA (EMPRESA)</label>
          <Input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Nome público"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">DOCUMENTO (CPF/CNPJ)</label>
          <Input
            type="text"
            name="document_number"
            value={formData.document_number}
            onChange={handleChange}
            placeholder="Apenas números ou formatado"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-dn-label text-dn-text-muted mb-2">STATUS</label>
          <Select
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            {CLIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CLIENT_STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-dn-label text-dn-text-muted mb-2">NOTAS INTERNAS</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={5}
            className="w-full bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md px-4 py-3 text-dn-body text-white outline-none focus:border-dn-accent/50 focus:ring-1 focus:ring-dn-accent/50 transition-all resize-none"
            placeholder="Informações adicionais, observações e lembretes."
          />
        </div>

        {error ? (
          <div className="md:col-span-2 rounded-dn-md border-[0.5px] border-dn-danger/50 bg-[#161B26] px-4 py-3 text-dn-body text-dn-danger">
            {error}
          </div>
        ) : null}

        <div className="md:col-span-2 pt-6 border-t-[0.5px] border-dn-border mt-4 flex justify-end">
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? 'SALVANDO...' : (isEditMode ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR CLIENTE')}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default ClientFormPage
