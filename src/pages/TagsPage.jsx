import { useCallback, useEffect, useState } from 'react'
import { createTag, deleteTag, listTags } from '../lib/tags.js'
import { useAuth } from '../context/AuthContext.jsx'

function TagsPage() {
  const { user } = useAuth()
  const ownerId = user?.id

  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newTagName, setNewTagName] = useState('')

  const loadTags = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await listTags({ ownerId })
      setTags(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  const handleCreateTag = async (event) => {
    event.preventDefault()
    setError('')

    if (!newTagName.trim()) {
      setError('Nome da tag e obrigatorio.')
      return
    }

    setSaving(true)

    try {
      await createTag({ ownerId, name: newTagName })
      setNewTagName('')
      await loadTags()
    } catch (createError) {
      setError(createError.message)
      setSaving(false)
      return
    }

    setSaving(false)
  }

  const handleDeleteTag = async (tagId) => {
    setError('')

    const confirmed = window.confirm('Remover esta tag?')
    if (!confirmed) return

    try {
      await deleteTag({ ownerId, tagId })
      await loadTags()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Tags</h2>
        <p className="mt-1 text-sm text-slate-600">
          Gerencie tags para uso nos filtros e no detalhe de clientes.
        </p>
      </div>

      <form
        onSubmit={handleCreateTag}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <input
          type="text"
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          placeholder="Nome da tag"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? 'Salvando...' : 'Adicionar Tag'}
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando tags...
        </p>
      ) : null}

      {!loading && !error && tags.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Nenhuma tag cadastrada.
        </p>
      ) : null}

      {!loading && !error && tags.length > 0 ? (
        <ul className="space-y-2">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="text-sm text-slate-800">{tag.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteTag(tag.id)}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default TagsPage
