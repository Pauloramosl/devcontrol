import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { deleteProject, getProjectById } from '../lib/projects.js'
import { Button } from '../components/ui/Button.jsx'

function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const ownerId = user?.id

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ownerId || !id) return

    let mounted = true

    const loadProject = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await getProjectById({ ownerId, projectId: id })
        if (!mounted) return

        if (!data) {
          setError('Projeto não encontrado.')
          return
        }

        setProject(data)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadProject()

    return () => {
      mounted = false
    }
  }, [id, ownerId])

  const handleDelete = async () => {
    if (!ownerId || !id) return

    const confirmed = window.confirm('Excluir este projeto?')
    if (!confirmed) return

    setDeleting(true)
    setError('')

    try {
      await deleteProject({ ownerId, projectId: id })
      navigate('/app/projects', { replace: true })
    } catch (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6">
        <p className="text-dn-body text-dn-text-muted animate-dn-shimmer">Carregando detalhes do projeto...</p>
      </section>
    )
  }

  if (error && !project) {
    return (
      <section className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-lg p-6">
        <p className="text-dn-body text-dn-danger">{error}</p>
        <div className="mt-4">
          <Link to="/app/projects">
            <Button variant="ghost" className="text-dn-danger">Voltar para projetos</Button>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg">
        <div>
          <h2 className="text-[24px] font-semibold text-white tracking-tight">
            {project.service_type ?? 'Projeto sem tipo de serviço'}
          </h2>
          <p className="text-dn-body text-dn-text-secondary mt-1">Cliente: <span className="text-white">{project.client_name}</span></p>
        </div>

        <div className="flex gap-2">
          <Link to={`/app/projects/${project.id}/kanban`}>
            <Button variant="ghost" className="text-dn-accent hover:text-white border-[0.5px] border-dn-accent/30 bg-dn-accent/5">Kanban</Button>
          </Link>
          <Link to={`/app/projects/${project.id}/edit`}>
            <Button variant="ghost">Editar</Button>
          </Link>
          <Link to="/app/projects">
            <Button variant="ghost">Voltar</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-8 md:grid-cols-2 shadow-lg">
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Status</span>
          <span className="text-dn-body font-medium text-white">{project.status}</span>
        </div>
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Orçamento</span>
          <span className="text-dn-body font-mono text-dn-accent">{project.budget_value ?? '-'}</span>
        </div>
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Data Início</span>
          <span className="text-dn-body font-medium text-white">{project.start_date ?? '-'}</span>
        </div>
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Data Limite (Prazo)</span>
          <span className="text-dn-body font-medium text-dn-warning">{project.due_date ?? '-'}</span>
        </div>
        
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border md:col-span-2">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Escopo</span>
          <p className="text-dn-body text-dn-text-secondary whitespace-pre-wrap">{project.scope_text ?? 'Nenhum escopo definido'}</p>
        </div>
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border md:col-span-2">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Proposta</span>
          <p className="text-dn-body text-dn-text-secondary whitespace-pre-wrap">{project.proposal_text ?? 'Nenhuma proposta definida'}</p>
        </div>
      </div>

      <div className="rounded-dn-xl border-[0.5px] border-dn-danger/30 bg-dn-danger-bg p-8 dn-ambient-container dn-ambient-red">
        <h3 className="text-dn-h3 text-dn-danger flex items-center gap-2">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
           Zona de Perigo: Excluir Projeto
        </h3>
        <p className="mt-2 text-dn-body text-dn-text-secondary max-w-2xl">
          Esta ação remove o projeto atual e todas as tarefas/colunas associadas no Kanban. Essa exclusão <strong>não pode ser desfeita</strong>.
        </p>

        <div className="mt-6">
          <Button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-transparent border border-dn-danger text-dn-danger hover:bg-dn-danger/10 hover:text-white transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)]"
          >
            {deleting ? 'EXCLUINDO...' : 'EXCLUIR PROJETO DEFINITIVAMENTE'}
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-[#161B26] border-[0.5px] border-dn-danger/50 p-3 text-dn-body text-dn-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default ProjectDetailPage
