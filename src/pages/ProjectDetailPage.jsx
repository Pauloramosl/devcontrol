import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { deleteProject, getProjectById } from '../lib/projects.js'

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
          setError('Projeto nao encontrado.')
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
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando projeto...</p>
      </section>
    )
  }

  if (error && !project) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
        <Link
          to="/app/projects"
          className="mt-3 inline-block rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 transition hover:bg-red-100"
        >
          Voltar para projetos
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {project.service_type ?? 'Projeto sem tipo de servico'}
          </h2>
          <p className="text-sm text-slate-600">Cliente: {project.client_name}</p>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/app/projects/${project.id}/kanban`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Kanban
          </Link>
          <Link
            to={`/app/projects/${project.id}/edit`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Editar
          </Link>
          <Link
            to="/app/projects"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Voltar
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2">
        <p className="text-sm text-slate-700">
          <strong>Status:</strong> {project.status}
        </p>
        <p className="text-sm text-slate-700">
          <strong>Budget:</strong> {project.budget_value ?? '-'}
        </p>
        <p className="text-sm text-slate-700">
          <strong>Inicio:</strong> {project.start_date ?? '-'}
        </p>
        <p className="text-sm text-slate-700">
          <strong>Data limite:</strong> {project.due_date ?? '-'}
        </p>
        <p className="text-sm text-slate-700 md:col-span-2">
          <strong>Escopo:</strong> {project.scope_text ?? 'Sem escopo'}
        </p>
        <p className="text-sm text-slate-700 md:col-span-2">
          <strong>Proposta:</strong> {project.proposal_text ?? 'Sem proposta'}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Excluir Projeto</h3>
        <p className="mt-1 text-sm text-slate-600">
          Esta acao remove o projeto atual. Essa exclusao nao pode ser desfeita.
        </p>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
        >
          {deleting ? 'Excluindo...' : 'Excluir Projeto'}
        </button>

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default ProjectDetailPage
