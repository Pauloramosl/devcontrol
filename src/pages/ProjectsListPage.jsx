import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { listProjectClients, listProjects } from '../lib/projects.js'

function ProjectsListPage() {
  const { user } = useAuth()
  const ownerId = user?.id

  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [statusInput, setStatusInput] = useState('all')
  const [clientInput, setClientInput] = useState('all')
  const [appliedFilters, setAppliedFilters] = useState({
    status: 'all',
    clientId: 'all',
  })

  const loadClients = useCallback(async () => {
    if (!ownerId) return

    try {
      const data = await listProjectClients({ ownerId })
      setClients(data)
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [ownerId])

  const loadProjects = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await listProjects({
        ownerId,
        status: appliedFilters.status,
        clientId: appliedFilters.clientId,
      })
      setProjects(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters.clientId, appliedFilters.status, ownerId])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const activeClientName = useMemo(() => {
    if (appliedFilters.clientId === 'all') return null
    return clients.find((client) => client.id === appliedFilters.clientId)?.name ?? null
  }, [appliedFilters.clientId, clients])

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters({
      status: statusInput,
      clientId: clientInput,
    })
  }

  const handleResetFilters = () => {
    setStatusInput('all')
    setClientInput('all')
    setAppliedFilters({
      status: 'all',
      clientId: 'all',
    })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Projetos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lista de projetos com filtro por status e cliente.
          </p>
        </div>

        <Link
          to="/app/projects/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Novo Projeto
        </Link>
      </div>

      <form
        onSubmit={handleApplyFilters}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3"
      >
        <label className="block text-sm text-slate-700">
          Status
          <input
            type="text"
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
            placeholder="all ou active"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Cliente
          <select
            value={clientInput}
            onChange={(event) => setClientInput(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">all</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            Limpar
          </button>
        </div>
      </form>

      {appliedFilters.status !== 'all' || activeClientName ? (
        <p className="text-sm text-slate-500">
          Filtros ativos:
          {appliedFilters.status !== 'all' ? ` status="${appliedFilters.status}"` : ''}
          {activeClientName ? ` cliente="${activeClientName}"` : ''}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando projetos...
        </p>
      ) : null}

      {!loading && error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && !error && projects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhum projeto encontrado.</p>
        </div>
      ) : null}

      {!loading && !error && projects.length > 0 ? (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {project.service_type ?? 'Projeto sem tipo de servico'}
                  </h3>
                  <p className="text-sm text-slate-600">Cliente: {project.client_name}</p>
                  <p className="text-xs uppercase text-slate-500">status: {project.status}</p>
                  <p className="text-xs text-slate-500">
                    Budget: {project.budget_value ?? '-'} | Due: {project.due_date ?? '-'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/app/projects/${project.id}/kanban`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
                  >
                    Kanban
                  </Link>
                  <Link
                    to={`/app/projects/${project.id}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
                  >
                    Ver Detalhe
                  </Link>
                  <Link
                    to={`/app/projects/${project.id}/edit`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default ProjectsListPage
