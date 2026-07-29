import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { loadGlobalKanbanData } from '../lib/globalKanban.js'
import { moveTask } from '../lib/kanban.js'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
}

function getDragPayload(event) {
  const raw = event.dataTransfer.getData('text/plain')
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function setDragPayload(event, payload) {
  event.dataTransfer.setData('text/plain', JSON.stringify(payload))
  event.dataTransfer.effectAllowed = 'move'
}

function getTodayIsoDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function matchesText(task, search) {
  const normalizedSearch = String(search ?? '').trim().toLowerCase()
  if (!normalizedSearch) return true

  const haystack = `${task.title ?? ''} ${task.description ?? ''}`.toLowerCase()
  return haystack.includes(normalizedSearch)
}

function matchesPriority(task, priority) {
  if (priority === 'all') return true
  return String(task.priority ?? '').toLowerCase() === priority
}

function isOverdue(task, todayIso, columnName) {
  if (!task?.due_date) return false
  if (task.status !== 'active') return false
  if (columnName && columnName.toLowerCase().includes('conclu')) return false
  return task.due_date < todayIso
}

function sortTasks(tasks, orderBy) {
  const sortable = [...tasks]

  if (orderBy === 'due_date') {
    return sortable.sort((left, right) => {
      const leftDue = left.due_date ?? '9999-12-31'
      const rightDue = right.due_date ?? '9999-12-31'
      if (leftDue !== rightDue) {
        return leftDue.localeCompare(rightDue)
      }
      return left.rank.localeCompare(right.rank)
    })
  }

  if (orderBy === 'priority') {
    return sortable.sort((left, right) => {
      const leftPriority = PRIORITY_ORDER[left.priority] ?? 99
      const rightPriority = PRIORITY_ORDER[right.priority] ?? 99
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }
      return left.rank.localeCompare(right.rank)
    })
  }

  return sortable.sort((left, right) => left.rank.localeCompare(right.rank))
}

function formatProjectTitle(project) {
  return project.service_type ?? 'Projeto sem tipo'
}

function formatTaskCardDate(value) {
  if (!value) return ''
  const rawValue = String(value)
  const date = new Date(rawValue.includes('T') ? rawValue : `${rawValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR')
}

function getTaskCommentCount(task) {
  const count = Number(task?.comment_count ?? task?.comments_count ?? 0)
  return Number.isFinite(count) ? count : 0
}

function getPriorityBadgeVariant(priority) {
  if (priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'active'; // low ou outro
}

function GlobalKanbanPage() {
  const { user } = useAuth()
  const ownerId = user?.id

  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [columns, setColumns] = useState([])
  const [tasks, setTasks] = useState([])
  const [collapsedByProject, setCollapsedByProject] = useState({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  const [filters, setFilters] = useState({
    search: '',
    clientId: 'all',
    projectId: 'all',
    priority: 'all',
    overdueOnly: false,
    orderBy: 'rank',
  })

  const loadData = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await loadGlobalKanbanData({ ownerId })
      setProjects(data.projects)
      setClients(data.clients)
      setColumns(data.columns)
      setTasks(data.tasks)
      setCollapsedByProject((current) => {
        const next = {}
        for (const project of data.projects) {
          next[project.id] = current[project.id] ?? false
        }
        return next
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const clientsById = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]))
  }, [clients])

  const columnsByProject = useMemo(() => {
    const map = new Map()
    for (const column of columns) {
      if (!map.has(column.project_id)) {
        map.set(column.project_id, [])
      }
      map.get(column.project_id).push(column)
    }
    for (const projectColumns of map.values()) {
      projectColumns.sort((left, right) => left.column_order - right.column_order)
    }
    return map
  }, [columns])

  const tasksByColumn = useMemo(() => {
    const map = new Map()
    for (const task of tasks) {
      if (!map.has(task.column_id)) {
        map.set(task.column_id, [])
      }
      map.get(task.column_id).push(task)
    }
    return map
  }, [tasks])

  const projectOptions = useMemo(() => {
    if (filters.clientId === 'all') {
      return projects
    }
    return projects.filter((project) => project.client_id === filters.clientId)
  }, [filters.clientId, projects])

  const swimlanes = useMemo(() => {
    const todayIso = getTodayIsoDate()

    return projects
      .filter((project) => {
        if (filters.projectId !== 'all' && project.id !== filters.projectId) return false
        if (filters.clientId !== 'all' && project.client_id !== filters.clientId) return false
        return true
      })
      .map((project) => {
        const projectColumns = columnsByProject.get(project.id) ?? []

        const columnsWithTasks = projectColumns.map((column) => {
          const columnTasks = tasksByColumn.get(column.id) ?? []
          const filteredTasks = columnTasks.filter((task) => {
            if (task.project_id !== project.id) return false
            if (!matchesText(task, filters.search)) return false
            if (!matchesPriority(task, filters.priority)) return false
            if (filters.overdueOnly && !isOverdue(task, todayIso, column.name)) return false
            return true
          })

          return {
            ...column,
            tasks: sortTasks(filteredTasks, filters.orderBy),
          }
        })

        const taskCount = columnsWithTasks.reduce(
          (sum, column) => sum + column.tasks.length,
          0,
        )

        return {
          ...project,
          client_name: clientsById.get(project.client_id)?.name ?? 'Cliente sem nome',
          columns: columnsWithTasks,
          filtered_task_count: taskCount,
        }
      })
  }, [
    projects,
    filters.projectId,
    filters.clientId,
    filters.search,
    filters.priority,
    filters.overdueOnly,
    filters.orderBy,
    columnsByProject,
    tasksByColumn,
    clientsById,
  ])

  const toggleProject = (projectId) => {
    setCollapsedByProject((current) => ({
      ...current,
      [projectId]: !current[projectId],
    }))
  }

  const handleTaskDrop = async ({
    event,
    targetProjectId,
    targetColumnId,
    beforeTaskId = null,
  }) => {
    event.preventDefault()
    event.stopPropagation()

    // Efeito visual no target (limpar o hover effect se estivesse ativo)
    event.currentTarget.classList.remove('bg-dn-bg-hover')

    const payload = getDragPayload(event)
    if (!payload || payload.type !== 'task') return
    if (!ownerId) return

    setInfoMessage('')
    setError('')

    if (payload.projectId !== targetProjectId) {
      setInfoMessage('Não é permitido mover task para colunas de outro projeto no Kanban Global.')
      return
    }

    const taskId = payload.taskId

    // --- Optimistic UI update: move task instantly in local state ---
    const previousTasks = tasks
    setTasks((prev) => {
      const next = [...prev]
      const taskIdx = next.findIndex((t) => t.id === taskId)
      if (taskIdx === -1) return prev

      // Update column_id on the task
      next[taskIdx] = { ...next[taskIdx], column_id: targetColumnId }

      // If beforeTaskId, adjust rank to sort before that task
      if (beforeTaskId) {
        const beforeTask = next.find((t) => t.id === beforeTaskId)
        if (beforeTask) {
          // Set a rank just before the target task so sortTasks places it correctly
          const beforeRank = beforeTask.rank
          next[taskIdx] = { ...next[taskIdx], rank: beforeRank.substring(0, beforeRank.length - 1) }
        }
      } else {
        // Move to end — set rank after the last task in that column
        const colTasks = next
          .filter((t) => t.column_id === targetColumnId && t.id !== taskId)
          .sort((a, b) => a.rank.localeCompare(b.rank))
        const lastRank = colTasks.length > 0 ? colTasks[colTasks.length - 1].rank : 'U'
        next[taskIdx] = { ...next[taskIdx], rank: lastRank + '~' }
      }

      return next
    })

    // --- Background API call ---
    try {
      await moveTask({
        ownerId,
        taskId,
        toColumnId: targetColumnId,
        beforeTaskId,
      })
      // Silent sync to get correct ranks from server
      try {
        const data = await loadGlobalKanbanData({ ownerId })
        setTasks(data.tasks)
        setColumns(data.columns)
      } catch (_syncErr) {
        // Background sync failure is non-critical
      }
    } catch (moveError) {
      // Revert on failure
      setTasks(previousTasks)
      setError(moveError.message)
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      clientId: 'all',
      projectId: 'all',
      priority: 'all',
      overdueOnly: false,
      orderBy: 'rank',
    })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-dn-h2 text-white">Kanban Global</h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">
            Visão agregada por projeto com swimlanes e drag-and-drop de tasks.
          </p>
        </div>

        <Button
          onClick={loadData}
          disabled={loading || saving}
          variant="ghost"
        >
          {loading ? 'ATUALIZANDO...' : 'ATUALIZAR DADOS'}
        </Button>
      </div>

      <div className="grid gap-4 bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-xl p-6 md:grid-cols-3 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label className="block text-dn-label text-dn-text-muted mb-2">BUSCA</label>
          <Input
            type="text"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            placeholder="Título ou descrição"
          />
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">CLIENTE</label>
          <Select
            value={filters.clientId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                clientId: event.target.value,
              }))
            }
          >
            <option value="all" className="bg-dn-bg-elevated text-dn-text-primary">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id} className="bg-dn-bg-elevated text-dn-text-primary">
                {client.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">PROJETO</label>
          <Select
            value={filters.projectId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                projectId: event.target.value,
              }))
            }
          >
            <option value="all" className="bg-dn-bg-elevated text-dn-text-primary">Todos</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id} className="bg-dn-bg-elevated text-dn-text-primary">
                {formatProjectTitle(project)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">PRIORIDADE</label>
          <Select
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priority: event.target.value,
              }))
            }
          >
            <option value="all" className="bg-dn-bg-elevated text-dn-text-primary">Todas</option>
            <option value="high" className="bg-dn-bg-elevated text-dn-text-primary">Alta</option>
            <option value="medium" className="bg-dn-bg-elevated text-dn-text-primary">Média</option>
            <option value="low" className="bg-dn-bg-elevated text-dn-text-primary">Baixa</option>
          </Select>
        </div>

        <div>
          <label className="block text-dn-label text-dn-text-muted mb-2">ORDENAÇÃO</label>
          <Select
            value={filters.orderBy}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                orderBy: event.target.value,
              }))
            }
          >
            <option value="rank" className="bg-dn-bg-elevated text-dn-text-primary">Por rank</option>
            <option value="due_date" className="bg-dn-bg-elevated text-dn-text-primary">Por vencimento</option>
            <option value="priority" className="bg-dn-bg-elevated text-dn-text-primary">Por prioridade</option>
          </Select>
        </div>

        <div className="flex items-center gap-4 xl:col-span-6 mt-2">
          <label className="flex items-center gap-2 text-dn-body text-dn-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={filters.overdueOnly}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  overdueOnly: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-dn-border bg-dn-bg-card checked:bg-dn-accent focus:ring-dn-accent"
            />
            Apenas tarefas atrasadas
          </label>

          <Button variant="ghost" className="text-xs h-7 ml-auto" onClick={clearFilters}>Limpar Filtros</Button>
        </div>
      </div>



      {infoMessage ? (
        <p className="bg-dn-warning-bg border-[0.5px] border-dn-warning/30 rounded-dn-md p-3 text-dn-body text-dn-warning">
          {infoMessage}
        </p>
      ) : null}

      {error ? (
        <p className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-md p-3 text-dn-body text-dn-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6 animate-dn-shimmer">
          <p className="text-dn-body text-dn-text-muted">Carregando kanban global...</p>
        </div>
      ) : null}

      {!loading && swimlanes.length === 0 ? (
        <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-dn-bg-elevated flex items-center justify-center text-dn-text-muted mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
          </div>
          <h3 className="text-dn-h3 text-white mb-1">Nenhum projeto encontrado</h3>
          <p className="text-dn-body text-dn-text-secondary">Tente ajustar seus filtros para ver as tarefas.</p>
        </div>
      ) : null}

      {!loading &&
        swimlanes.map((project) => (
          <article key={project.id} className="border-b-[0.5px] border-dn-border pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0">
            <header className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-dn-bg-card/30 p-4 rounded-dn-lg border-[0.5px] border-dn-border/50 backdrop-blur-sm">
              <div>
                <h3 className="text-dn-h3 text-white">{formatProjectTitle(project)}</h3>
                <p className="text-dn-caption text-dn-text-secondary mt-0.5">
                  Cliente: <span className="text-dn-text-primary">{project.client_name}</span> | Tarefas filtradas: <span className="text-dn-text-primary">{project.filtered_task_count}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link to={`/app/projects/${project.id}/kanban`}>
                  <Button variant="ghost" className="h-8 text-xs">Abrir Kanban de Projeto</Button>
                </Link>
                <Button
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => toggleProject(project.id)}
                >
                  {collapsedByProject[project.id] ? 'Mostrar Raia' : 'Ocultar Raia'}
                </Button>
              </div>
            </header>

            {!collapsedByProject[project.id] ? (
              project.columns.length === 0 ? (
                <p className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4 text-dn-body text-dn-text-muted">
                  Este projeto ainda não possui colunas no kanban.
                </p>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                  {project.columns.map((column) => (
                    <div
                      key={column.id}
                      className="w-[320px] min-w-[320px] rounded-dn-lg border-[0.5px] border-dn-border bg-dn-bg-elevated flex flex-col max-h-[700px]"
                    >
                      <div className="flex items-center justify-between gap-2 p-3 border-b-[0.5px] border-dn-border bg-dn-bg-card/40 rounded-t-dn-lg">
                        <h4 className="text-dn-body font-semibold text-white tracking-wide">{column.name}</h4>
                        <span className="bg-dn-bg-hover text-dn-caption text-dn-text-primary px-2 py-0.5 rounded-full border-[0.5px] border-dn-border">
                          {column.tasks.length}
                        </span>
                      </div>

                      <div
                        className="flex-1 p-3 overflow-y-auto hide-scrollbar flex flex-col gap-3 transition-dn"
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.currentTarget.classList.add('bg-dn-bg-hover');
                        }}
                        onDragLeave={(event) => {
                          event.currentTarget.classList.remove('bg-dn-bg-hover');
                        }}
                        onDrop={(event) =>
                          handleTaskDrop({
                            event,
                            targetProjectId: project.id,
                            targetColumnId: column.id,
                            beforeTaskId: null,
                          })
                        }
                      >
                        {column.tasks.length === 0 ? (
                          <div className="flex min-h-[100px] items-center justify-center rounded-dn-md border-[1px] border-dashed border-dn-border text-dn-caption text-dn-text-muted bg-dn-bg-card/20">
                            Solte as tarefas aqui
                          </div>
                        ) : (
                          column.tasks.map((task) => {
                            const commentCount = getTaskCommentCount(task)

                            return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(event) =>
                                setDragPayload(event, {
                                  type: 'task',
                                  taskId: task.id,
                                  projectId: task.project_id,
                                })
                              }
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.stopPropagation(); // Evita que o dragOver da coluna pisque
                                event.currentTarget.classList.add('border-dn-accent');
                              }}
                              onDragLeave={(event) => {
                                event.currentTarget.classList.remove('border-dn-accent');
                              }}
                              onDrop={(event) => {
                                event.currentTarget.classList.remove('border-dn-accent');
                                handleTaskDrop({
                                  event,
                                  targetProjectId: project.id,
                                  targetColumnId: column.id,
                                  beforeTaskId: task.id,
                                });
                              }}
                              className="cursor-grab active:cursor-grabbing rounded-dn-md border-[0.5px] border-dn-border bg-dn-bg-card p-3 shadow-lg hover:border-dn-border-hover transition-colors relative group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="text-dn-body font-semibold text-white pr-4 leading-snug">{task.title}</h5>
                                {task.priority && (
                                  <Badge variant={getPriorityBadgeVariant(task.priority)} className="text-[9px] px-1.5 py-0">
                                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                  </Badge>
                                )}
                              </div>

                              {task.description ? (
                                <p className="mb-3 line-clamp-2 text-dn-caption text-dn-text-secondary leading-relaxed">{task.description}</p>
                              ) : null}

                              <div className="mt-auto space-y-2 border-t-[0.5px] border-dn-border/50 pt-2 text-[10px] text-dn-text-muted font-mono">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 inline-flex items-center gap-1.5 text-dn-text-secondary">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0 text-dn-accent"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    <span className="truncate">{task.due_date ? `Entrega: ${formatTaskCardDate(task.due_date)}` : 'Sem entrega'}</span>
                                  </span>
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">☰</span>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-dn-border bg-white/[0.03] px-2 py-1 text-dn-text-secondary" title="Comentários">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-3.5 w-3.5 text-dn-accent"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6A8.4 8.4 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z"></path></svg>
                                    {commentCount > 0 ? <span className="font-semibold text-white">{commentCount}</span> : null}
                                  </span>

                                  <span className="min-w-0 inline-flex items-center gap-1.5 text-right" title="Data de criação">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0 text-dn-text-secondary"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
                                    <span className="truncate">{task.created_at ? `Criada: ${formatTaskCardDate(task.created_at)}` : 'Criada: -'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </article>
        ))}
    </section>
  )
}

export default GlobalKanbanPage
