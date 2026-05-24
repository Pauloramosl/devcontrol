import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { listProjectClients, listProjects } from '../lib/projects.js'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableActionCell } from '../components/ui/Table.jsx'

function getStatusBadgeVariant(status) {
  const s = String(status).toLowerCase();
  if (s === 'active' || s === 'ativo') return 'active';
  if (s === 'completed' || s === 'concluido') return 'success';
  if (s === 'pending' || s === 'pendente') return 'warning';
  if (s === 'cancelled' || s === 'cancelado') return 'danger';
  return 'active'; // Default
}

function getProjectInfo(task) {
  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects
  return {
    projectName: project?.service_type ?? 'Projeto',
    clientName: project?.clients?.name ?? '-',
  }
}

function ProjectsListPage() {
  const { user } = useAuth()
  const ownerId = user?.id
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [overdueTasks, setOverdueTasks] = useState([])
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
      const [projectsData, tasksData] = await Promise.all([
        listProjects({
          ownerId,
          status: appliedFilters.status,
          clientId: appliedFilters.clientId,
        }),
        import('../lib/kanban.js').then((m) => m.loadOverdueTasks({ ownerId }))
      ])
      
      setProjects(projectsData)
      setOverdueTasks(tasksData)
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
          <h2 className="text-dn-h2 text-white">Projetos</h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">
            Lista de projetos com filtro por status e cliente.
          </p>
        </div>

        <Link to="/app/projects/new">
          <Button variant="primary">Novo Projeto</Button>
        </Link>
      </div>

      {!loading && overdueTasks.length > 0 ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-warning/30 rounded-dn-lg p-6 dn-ambient-container dn-ambient-amber">
          <h3 className="text-dn-h3 text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-dn-warning"></span>
            Tarefas Atrasadas
          </h3>
          <div className="space-y-3">
            {overdueTasks.map((task) => {
              const projectInfo = getProjectInfo(task)
              return (
                <div key={task.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-dn-bg-hover transition-dn">
                  <div>
                    <p className="text-dn-caption text-dn-warning uppercase tracking-wider mb-1">TAREFA</p>
                    <p className="text-dn-body font-medium text-white">{task.title}</p>
                    <p className="text-dn-caption text-dn-text-secondary mt-1">
                      Projeto: <span className="text-dn-text-primary">{projectInfo.projectName}</span> | 
                      Cliente: <span className="text-dn-text-primary">{projectInfo.clientName}</span> | 
                      Data: <span className="text-dn-warning">{task.due_date}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link to={`/app/projects/${task.project_id}/kanban`}>
                      <Button variant="ghost" className="h-8 text-xs text-dn-accent">Abrir Kanban</Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      <form
        onSubmit={handleApplyFilters}
        className="grid gap-4 bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-xl p-6 md:grid-cols-3"
      >
        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">STATUS</label>
          <Input
            type="text"
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
            placeholder="Ex: todos, ativo, concluído"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">CLIENTE</label>
          <Select
            value={clientInput}
            onChange={(event) => setClientInput(event.target.value)}
          >
            <option value="all" className="bg-dn-bg-elevated text-dn-text-primary">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id} className="bg-dn-bg-elevated text-dn-text-primary">
                {client.name}
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

      {appliedFilters.status !== 'all' || activeClientName ? (
        <p className="text-dn-caption text-dn-text-muted bg-dn-bg-elevated border-[0.5px] border-dn-border inline-block px-3 py-1 rounded-dn-md">
          Filtros ativos:
          {appliedFilters.status !== 'all' && <span className="text-white ml-1">status="{appliedFilters.status}"</span>}
          {activeClientName && <span className="text-white ml-1">cliente="{activeClientName}"</span>}
        </p>
      ) : null}

      {loading ? (
        <p className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-4 text-dn-body text-dn-text-muted animate-dn-shimmer">
          Carregando projetos...
        </p>
      ) : null}

      {!loading && error ? (
        <p className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-md p-4 text-dn-body text-dn-danger">
          {error}
        </p>
      ) : null}

      {!loading && !error && projects.length === 0 ? (
        <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-dn-bg-elevated flex items-center justify-center text-dn-text-muted mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
              <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 12 12 17 22 12" /><polyline points="2 17 12 22 22 17" />
            </svg>
          </div>
          <h3 className="text-dn-h3 text-white mb-1">Nenhum projeto encontrado</h3>
          <p className="text-dn-body text-dn-text-secondary max-w-sm mb-4">
            Não encontramos projetos que correspondam aos filtros selecionados.
          </p>
          <Button variant="ghost" onClick={handleResetFilters}>Limpar Filtros</Button>
        </div>
      ) : null}

      {!loading && !error && projects.length > 0 ? (
        <Table>
          <TableHeader>
            <TableHead>PROJETO</TableHead>
            <TableHead>CLIENTE</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>DETALHES</TableHead>
            <TableHead></TableHead>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id} onClick={() => navigate(`/app/projects/${project.id}`)}>
                <TableCell>
                  <p className="font-medium text-white">{project.service_type ?? 'Projeto sem tipo de serviço'}</p>
                </TableCell>
                <TableCell>
                  <span className="text-dn-body text-dn-text-primary">{project.client_name}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(project.status)} className="uppercase">
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-dn-caption text-dn-text-muted">Orçamento: <span className="text-dn-accent text-dn-mono">{project.budget_value ?? '-'}</span></span>
                    <span className="text-dn-caption text-dn-text-muted">Prazo: <span className="text-dn-text-primary">{project.due_date ?? '-'}</span></span>
                  </div>
                </TableCell>
                <TableActionCell>
                  <Button variant="ghost" className="px-3 h-8 text-xs text-dn-accent hover:text-white border-dn-accent/30 hover:bg-dn-accent/10 hover:border-dn-accent" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/projects/${project.id}/kanban`);
                  }}>
                    Kanban
                  </Button>
                  <Button variant="ghost" className="px-2 h-8 text-xs" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/projects/${project.id}/edit`);
                  }}>
                    Editar
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

export default ProjectsListPage
