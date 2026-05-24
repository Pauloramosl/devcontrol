import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlerts } from '../context/AlertsContext.jsx'
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
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Select } from '../components/ui/Select.jsx'
import { AudioTranscriptionButton } from '../components/ui/AudioTranscriptionButton.jsx'

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
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const EVENT_META = {
  CREATE_TASK: { label: 'Criou tarefa', icon: '＋', color: 'text-dn-success', bg: 'bg-dn-success/10', border: 'border-dn-success/20' },
  EDIT_TASK: { label: 'Editou tarefa', icon: '✎', color: 'text-dn-accent', bg: 'bg-dn-accent/10', border: 'border-dn-accent/20' },
  MOVE_TASK: { label: 'Moveu tarefa', icon: '→', color: 'text-dn-warning', bg: 'bg-dn-warning/10', border: 'border-dn-warning/20' },
  DELETE_TASK: { label: 'Removeu tarefa', icon: '✕', color: 'text-dn-danger', bg: 'bg-dn-danger/10', border: 'border-dn-danger/20' },
}

const FIELD_LABELS = {
  title: 'Título',
  description: 'Descrição',
  priority: 'Prioridade',
  due_date: 'Prazo',
  rank: 'Ordem',
  column_id: 'Coluna',
}

const PRIORITY_LABELS = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  '': 'Normal',
}

function humanizeFieldValue(key, val) {
  if (val === null || val === undefined || val === '') return '—'
  if (key === 'priority') return PRIORITY_LABELS[val] ?? val
  if (key === 'column_id') return 'Outra coluna'
  if (key === 'rank') return null // Hide rank changes, not meaningful to the user
  if (key === 'description' && String(val).length > 60) return `${String(val).substring(0, 60)}…`
  return String(val)
}

function getLogChanges(log) {
  const oldVal = log.old_value && typeof log.old_value === 'object' ? log.old_value : {}
  const newVal = log.new_value && typeof log.new_value === 'object' ? log.new_value : {}

  const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)])
  const changes = []

  for (const key of allKeys) {
    if (key === 'rank') continue
    const prev = oldVal[key] ?? null
    const next = newVal[key] ?? null
    if (String(prev ?? '') === String(next ?? '') && log.event_type !== 'CREATE_TASK') continue

    changes.push({
      field: FIELD_LABELS[key] ?? key,
      from: humanizeFieldValue(key, prev),
      to: humanizeFieldValue(key, next),
    })
  }

  return changes
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
  const { refresh: refreshAlerts } = useAlerts()

  const [project, setProject] = useState(null)
  const [columns, setColumns] = useState([])
  const [logs, setLogs] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [newColumnName, setNewColumnName] = useState('')
  const [taskTitlesByColumn, setTaskTitlesByColumn] = useState({})
  const [editingTask, setEditingTask] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: '',
    due_date: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [logsOpen, setLogsOpen] = useState(false)

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
        setError('Projeto não encontrado.')
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

  // Silent reload: re-fetches data without showing the loading skeleton
  const silentReload = useCallback(async () => {
    if (!ownerId || !projectId) return

    try {
      const [columnsData, tasksData, logsData] = await Promise.all([
        listProjectColumns({ ownerId, projectId }),
        listProjectTasks({ ownerId, projectId }),
        listProjectTaskLogs({ ownerId, projectId }),
      ])

      setColumns(buildColumnsWithTasks(columnsData, tasksData))
      setLogs(logsData)
    } catch (_err) {
      // Silent — background sync only
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
    if (!ownerId || !projectId || !newColumnName.trim()) return

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
    if (nextName === null || !nextName.trim()) return

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
      `Excluir coluna "${column.name}"? As tarefas desta coluna serão removidas definitivamente.`
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
      setError('Título da tarefa é obrigatório.')
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
      refreshAlerts()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTranscription = (text) => {
    setEditForm((current) => {
      const existing = current.description || ''
      const nextValue = existing ? `${existing} ${text}` : text
      return {
        ...current,
        description: nextValue,
      }
    })
  }

  const openEditTaskModal = (task) => {
    setEditError('')
    setEditingTask(task)
    setEditForm({
      title: task.title ?? '',
      description: task.description ?? '',
      priority: task.priority ?? '',
      due_date: task.due_date ?? '',
    })
  }

  const closeEditTaskModal = () => {
    setEditingTask(null)
    setEditError('')
    setEditForm({
      title: '',
      description: '',
      priority: '',
      due_date: '',
    })
  }

  const handleSaveTaskEdit = async (event) => {
    event.preventDefault()

    if (!ownerId || !editingTask) return

    const title = String(editForm.title ?? '').trim()
    if (!title) {
      setEditError('Título da tarefa é obrigatório.')
      return
    }

    setEditError('')
    setEditSaving(true)
    setError('')

    try {
      await updateTask({
        ownerId,
        taskId: editingTask.id,
        input: {
          title,
          description: editForm.description,
          priority: editForm.priority,
          due_date: editForm.due_date,
        },
      })

      await loadKanban()
      refreshAlerts()
      closeEditTaskModal()
    } catch (saveError) {
      setEditError(saveError.message)
    } finally {
      setEditSaving(false)
    }
  }

  const handleTaskDrop = async (event, targetColumnId, beforeTaskId = null) => {
    event.preventDefault()
    event.currentTarget.classList.remove('ring-2', 'ring-dn-accent', 'bg-dn-bg-hover')

    const payload = getDragPayload(event)
    if (!payload || payload.type !== 'task') return
    event.stopPropagation()
    if (!ownerId) return

    const taskId = payload.taskId

    // --- Optimistic UI update: move card instantly in local state ---
    const previousColumns = columns
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, tasks: [...col.tasks] }))

      // Find and remove the task from its current column
      let movedTask = null
      for (const col of next) {
        const idx = col.tasks.findIndex((t) => t.id === taskId)
        if (idx !== -1) {
          movedTask = col.tasks.splice(idx, 1)[0]
          break
        }
      }
      if (!movedTask) return prev

      // Insert into target column
      const targetCol = next.find((col) => col.id === targetColumnId)
      if (!targetCol) return prev

      movedTask = { ...movedTask, column_id: targetColumnId }

      if (beforeTaskId) {
        const beforeIdx = targetCol.tasks.findIndex((t) => t.id === beforeTaskId)
        if (beforeIdx >= 0) {
          targetCol.tasks.splice(beforeIdx, 0, movedTask)
        } else {
          targetCol.tasks.push(movedTask)
        }
      } else {
        targetCol.tasks.push(movedTask)
      }

      return next
    })

    // --- Background API call ---
    setError('')
    try {
      await moveTask({
        ownerId,
        taskId,
        toColumnId: targetColumnId,
        beforeTaskId,
      })
      // Silent sync to get correct ranks/logs from server
      silentReload()
    } catch (moveError) {
      // Revert on failure
      setColumns(previousColumns)
      setError(moveError.message)
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

    // --- Optimistic UI update: reorder columns instantly ---
    const previousColumns = columns
    setColumns((prev) => {
      const colMap = new Map(prev.map((c) => [c.id, c]))
      return reordered.map((id) => colMap.get(id)).filter(Boolean)
    })

    setError('')
    try {
      await reorderProjectColumns({
        ownerId,
        projectId,
        previousOrderedColumnIds: orderedIds,
        orderedColumnIds: reordered,
      })
      silentReload()
    } catch (reorderError) {
      setColumns(previousColumns)
      setError(reorderError.message)
    }
  }

  if (loading) {
    return (
      <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6 animate-dn-shimmer">
        <p className="text-dn-body text-dn-text-muted">Carregando kanban do projeto...</p>
      </section>
    )
  }

  if (!project) {
    return (
      <section className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-lg p-6">
        <p className="text-dn-body text-dn-danger">{error || 'Projeto não encontrado.'}</p>
        <Link to="/app/projects">
          <Button variant="ghost" className="mt-4 text-dn-danger">Voltar para projetos</Button>
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg">
        <div>
          <h2 className="text-[24px] font-semibold text-white tracking-tight flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-dn-accent/20 flex items-center justify-center text-dn-accent">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
             </div>
             Kanban do Projeto
          </h2>
          <div className="flex items-center gap-2 mt-2 text-dn-caption text-dn-text-secondary">
            <span>{project.service_type ?? 'Projeto sem tipo'}</span>
            <span className="w-1 h-1 rounded-full bg-dn-text-muted"></span>
            <span>{project.client_name}</span>
            <span className="w-1 h-1 rounded-full bg-dn-text-muted"></span>
            <span className="text-dn-accent">{columns.length} Colunas</span>
            <span className="w-1 h-1 rounded-full bg-dn-text-muted"></span>
            <span className="text-white">{totalTasks} Tarefas</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to={`/app/projects/${project.id}`}>
            <Button variant="ghost">Voltar ao Projeto</Button>
          </Link>
        </div>
      </div>

      {/* FORMULÁRIO DE NOVA COLUNA */}
      <form
        onSubmit={handleCreateColumn}
        className="flex flex-col gap-3 rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-6 shadow-lg sm:flex-row items-end"
      >
        <div className="flex-1 w-full">
          <label className="block text-dn-label text-dn-text-muted mb-2">NOVA COLUNA DE FLUXO</label>
          <Input
            type="text"
            value={newColumnName}
            onChange={(event) => setNewColumnName(event.target.value)}
            placeholder="Ex: Em Andamento, Revisão"
          />
        </div>
        <Button
          type="submit"
          disabled={saving || !newColumnName.trim()}
          className="w-full sm:w-auto"
        >
          {saving ? 'Criando...' : 'CRIAR COLUNA'}
        </Button>
      </form>

      {error ? (
        <p className="rounded-dn-md border-[0.5px] border-dn-danger/50 bg-[#161B26] p-4 text-sm text-dn-danger">{error}</p>
      ) : null}

      {/* QUADRO KANBAN */}
      {columns.length === 0 ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-8 text-center flex flex-col items-center justify-center min-h-[300px] opacity-70">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 text-dn-text-muted mb-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          <p className="text-dn-body text-dn-text-muted">Nenhuma coluna criada ainda.</p>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-dn-border scrollbar-track-transparent">
          {columns.map((column) => (
            <article
              key={column.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleColumnDrop(event, column.id)}
              className="w-80 min-w-[320px] rounded-[24px] border-[0.5px] border-dn-border bg-dn-bg-card shadow-xl flex flex-col backdrop-blur-md relative overflow-hidden"
            >
              {/* Subtle top edge glow */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dn-accent/20 to-transparent"></div>
              
              <header
                draggable
                onDragStart={(event) =>
                  setDragPayload(event, {
                    type: 'column',
                    columnId: column.id,
                  })
                }
                className="flex flex-col gap-2 p-5 pb-3 cursor-grab active:cursor-grabbing border-b-[0.5px] border-dn-border/50 bg-dn-bg-elevated/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-dn-body font-bold text-white tracking-wide">{column.name}</h3>
                    <span className="text-[10px] bg-white/10 text-dn-text-secondary px-2 py-0.5 rounded-full font-mono">{column.tasks.length}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity absolute top-5 right-5 group-hover:opacity-100">
                     {/* Para tornar visível em mobile, seria melhor não depender só do hover, mas no desktop fica mais limpo */}
                  </div>
                </div>

                <div className="flex gap-2 justify-between w-full mt-2">
                  <button
                    type="button"
                    onClick={() => handleRenameColumn(column)}
                    className="text-[10px] text-dn-text-muted hover:text-white uppercase tracking-wider font-semibold"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteColumn(column)}
                    className="text-[10px] text-dn-danger/70 hover:text-dn-danger uppercase tracking-wider font-semibold"
                  >
                    Excluir
                  </button>
                </div>
              </header>

              <div
                className="flex-1 flex flex-col gap-3 p-4 bg-dn-bg-card/50 min-h-[150px] transition-colors rounded-b-[24px]"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.currentTarget.classList.add('ring-2', 'ring-dn-accent', 'bg-dn-bg-hover');
                }}
                onDragLeave={(event) => {
                  event.currentTarget.classList.remove('ring-2', 'ring-dn-accent', 'bg-dn-bg-hover');
                }}
                onDrop={(event) => handleTaskDrop(event, column.id, null)}
              >
                {column.tasks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-dn-border/50 rounded-xl text-xs text-dn-text-muted p-4 text-center">
                    Solte tarefas aqui.
                  </div>
                ) : (
                  column.tasks.map((task) => (
                    <div
                      key={task.id}
                      id={`task-card-${task.id}`}
                      draggable
                      onDragStart={(event) => {
                        event.stopPropagation()
                        setDragPayload(event, {
                          type: 'task',
                          taskId: task.id,
                        })
                        event.currentTarget.classList.add('opacity-50', 'border-dn-accent')
                      }}
                      onDragEnd={(event) => {
                        event.currentTarget.classList.remove('opacity-50', 'border-dn-accent')
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.currentTarget.classList.add('border-dn-accent')
                      }}
                      onDragLeave={(event) => {
                        event.stopPropagation()
                        event.currentTarget.classList.remove('border-dn-accent')
                      }}
                      onDrop={(event) => handleTaskDrop(event, column.id, task.id)}
                      className="group cursor-grab active:cursor-grabbing bg-dn-bg-elevated border-[0.5px] border-dn-border p-4 rounded-xl hover:border-dn-border-hover transition-all shadow-sm flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                         <h4 className="text-dn-body text-white font-medium leading-tight">{task.title}</h4>
                         {task.priority === 'high' && (
                           <Badge variant="danger" className="scale-75 origin-top-right whitespace-nowrap">Alta</Badge>
                         )}
                         {task.priority === 'medium' && (
                           <Badge variant="warning" className="scale-75 origin-top-right whitespace-nowrap">Média</Badge>
                         )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-dn-text-secondary font-mono flex items-center gap-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          {task.due_date ? task.due_date.substring(5) : 'Sem data'}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => openEditTaskModal(task)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-dn-accent font-semibold px-2 py-1 bg-dn-accent/10 rounded-md"
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* ADD TASK FORM INLINE */}
                <div className="mt-auto pt-4 flex gap-2">
                  <Input
                    type="text"
                    value={taskTitlesByColumn[column.id] ?? ''}
                    onChange={(event) =>
                      setTaskTitlesByColumn((current) => ({
                        ...current,
                        [column.id]: event.target.value,
                      }))
                    }
                    placeholder="Nova tarefa..."
                    className="flex-1 h-9 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateTask(column.id);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handleCreateTask(column.id)}
                    disabled={saving || !(taskTitlesByColumn[column.id]?.trim())}
                    className="h-9 px-3"
                  >
                    +
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* LOG DE ATIVIDADES — Collapsible Timeline */}
      <section className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setLogsOpen(prev => !prev)}
          className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-dn-text-secondary group-hover:text-dn-accent transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div className="text-left">
              <h3 className="text-dn-h3 text-white">Histórico de Atividades</h3>
              <p className="text-xs text-dn-text-muted mt-0.5">
                {logs.length === 0 ? 'Nenhum evento registrado' : `${logs.length} evento${logs.length !== 1 ? 's' : ''} registrado${logs.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`w-5 h-5 text-dn-text-muted transition-transform duration-300 ${logsOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {logsOpen && (
          <div className="border-t-[0.5px] border-dn-border">
            {logs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-dn-text-muted">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <p className="text-sm text-dn-text-muted">Nenhuma atividade registrada ainda.</p>
                <p className="text-xs text-dn-text-muted mt-1">Crie, mova ou edite tarefas para gerar o histórico.</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-dn-border scrollbar-track-transparent">
                <div className="relative pl-10 pr-6 py-4">
                  {/* Timeline vertical line */}
                  <div className="absolute left-[27px] top-4 bottom-4 w-[1px] bg-gradient-to-b from-dn-border via-dn-border/50 to-transparent"></div>

                  <ul className="space-y-1">
                    {logs.map((log) => {
                      const meta = EVENT_META[log.event_type] ?? EVENT_META.EDIT_TASK
                      const changes = getLogChanges(log)

                      return (
                        <li key={log.id} className="relative group">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[22px] top-4 w-5 h-5 rounded-full ${meta.bg} border ${meta.border} flex items-center justify-center text-[9px] ${meta.color} z-10`}>
                            {meta.icon}
                          </div>

                          <div className="rounded-xl p-4 hover:bg-white/[0.02] transition-colors">
                            {/* Header row */}
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                                <span className="text-xs text-dn-text-muted">·</span>
                                <span className="text-sm font-medium text-white truncate">{log.task_title}</span>
                              </div>
                              <span className="text-[10px] text-dn-text-muted whitespace-nowrap font-mono">
                                {formatDateTime(log.created_at)}
                              </span>
                            </div>

                            {/* Changes as diff pills */}
                            {changes.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {changes.map((change, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[11px] bg-white/[0.03] border-[0.5px] border-white/5 rounded-lg px-2.5 py-1.5">
                                    <span className="text-dn-text-muted font-medium">{change.field}</span>
                                    {log.event_type !== 'CREATE_TASK' && change.from && (
                                      <>
                                        <span className="text-dn-text-muted/50 line-through">{change.from}</span>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-dn-text-muted/30 flex-shrink-0"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                      </>
                                    )}
                                    <span className="text-white">{change.to}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MODAL EDITAR TASK */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-[24px] bg-dn-bg-card border-[0.5px] border-dn-border p-8 shadow-2xl relative overflow-hidden">
            {/* Modal header accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-dn-accent"></div>
            
            <h3 className="text-2xl font-bold text-white tracking-tight">Editar Tarefa</h3>
            <p className="mt-1 text-dn-body text-dn-text-secondary">
              Atualize as informações da tarefa. Estas ações são auditadas.
            </p>

            <form onSubmit={handleSaveTaskEdit} className="mt-8 space-y-5">
              <div>
                <label className="block text-dn-label text-dn-text-muted mb-2">TÍTULO *</label>
                <Input
                  type="text"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-dn-label text-dn-text-muted">DESCRIÇÃO</label>
                  <AudioTranscriptionButton
                    onTranscription={handleTranscription}
                    placeholderText="Transcrever descrição por voz"
                  />
                </div>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md px-4 py-3 text-dn-body text-white outline-none focus:border-dn-accent/50 focus:ring-1 focus:ring-dn-accent/50 transition-all resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-dn-label text-dn-text-muted mb-2">PRIORIDADE</label>
                  <Select
                    value={editForm.priority}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                  >
                    <option value="">Normal</option>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta (Urgente)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-dn-label text-dn-text-muted mb-2">DATA DE ENTREGA (PRAZO)</label>
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        due_date: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {editError && (
                <p className="rounded-dn-md border-[0.5px] border-dn-danger/50 bg-[#161B26] px-4 py-3 text-dn-body text-dn-danger">
                  {editError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t-[0.5px] border-dn-border mt-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeEditTaskModal}
                  disabled={editSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={editSaving}
                >
                  {editSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default ProjectKanbanPage
