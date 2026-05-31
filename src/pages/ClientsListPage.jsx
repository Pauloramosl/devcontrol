import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CLIENT_STATUSES, listClients } from '../lib/clients.js'
import { listTags } from '../lib/tags.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableActionCell } from '../components/ui/Table.jsx'

const STATUS_OPTIONS = ['all', ...CLIENT_STATUSES]

const CLIENT_STATUS_LABELS = {
  all: 'Todos',
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
}

function getStatusBadgeVariant(status) {
  const s = status.toLowerCase();
  if (s === 'ativo' || s === 'active') return 'active';
  if (s === 'pendente' || s === 'pending') return 'warning';
  if (s === 'inadimplente' || s === 'overdue') return 'danger';
  if (s === 'premium') return 'premium';
  return 'active'; // Default
}

function ClientsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

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
          <h2 className="text-dn-h2 text-white">Clientes</h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">
            Lista de clientes com filtros por busca, status e tag.
          </p>
        </div>
        <Link to="/app/clients/new">
          <Button variant="primary">Novo Cliente</Button>
        </Link>
      </div>

      <form
        className="grid gap-4 bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-xl p-6 md:grid-cols-4"
        onSubmit={handleApplyFilters}
      >
        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">BUSCA</label>
          <Input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nome ou email"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">STATUS</label>
          <Select
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
          >
            {STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption} value={statusOption} className="bg-dn-bg-elevated text-dn-text-primary">
                {CLIENT_STATUS_LABELS[statusOption]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">TAG</label>
          <Select
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
          >
            <option value="all" className="bg-dn-bg-elevated text-dn-text-primary">Todas</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id} className="bg-dn-bg-elevated text-dn-text-primary">
                {tag.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" className="w-full">Aplicar</Button>
          <Button type="button" variant="ghost" onClick={handleResetFilters} className="px-3" title="Limpar filtros">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </Button>
        </div>
      </form>

      {appliedFilters.searchTerm || appliedFilters.status !== 'all' || activeTagName ? (
        <p className="text-dn-caption text-dn-text-muted bg-dn-bg-elevated border-[0.5px] border-dn-border inline-block px-3 py-1 rounded-dn-md">
          Filtros ativos:
          {appliedFilters.searchTerm && <span className="text-white ml-1">busca="{appliedFilters.searchTerm}"</span>}
          {appliedFilters.status !== 'all' && <span className="text-white ml-1">status="{appliedFilters.status}"</span>}
          {activeTagName && <span className="text-white ml-1">tag="{activeTagName}"</span>}
        </p>
      ) : null}

      {loading ? (
        <p className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-4 text-dn-body text-dn-text-muted animate-dn-shimmer">
          Carregando clientes...
        </p>
      ) : null}

      {!loading && error ? (
        <p className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-md p-4 text-dn-body text-dn-danger">
          {error}
        </p>
      ) : null}

      {!loading && !error && clients.length === 0 ? (
        <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-dn-bg-elevated flex items-center justify-center text-dn-text-muted mb-4">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
          </div>
          <h3 className="text-dn-h3 text-white mb-1">Nenhum cliente encontrado</h3>
          <p className="text-dn-body text-dn-text-secondary max-w-sm mb-4">
            Não encontramos nenhum cliente com os filtros aplicados no momento.
          </p>
          <Button variant="ghost" onClick={handleResetFilters}>Limpar Filtros</Button>
        </div>
      ) : null}

      {!loading && !error && clients.length > 0 ? (
        <Table>
          <TableHeader>
            <TableHead>CLIENTE</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>TAGS</TableHead>
            <TableHead></TableHead>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} onClick={() => navigate(`/app/clients/${client.id}`)}>
                <TableCell>
                  <p className="font-medium text-white">{client.name}</p>
                  <p className="text-dn-caption text-dn-text-muted mt-0.5">{client.email ?? 'Sem email'}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(client.status)} className="uppercase">
                    {CLIENT_STATUS_LABELS[client.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {client.tags.length === 0 ? (
                      <span className="text-dn-caption text-dn-text-muted">Nenhuma</span>
                    ) : (
                      client.tags.map((tag) => (
                        <span key={tag.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded px-1.5 py-0.5 text-[10px] text-dn-text-secondary">
                          {tag.name}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableActionCell>
                  <Button variant="ghost" className="px-2 h-7 text-xs" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/clients/${client.id}`);
                  }}>
                    Detalhes
                  </Button>
                </TableActionCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </section>
  )
}

export default ClientsListPage
