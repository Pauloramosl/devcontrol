import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { loadGlobalKanbanData } from '../lib/globalKanban.js'
import { moveTask } from '../lib/kanban.js'

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

function isOverdue(task, todayIso) {
  if (!task?.due_date) return false
  if (task.status !== 'active') return false
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
            if (filters.overdueOnly && !isOverdue(task, todayIso)) return false
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

    const payload = getDragPayload(event)
    if (!payload || payload.type !== 'task') return
    if (!ownerId) return

    setInfoMessage('')
    setError('')

    if (payload.projectId !== targetProjectId) {
      setInfoMessage('Nao e permitido mover task para colunas de outro projeto no Kanban Global.')
      return
    }

    setSaving(true)
    try {
      await moveTask({
        ownerId,
        taskId: payload.taskId,
        toColumnId: targetColumnId,
        beforeTaskId,
      })
      await loadData()
    } catch (moveError) {
      setError(moveError.message)
    } finally {
      setSaving(false)
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
          <h2 className="text-2xl font-semibold text-slate-900">Kanban Global</h2>
          <p className="mt-1 text-sm text-slate-600">
            Visao agregada por projeto com swimlanes e drag-and-drop de tasks.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading || saving}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {loading ? 'Atualizando...' : 'Atualizar dados'}
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <label className="block text-sm text-slate-700 xl:col-span-2">
          Busca (title/description)
          <input
            type="text"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            placeholder="Buscar task..."
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Cliente
          <select
            value={filters.clientId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                clientId: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Projeto
          <select
            value={filters.projectId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                projectId: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">Todos</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {formatProjectTitle(project)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Prioridade
          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priority: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">Todas</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Ordenacao
          <select
            value={filters.orderBy}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                orderBy: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="rank">Por rank</option>
            <option value="due_date">Por vencimento</option>
            <option value="priority">Por prioridade</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.overdueOnly}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                overdueOnly: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          Apenas atrasadas
        </label>
      </div>

      <div>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Limpar filtros
        </button>
      </div>

      {saving ? (
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
          Salvando movimento...
        </p>
      ) : null}

      {infoMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {infoMessage}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Carregando kanban global...</p>
        </div>
      ) : null}

      {!loading && swimlanes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhum projeto encontrado com os filtros atuais.</p>
        </div>
      ) : null}

      {!loading &&
        swimlanes.map((project) => (
          <article key={project.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{formatProjectTitle(project)}</h3>
                <p className="text-sm text-slate-600">Cliente: {project.client_name}</p>
                <p className="text-xs text-slate-500">Tasks filtradas: {project.filtered_task_count}</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/app/projects/${project.id}/kanban`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Abrir kanban do projeto
                </Link>
                <button
                  type="button"
                  onClick={() => toggleProject(project.id)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  {collapsedByProject[project.id] ? 'Mostrar' : 'Ocultar'}
                </button>
              </div>
            </header>

            {!collapsedByProject[project.id] ? (
              project.columns.length === 0 ? (
                <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Este projeto ainda nao possui colunas no kanban.
                </p>
              ) : (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {project.columns.map((column) => (
                    <div
                      key={column.id}
                      className="w-72 min-w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">{column.name}</h4>
                        <span className="text-xs text-slate-500">{column.tasks.length} tasks</span>
                      </div>

                      <div
                        className="mt-3 flex min-h-24 flex-col gap-2 rounded-lg bg-slate-50 p-2"
                        onDragOver={(event) => event.preventDefault()}
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
                          <p className="flex min-h-16 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
                            Solte tasks aqui.
                          </p>
                        ) : (
                          column.tasks.map((task) => (
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
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) =>
                                handleTaskDrop({
                                  event,
                                  targetProjectId: project.id,
                                  targetColumnId: column.id,
                                  beforeTaskId: task.id,
                                })
                              }
                              className="cursor-grab rounded-md border border-slate-200 bg-white p-3"
                            >
                              <h5 className="text-sm font-semibold text-slate-900">{task.title}</h5>
                              {task.description ? (
                                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{task.description}</p>
                              ) : null}
                              <p className="mt-2 text-xs text-slate-500">
                                Priority: {task.priority ?? '-'} | Due: {task.due_date ?? '-'}
                              </p>
                            </div>
                          ))
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
