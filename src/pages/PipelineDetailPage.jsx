import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  createPipelineColumn,
  deletePipelineColumn,
  getPipelineById,
  listPipelineColumns,
  renamePipelineColumn,
  reorderPipelineColumns,
} from '../lib/pipelines.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'

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

function moveArrayItem(items, fromIndex, toIndex) {
  const nextItems = [...items]
  const [removed] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, removed)
  return nextItems
}

function PipelineDetailPage() {
  const { id: pipelineId } = useParams()
  const { user } = useAuth()
  const ownerId = user?.id

  const [pipeline, setPipeline] = useState(null)
  const [columns, setColumns] = useState([])
  const [newColumnName, setNewColumnName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!ownerId || !pipelineId) return

    setLoading(true)
    setError('')

    try {
      const [pipelineData, columnsData] = await Promise.all([
        getPipelineById({ ownerId, pipelineId }),
        listPipelineColumns({ ownerId, pipelineId }),
      ])

      setPipeline(pipelineData)
      setColumns(columnsData)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId, pipelineId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateColumn = async (event) => {
    event.preventDefault()
    if (!ownerId || !pipelineId) return

    if (!newColumnName.trim()) return;

    setSaving(true)
    setError('')

    try {
      await createPipelineColumn({
        ownerId,
        pipelineId,
        name: newColumnName,
      })
      setNewColumnName('')
      await loadData()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRenameColumn = async (column) => {
    if (!ownerId) return

    const name = window.prompt('Novo nome da coluna:', column.name)
    if (name === null) return

    setSaving(true)
    setError('')

    try {
      await renamePipelineColumn({
        ownerId,
        columnId: column.id,
        name,
      })
      await loadData()
    } catch (renameError) {
      setError(renameError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteColumn = async (column) => {
    if (!ownerId) return

    const confirmed = window.confirm(`Tem certeza que deseja excluir a coluna "${column.name}"?`)
    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await deletePipelineColumn({
        ownerId,
        columnId: column.id,
      })
      await loadData()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  const persistReorder = async (orderedIds) => {
    if (!ownerId || !pipelineId) return

    const previousOrderedIds = columns.map((column) => column.id)
    const hasChanges =
      orderedIds.length === previousOrderedIds.length &&
      orderedIds.some((columnId, index) => columnId !== previousOrderedIds[index])

    if (!hasChanges) return

    setSaving(true)
    setError('')

    try {
      await reorderPipelineColumns({
        ownerId,
        pipelineId,
        previousOrderedColumnIds: previousOrderedIds,
        orderedColumnIds: orderedIds,
      })
      await loadData()
    } catch (reorderError) {
      setError(reorderError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDropOnColumn = async (event, targetColumnId) => {
    event.preventDefault()
    event.currentTarget.classList.remove('border-dn-accent', 'bg-dn-bg-hover')

    const payload = getDragPayload(event)
    if (!payload || payload.type !== 'pipeline-column') return
    if (payload.columnId === targetColumnId) return

    const orderedIds = columns.map((column) => column.id)
    const fromIndex = orderedIds.indexOf(payload.columnId)
    const toIndex = orderedIds.indexOf(targetColumnId)

    if (fromIndex < 0 || toIndex < 0) return

    const reordered = moveArrayItem(orderedIds, fromIndex, toIndex)
    await persistReorder(reordered)
  }

  const handleDropToEnd = async (event) => {
    event.preventDefault()
    event.currentTarget.classList.remove('border-dn-accent', 'bg-dn-bg-hover')

    const payload = getDragPayload(event)
    if (!payload || payload.type !== 'pipeline-column') return

    const orderedIds = columns.map((column) => column.id)
    const fromIndex = orderedIds.indexOf(payload.columnId)

    if (fromIndex < 0 || fromIndex === orderedIds.length - 1) return

    const reordered = moveArrayItem(orderedIds, fromIndex, orderedIds.length - 1)
    await persistReorder(reordered)
  }

  if (loading) {
    return (
      <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6">
        <p className="text-dn-body text-dn-text-muted animate-dn-shimmer">Carregando detalhes do pipeline...</p>
      </section>
    )
  }

  if (!pipeline) {
    return (
      <section className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-lg p-6">
        <p className="text-dn-body text-dn-danger">{error || 'Pipeline não encontrado.'}</p>
        <div className="mt-4">
          <Link to="/app/pipelines">
            <Button variant="ghost" className="text-dn-danger">Voltar para pipelines</Button>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg">
        <div>
          <h2 className="text-[24px] font-semibold text-white tracking-tight">{pipeline.name}</h2>
          <p className="text-dn-body text-dn-text-secondary mt-1">Gerencie as colunas do template e sua ordem no Kanban.</p>
        </div>

        <div className="flex gap-2">
          <Link to="/app/pipelines">
            <Button variant="ghost">Voltar</Button>
          </Link>
        </div>
      </div>

      {/* FORMULÁRIO DE NOVA COLUNA */}
      <form
        onSubmit={handleCreateColumn}
        className="flex flex-col sm:flex-row gap-4 bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg items-end"
      >
        <div className="flex-1 w-full">
          <label className="block text-dn-label text-dn-text-muted mb-2">NOVA COLUNA</label>
          <Input
            type="text"
            value={newColumnName}
            onChange={(event) => setNewColumnName(event.target.value)}
            placeholder="Ex: Backlog, Em Andamento, Concluído"
          />
        </div>
        <Button
          type="submit"
          disabled={saving || !newColumnName.trim()}
          className="w-full sm:w-auto"
        >
          {saving ? 'CRIANDO...' : 'CRIAR COLUNA'}
        </Button>
      </form>

      {saving && (
        <p className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-md p-3 text-dn-body text-dn-text-muted animate-pulse">
          Salvando alterações...
        </p>
      )}

      {error && (
        <p className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-md p-3 text-dn-body text-dn-danger">
          {error}
        </p>
      )}

      {/* LISTA DE COLUNAS (DRAG AND DROP) */}
      <div className="bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg">
        <h3 className="text-dn-h3 text-white mb-4">Ordem das Colunas</h3>
        
        {columns.length === 0 ? (
          <p className="text-dn-body text-dn-text-muted py-4">Nenhuma coluna cadastrada neste pipeline.</p>
        ) : (
          <ul className="space-y-3">
            {columns.map((column) => (
              <li
                key={column.id}
                draggable
                onDragStart={(event) =>
                  setDragPayload(event, {
                    type: 'pipeline-column',
                    columnId: column.id,
                  })
                }
                onDragOver={(event) => {
                  event.preventDefault();
                  event.currentTarget.classList.add('border-dn-accent', 'bg-dn-bg-hover');
                }}
                onDragLeave={(event) => {
                  event.currentTarget.classList.remove('border-dn-accent', 'bg-dn-bg-hover');
                }}
                onDrop={(event) => handleDropOnColumn(event, column.id)}
                className="flex cursor-grab active:cursor-grabbing items-center justify-between gap-4 rounded-dn-md border-[0.5px] border-dn-border bg-dn-bg-elevated p-4 hover:border-dn-border-hover transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="cursor-move text-dn-text-muted hover:text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                  </div>
                  <div>
                    <p className="text-dn-body font-semibold text-white">{column.name}</p>
                    <p className="text-[10px] uppercase text-dn-text-muted mt-0.5">Posição: {column.column_order}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRenameColumn(column)}
                    disabled={saving}
                    className="h-8 text-xs px-3"
                  >
                    Renomear
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDeleteColumn(column)}
                    disabled={saving}
                    className="h-8 text-xs px-3 text-dn-danger hover:text-dn-danger border-dn-danger/30 hover:bg-dn-danger/10"
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}

            {/* DROP TARGET NO FINAL */}
            <li
              onDragOver={(event) => {
                event.preventDefault()
                event.currentTarget.classList.add('border-dn-accent', 'bg-dn-bg-hover')
              }}
              onDragLeave={(event) => {
                event.currentTarget.classList.remove('border-dn-accent', 'bg-dn-bg-hover')
              }}
              onDrop={handleDropToEnd}
              className="rounded-dn-md border-[1px] border-dashed border-dn-border bg-transparent p-4 text-center text-dn-caption text-dn-text-muted transition-colors mt-4"
            >
              Solte aqui para mover a coluna para o final
            </li>
          </ul>
        )}
      </div>
    </section>
  )
}

export default PipelineDetailPage
