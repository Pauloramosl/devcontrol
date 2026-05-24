import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CLIENT_STATUSES, createClient, getClientById, updateClient } from '../lib/clients.js'
import { useAuth } from '../context/AuthContext.jsx'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  company: '',
  document_number: '',
  status: 'active',
  notes: '',
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
          setError('Cliente nao encontrado.')
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
      setError('Sessao invalida. Faca login novamente.')
      return
    }

    if (!formData.name.trim()) {
      setError('Nome do cliente e obrigatorio.')
      return
    }

    if (!CLIENT_STATUSES.includes(formData.status)) {
      setError('Status invalido.')
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
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando formulario...</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">{pageTitle}</h2>
        <Link
          to={isEditMode ? `/app/clients/${id}` : '/app/clients'}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2"
      >
        <label className="block text-sm text-slate-700 md:col-span-2">
          Nome *
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Email
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Telefone
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Empresa
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Documento
          <input
            type="text"
            name="document_number"
            value={formData.document_number}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700 md:col-span-2">
          Status
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            {CLIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700 md:col-span-2">
          Notas
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={5}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
            {error}
          </p>
        ) : null}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Salvando...' : 'Salvar Cliente'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ClientFormPage
