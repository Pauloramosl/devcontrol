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
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Button } from '../components/ui/Button.jsx'
import { AudioTranscriptionButton } from '../components/ui/AudioTranscriptionButton.jsx'

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
          setError('Projeto não encontrado.')
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

  const handleTranscription = (name, text) => {
    setFormData((current) => {
      const existing = current[name] || ''
      const nextValue = existing ? `${existing} ${text}` : text
      return {
        ...current,
        [name]: nextValue,
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!ownerId) {
      setError('Sessão inválida. Faça login novamente.')
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
      <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6 animate-dn-shimmer">
        <p className="text-dn-body text-dn-text-muted">Carregando formulário...</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold text-white tracking-tight">{pageTitle}</h2>
          <p className="text-dn-body text-dn-text-secondary mt-1">
            {isEditMode ? 'Altere as informações do projeto em andamento.' : 'Cadastre um novo projeto na base.'}
          </p>
        </div>
        <Link to={isEditMode ? `/app/projects/${id}` : '/app/projects'}>
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
          <label className="block text-dn-label text-dn-text-muted mb-2">CLIENTE VINCULADO *</label>
          <Select
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            required
          >
            <option value="">Selecione um cliente...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </div>

        {!isEditMode ? (
          <div className="md:col-span-2">
            <label className="block text-dn-label text-dn-text-muted mb-2">FUNIL (OPCIONAL)</label>
            <Select
              value={selectedPipelineId}
              onChange={(event) => setSelectedPipelineId(event.target.value)}
            >
              <option value="">Sem pipeline (Kanban vazio)</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </Select>
            <p className="text-[10px] text-dn-text-muted mt-1 ml-1">Importa colunas padrão de um funil existente.</p>
          </div>
        ) : null}

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">TIPO DE SERVIÇO</label>
          <Input
            type="text"
            name="service_type"
            value={formData.service_type}
            onChange={handleChange}
            placeholder="Ex: Website, Consultoria"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">ORÇAMENTO ESTIMADO</label>
          <Input
            type="number"
            name="budget_value"
            value={formData.budget_value}
            onChange={handleChange}
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">DATA DE INÍCIO</label>
          <Input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">DATA LIMITE (PRAZO)</label>
          <Input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-dn-label text-dn-text-muted mb-2">STATUS</label>
          <Select
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="active">Ativo / Em Andamento</option>
            <option value="completed">Concluído</option>
            <option value="pending">Pendente / Pausado</option>
            <option value="cancelled">Cancelado</option>
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-dn-label text-dn-text-muted">ESCOPO</label>
            <AudioTranscriptionButton
              onTranscription={(text) => handleTranscription('scope_text', text)}
              placeholderText="Transcrever escopo por voz"
            />
          </div>
          <textarea
            name="scope_text"
            value={formData.scope_text}
            onChange={handleChange}
            rows={4}
            className="w-full bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md px-4 py-3 text-dn-body text-white outline-none focus:border-dn-accent/50 focus:ring-1 focus:ring-dn-accent/50 transition-all resize-none"
            placeholder="Descreva o escopo do projeto..."
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-dn-label text-dn-text-muted">PROPOSTA (NOTAS COMERCIAIS)</label>
            <AudioTranscriptionButton
              onTranscription={(text) => handleTranscription('proposal_text', text)}
              placeholderText="Transcrever proposta por voz"
            />
          </div>
          <textarea
            name="proposal_text"
            value={formData.proposal_text}
            onChange={handleChange}
            rows={4}
            className="w-full bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md px-4 py-3 text-dn-body text-white outline-none focus:border-dn-accent/50 focus:ring-1 focus:ring-dn-accent/50 transition-all resize-none"
            placeholder="Insira detalhes de proposta, valores negociados, etc."
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
            {saving ? 'SALVANDO...' : (isEditMode ? 'SALVAR ALTERAÇÕES' : 'CRIAR PROJETO')}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default ProjectFormPage
