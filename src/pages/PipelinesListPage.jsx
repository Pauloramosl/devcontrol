import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { createPipeline, deletePipeline, listPipelines } from '../lib/pipelines.js'

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function PipelinesListPage() {
  const { user } = useAuth()
  const ownerId = user?.id

  const [pipelines, setPipelines] = useState([])
  const [newPipelineName, setNewPipelineName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadPipelines = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await listPipelines({ ownerId })
      setPipelines(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadPipelines()
  }, [loadPipelines])

  const handleCreatePipeline = async (event) => {
    event.preventDefault()
    if (!ownerId) return

    setSaving(true)
    setError('')

    try {
      await createPipeline({
        ownerId,
        name: newPipelineName,
      })
      setNewPipelineName('')
      await loadPipelines()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePipeline = async (pipeline) => {
    if (!ownerId) return

    const confirmed = window.confirm(
      `Excluir pipeline "${pipeline.name}"? As colunas do template tambem serao excluidas.`,
    )
    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await deletePipeline({
        ownerId,
        pipelineId: pipeline.id,
      })
      await loadPipelines()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Pipelines</h2>
          <p className="mt-1 text-sm text-slate-600">
            Templates de colunas para reutilizar ao criar projetos.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreatePipeline}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <input
          type="text"
          value={newPipelineName}
          onChange={(event) => setNewPipelineName(event.target.value)}
          placeholder="Nome do pipeline"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Criar Pipeline
        </button>
      </form>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando pipelines...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && !error && pipelines.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhum pipeline criado ainda.</p>
        </div>
      ) : null}

      {!loading && !error && pipelines.length > 0 ? (
        <ul className="space-y-3">
          {pipelines.map((pipeline) => (
            <li key={pipeline.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{pipeline.name}</h3>
                  <p className="text-xs text-slate-500">
                    Atualizado em: {formatDateTime(pipeline.updated_at)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/app/pipelines/${pipeline.id}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
                  >
                    Gerenciar Colunas
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeletePipeline(pipeline)}
                    disabled={saving}
                    className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default PipelinesListPage
