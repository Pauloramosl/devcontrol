import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  createProjectColumn,
  createTask,
  deleteProjectColumn,
  listProjectColumns,
  listProjectTaskLogs,
  listProjectTasks,
  moveTask,
  renameProjectColumn,
  reorderProjectColumns,
  updateTask,
} from '../lib/kanban.js'
import { getProjectById } from '../lib/projects.js'

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
  const serialized = JSON.stringify(payload)
  event.dataTransfer.setData('text/plain', serialized)
  event.dataTransfer.effectAllowed = 'move'
}

function moveArrayItem(items, fromIndex, toIndex) {
  const nextItems = [...items]
  const [removed] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, removed)
  return nextItems
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleString()
}

function formatLogValue(value) {
  if (!value || typeof value !== 'object') return '-'

  const pairs = Object.entries(value)
  if (!pairs.length) return '-'

  return pairs
    .map(([key, fieldValue]) => `${key}: ${fieldValue ?? '-'}`)
    .join(' | ')
}

function buildColumnsWithTasks(columns, tasks) {
  const map = new Map()
  for (const column of columns) {
    map.set(column.id, {
      ...column,
      tasks: [],
    })
  }

  for (const task of tasks) {
    if (!map.has(task.column_id)) continue
    map.get(task.column_id).tasks.push(task)
  }

  const result = Array.from(map.values())
  for (const column of result) {
    column.tasks.sort((a, b) => a.rank.localeCompare(b.rank))
  }

  return result
}

function ProjectKanbanPage() {
  const { id: projectId } = useParams()
  const { user } = useAuth()
  const ownerId = user?.id

  const [project, setProject] = useState(null)
  const [columns, setColumns] = useState([])
  const [logs, setLogs] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [newColumnName, setNewColumnName] = useState('')
  const [taskTitlesByColumn, setTaskTitlesByColumn] = useState({})

  const loadKanban = useCallback(async () => {
    if (!ownerId || !projectId) return

    setLoading(true)
    setError('')

    try {
      const [projectData, columnsData, tasksData, logsData] = await Promise.all([
        getProjectById({ ownerId, projectId }),
        listProjectColumns({ ownerId, projectId }),
        listProjectTasks({ ownerId, projectId }),
        listProjectTaskLogs({ ownerId, projectId }),
      ])

      if (!projectData) {
        setProject(null)
        setColumns([])
        setLogs([])
        setError('Projeto nao encontrado.')
        return
      }

      setProject(projectData)
      setColumns(buildColumnsWithTasks(columnsData, tasksData))
      setLogs(logsData)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId, projectId])

  useEffect(() => {
    loadKanban()
  }, [loadKanban])

  const totalTasks = useMemo(
    () => columns.reduce((sum, column) => sum + column.tasks.length, 0),
    [columns],
  )

  const handleCreateColumn = async (event) => {
    event.preventDefault()
    if (!ownerId || !projectId) return

    setError('')
    setSaving(true)

    try {
      await createProjectColumn({
        ownerId,
        projectId,
        name: newColumnName,
      })
      setNewColumnName('')
      await loadKanban()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRenameColumn = async (column) => {
    if (!ownerId) return

    const nextName = window.prompt('Novo nome da coluna:', column.name)
    if (nextName === null) return

    setError('')
    setSaving(true)

    try {
      await renameProjectColumn({
        ownerId,
        columnId: column.id,
        name: nextName,
      })
      await loadKanban()
    } catch (renameError) {
      setError(renameError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteColumn = async (column) => {
    if (!ownerId) return

    const confirmed = window.confirm(
      'Excluir coluna? As tarefas desta coluna serao removidas por cascade.',
    )
    if (!confirmed) return

    setError('')
    setSaving(true)

    try {
      await deleteProjectColumn({
        ownerId,
        columnId: column.id,
      })
      await loadKanban()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTask = async (columnId) => {
    if (!ownerId || !projectId) return

    const title = String(taskTitlesByColumn[columnId] ?? '').trim()
    if (!title) {
      setError('Titulo da tarefa e obrigatorio.')
      return
    }

    setError('')
    setSaving(true)

    try {
      await createTask({
        ownerId,
        projectId,
        columnId,
        input: { title },
      })

      setTaskTitlesByColumn((current) => ({
        ...current,
        [columnId]: '',
      }))

      await loadKanban()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditTask = async (task) => {
    if (!ownerId) return

    const title = window.prompt('Titulo da tarefa:', task.title)
    if (title === null) return
    if (!title.trim()) {
      setError('Titulo da tarefa e obrigatorio.')
      return
    }

    const description = window.prompt('Descricao:', task.description ?? '')
    if (description === null) return

    const priority = window.prompt('Priority (low|medium|high):', task.priority ?? '')
    if (priority === null) return

    const dueDate = window.prompt('Due date (YYYY-MM-DD):', task.due_date ?? '')
    if (dueDate === null) return

    setError('')
    setSaving(true)

    try {
      await updateTask({
        ownerId,
        taskId: task.id,
        input: {
          title,
          description,
          priority,
          due_date: dueDate,
        },
      })
      await loadKanban()
    } catch (editError) {
      setError(editError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTaskDrop = async (event, targetColumnId, beforeTaskId = null) => {
    event.preventDefault()
    event.stopPropagation()

    const payload = getDragPayload(event)
    if (!payload || payload.type !== 'task') return
    if (!ownerId) return

    setError('')
    setSaving(true)

    try {
      await moveTask({
        ownerId,
        taskId: payload.taskId,
        toColumnId: targetColumnId,
        beforeTaskId,
      })
      await loadKanban()
    } catch (moveError) {
      setError(moveError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleColumnDrop = async (event, targetColumnId) => {
    event.preventDefault()

    const payload = getDragPayload(event)
    if (!payload || !ownerId || !projectId) return

    if (payload.type === 'task') {
      await handleTaskDrop(event, targetColumnId, null)
      return
    }

    if (payload.type !== 'column') return
    if (payload.columnId === targetColumnId) return

    const orderedIds = columns.map((column) => column.id)
    const fromIndex = orderedIds.indexOf(payload.columnId)
    const toIndex = orderedIds.indexOf(targetColumnId)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = moveArrayItem(orderedIds, fromIndex, toIndex)

    setError('')
    setSaving(true)

    try {
      await reorderProjectColumns({
        ownerId,
        projectId,
        orderedColumnIds: reordered,
      })
      await loadKanban()
    } catch (reorderError) {
      setError(reorderError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando kanban...</p>
      </section>
    )
  }

  if (!project) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error || 'Projeto nao encontrado.'}</p>
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
          <h2 className="text-2xl font-semibold text-slate-900">Kanban do Projeto</h2>
          <p className="text-sm text-slate-600">
            {project.service_type ?? 'Projeto sem tipo'} | Cliente: {project.client_name}
          </p>
          <p className="text-xs text-slate-500">
            Colunas: {columns.length} | Tasks: {totalTasks}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/app/projects/${project.id}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Voltar ao Projeto
          </Link>
        </div>
      </div>

      <form
        onSubmit={handleCreateColumn}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <input
          type="text"
          value={newColumnName}
          onChange={(event) => setNewColumnName(event.target.value)}
          placeholder="Nome da nova coluna"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Criar Coluna
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {columns.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhuma coluna criada ainda.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((column) => (
            <article
              key={column.id}
              draggable
              onDragStart={(event) =>
                setDragPayload(event, {
                  type: 'column',
                  columnId: column.id,
                })
              }
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleColumnDrop(event, column.id)}
              className="w-80 min-w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{column.name}</h3>
                  <p className="text-xs text-slate-500">Tarefas: {column.tasks.length}</p>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleRenameColumn(column)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-100"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteColumn(column)}
                    className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-700 transition hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              </header>

              <div
                className="mt-3 space-y-2 rounded-lg bg-slate-50 p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleTaskDrop(event, column.id, null)}
              >
                {column.tasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500">
                    Arraste tarefas para esta coluna.
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
                        })
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleTaskDrop(event, column.id, task.id)}
                      className="rounded-md border border-slate-200 bg-white p-3"
                    >
                      <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Priority: {task.priority ?? '-'} | Due: {task.due_date ?? '-'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleEditTask(task)}
                        className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-100"
                      >
                        Editar task
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={taskTitlesByColumn[column.id] ?? ''}
                  onChange={(event) =>
                    setTaskTitlesByColumn((current) => ({
                      ...current,
                      [column.id]: event.target.value,
                    }))
                  }
                  placeholder="Nova tarefa (titulo)"
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-xs outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
                <button
                  type="button"
                  onClick={() => handleCreateTask(column.id)}
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Add
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Atividade</h3>
        <p className="mt-1 text-sm text-slate-600">Logs de criacao, movimento e edicao de tarefas.</p>

        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Sem eventos registrados.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-800">
                  {log.event_type} | {log.task_title}
                </p>
                <p className="mt-1 text-xs text-slate-500">Old: {formatLogValue(log.old_value)}</p>
                <p className="text-xs text-slate-500">New: {formatLogValue(log.new_value)}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

export default ProjectKanbanPage
