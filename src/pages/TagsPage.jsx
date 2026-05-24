import { useCallback, useEffect, useState } from 'react'
import { createTag, deleteTag, listTags } from '../lib/tags.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'

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
      setError('Nome da tag é obrigatório.')
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg">
        <div>
          <h2 className="text-[24px] font-semibold text-white tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-dn-accent/20 flex items-center justify-center text-dn-accent">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
            </div>
            Tags
          </h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">
            Gerencie tags para uso nos filtros e no detalhe de clientes.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreateTag}
        className="flex flex-col sm:flex-row gap-3 bg-dn-bg-elevated border-[0.5px] border-dn-border p-4 rounded-dn-xl items-center"
      >
        <div className="flex-1 w-full">
          <Input
            type="text"
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            placeholder="Nome da tag"
            className="w-full"
          />
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto h-11"
        >
          {saving ? 'Salvando...' : 'Adicionar Tag'}
        </Button>
      </form>

      {error ? (
        <p className="rounded-dn-md border-[0.5px] border-dn-danger/50 bg-[#161B26] p-4 text-sm text-dn-danger">{error}</p>
      ) : null}

      {loading ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-8 animate-dn-shimmer text-center">
          <p className="text-dn-body text-dn-text-muted">Carregando tags...</p>
        </div>
      ) : null}

      {!loading && !error && tags.length === 0 ? (
        <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-12 text-center opacity-70">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 text-dn-text-muted mx-auto mb-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
          <p className="text-dn-body text-dn-text-muted">Nenhuma tag cadastrada.</p>
        </div>
      ) : null}

      {!loading && !error && tags.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between rounded-dn-lg border-[0.5px] border-dn-border bg-dn-bg-card px-4 py-3 shadow-lg transition-dn hover:border-dn-border-hover group"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-dn-accent/50 group-hover:bg-dn-accent transition-colors"></span>
                <span className="text-dn-body font-medium text-white">{tag.name}</span>
              </div>
              <Button
                type="button"
                variant="danger"
                onClick={() => handleDeleteTag(tag.id)}
                className="px-3 py-1.5 h-auto text-xs"
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default TagsPage
