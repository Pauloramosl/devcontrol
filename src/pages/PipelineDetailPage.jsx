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

    const confirmed = window.confirm(`Excluir coluna "${column.name}" do pipeline?`)
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
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando pipeline...</p>
      </section>
    )
  }

  if (!pipeline) {
    return (
      <section className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error || 'Pipeline nao encontrado.'}</p>
        <Link
          to="/app/pipelines"
          className="inline-block rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 transition hover:bg-red-100"
        >
          Voltar para pipelines
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{pipeline.name}</h2>
          <p className="text-sm text-slate-600">Gerencie as colunas do template e sua ordem.</p>
        </div>

        <Link
          to="/app/pipelines"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Voltar
        </Link>
      </div>

      <form
        onSubmit={handleCreateColumn}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <input
          type="text"
          value={newColumnName}
          onChange={(event) => setNewColumnName(event.target.value)}
          placeholder="Nome da coluna"
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

      {saving ? (
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
          Salvando alteracoes...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {columns.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhuma coluna cadastrada neste pipeline.</p>
        </div>
      ) : (
        <ul className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
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
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDropOnColumn(event, column.id)}
              className="flex cursor-grab flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{column.name}</p>
                <p className="text-xs text-slate-500">Ordem: {column.column_order}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRenameColumn(column)}
                  disabled={saving}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Renomear
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteColumn(column)}
                  disabled={saving}
                  className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}

          <li
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropToEnd}
            className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-center text-xs text-slate-500"
          >
            Solte aqui para mover a coluna para o final
          </li>
        </ul>
      )}
    </section>
  )
}

export default PipelineDetailPage
