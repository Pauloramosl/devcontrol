import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { listPipelines } from '../lib/pipelines.js'
import {
  createProject,
  getProjectById,
  listProjectClients,
  updateProject,
} from '../lib/projects.js'

const EMPTY_FORM = {
  client_id: '',
  service_type: '',
  budget_value: '',
  scope_text: '',
  proposal_text: '',
  start_date: '',
  due_date: '',
  status: 'active',
}

function ProjectFormPage({ mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const ownerId = user?.id
  const isEditMode = mode === 'edit'

  const [clients, setClients] = useState([])
  const [pipelines, setPipelines] = useState([])
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
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
        const [clientsData, pipelinesData] = await Promise.all([
          listProjectClients({ ownerId }),
          isEditMode ? Promise.resolve([]) : listPipelines({ ownerId }),
        ])

        if (!mounted) return

        setClients(clientsData)
        setPipelines(pipelinesData)

        if (!isEditMode || !id) {
          setLoading(false)
          return
        }

        const project = await getProjectById({ ownerId, projectId: id })
        if (!mounted) return

        if (!project) {
          setError('Projeto nao encontrado.')
          setLoading(false)
          return
        }

        setFormData({
          client_id: project.client_id ?? '',
          service_type: project.service_type ?? '',
          budget_value: project.budget_value?.toString() ?? '',
          scope_text: project.scope_text ?? '',
          proposal_text: project.proposal_text ?? '',
          start_date: project.start_date ?? '',
          due_date: project.due_date ?? '',
          status: project.status ?? 'active',
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

  const pageTitle = useMemo(() => (isEditMode ? 'Editar Projeto' : 'Novo Projeto'), [isEditMode])

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

    if (!formData.client_id) {
      setError('Selecione um cliente.')
      return
    }

    setSaving(true)

    try {
      if (isEditMode) {
        const updated = await updateProject({
          ownerId,
          projectId: id,
          input: formData,
        })

        navigate(`/app/projects/${updated.id}`, { replace: true })
      } else {
        const created = await createProject({
          ownerId,
          input: formData,
          pipelineId: selectedPipelineId,
        })

        navigate(`/app/projects/${created.id}`, { replace: true })
      }
    } catch (submitError) {
      setError(submitError.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando formulario de projeto...</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">{pageTitle}</h2>
        <Link
          to={isEditMode ? `/app/projects/${id}` : '/app/projects'}
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

        {!isEditMode ? (
          <label className="block text-sm text-slate-700 md:col-span-2">
            Pipeline (opcional)
            <select
              value={selectedPipelineId}
              onChange={(event) => setSelectedPipelineId(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Sem pipeline</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block text-sm text-slate-700">
          Tipo de servico
          <input
            type="text"
            name="service_type"
            value={formData.service_type}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Budget
          <input
            type="number"
            name="budget_value"
            value={formData.budget_value}
            onChange={handleChange}
            step="0.01"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Data de inicio
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Data limite
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700 md:col-span-2">
          Status
          <input
            type="text"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700 md:col-span-2">
          Escopo
          <textarea
            name="scope_text"
            value={formData.scope_text}
            onChange={handleChange}
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700 md:col-span-2">
          Proposta
          <textarea
            name="proposal_text"
            value={formData.proposal_text}
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

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Salvando...' : 'Salvar Projeto'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ProjectFormPage
