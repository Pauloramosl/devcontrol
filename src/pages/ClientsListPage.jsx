import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CLIENT_STATUSES, listClients } from '../lib/clients.js'
import { listTags } from '../lib/tags.js'
import { useAuth } from '../context/AuthContext.jsx'

const STATUS_OPTIONS = ['all', ...CLIENT_STATUSES]

function ClientsListPage() {
  const { user } = useAuth()

  const [clients, setClients] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [statusInput, setStatusInput] = useState('all')
  const [tagInput, setTagInput] = useState('all')
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: '',
    status: 'all',
    tagId: 'all',
  })

  const ownerId = user?.id

  const loadTags = useCallback(async () => {
    if (!ownerId) return

    try {
      const data = await listTags({ ownerId })
      setTags(data)
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [ownerId])

  const loadClients = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await listClients({
        ownerId,
        searchTerm: appliedFilters.searchTerm,
        status: appliedFilters.status,
        tagId: appliedFilters.tagId,
      })

      setClients(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters.searchTerm, appliedFilters.status, appliedFilters.tagId, ownerId])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const activeTagName = useMemo(() => {
    if (appliedFilters.tagId === 'all') return null
    return tags.find((tag) => tag.id === appliedFilters.tagId)?.name ?? null
  }, [appliedFilters.tagId, tags])

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters({
      searchTerm: searchInput,
      status: statusInput,
      tagId: tagInput,
    })
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setStatusInput('all')
    setTagInput('all')
    setAppliedFilters({
      searchTerm: '',
      status: 'all',
      tagId: 'all',
    })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Clientes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lista de clientes com filtros por busca, status e tag.
          </p>
        </div>
        <Link
          to="/app/clients/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Novo Cliente
        </Link>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4"
        onSubmit={handleApplyFilters}
      >
        <label className="block text-sm text-slate-700">
          Busca
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nome ou email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Status
          <select
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            {STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Tag
          <select
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">all</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
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

      {appliedFilters.searchTerm || appliedFilters.status !== 'all' || activeTagName ? (
        <p className="text-sm text-slate-500">
          Filtros ativos:
          {appliedFilters.searchTerm ? ` busca="${appliedFilters.searchTerm}"` : ''}
          {appliedFilters.status !== 'all' ? ` status="${appliedFilters.status}"` : ''}
          {activeTagName ? ` tag="${activeTagName}"` : ''}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando clientes...
        </p>
      ) : null}

      {!loading && error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && !error && clients.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhum cliente encontrado para os filtros atuais.</p>
        </div>
      ) : null}

      {!loading && !error && clients.length > 0 ? (
        <ul className="space-y-3">
          {clients.map((client) => (
            <li key={client.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{client.name}</h3>
                  <p className="text-sm text-slate-600">{client.email ?? 'Sem email'}</p>
                  <p className="text-xs uppercase text-slate-500">status: {client.status}</p>
                </div>

                <Link
                  to={`/app/clients/${client.id}`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
                >
                  Ver Detalhe
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {client.tags.length === 0 ? (
                  <span className="text-xs text-slate-500">Sem tags</span>
                ) : (
                  client.tags.map((tag) => (
                    <span
                      key={`${client.id}-${tag.id}`}
                      className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    >
                      {tag.name}
                    </span>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default ClientsListPage
