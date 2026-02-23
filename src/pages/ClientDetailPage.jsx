import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteClient, getClientById, setClientTags } from '../lib/clients.js'
import { listTags } from '../lib/tags.js'
import { useAuth } from '../context/AuthContext.jsx'

function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const ownerId = user?.id

  const [client, setClient] = useState(null)
  const [tags, setTags] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingTags, setSavingTags] = useState(false)
  const [deletingClient, setDeletingClient] = useState(false)
  const [error, setError] = useState('')
  const [tagError, setTagError] = useState('')
  const [tagSuccess, setTagSuccess] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!ownerId || !id) return

    let mounted = true

    const loadPage = async () => {
      setLoading(true)
      setError('')

      try {
        const [clientData, tagsData] = await Promise.all([
          getClientById({ ownerId, clientId: id }),
          listTags({ ownerId }),
        ])

        if (!mounted) return

        if (!clientData) {
          setError('Cliente nao encontrado.')
          return
        }

        setClient(clientData)
        setTags(tagsData)
        setSelectedTagIds(clientData.tags.map((tag) => tag.id))
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadPage()

    return () => {
      mounted = false
    }
  }, [id, ownerId])

  const selectedTagSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])

  const handleToggleTag = (tagId) => {
    setSelectedTagIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((currentId) => currentId !== tagId)
      }

      return [...current, tagId]
    })
  }

  const handleSaveTags = async () => {
    if (!ownerId || !id) return

    setTagError('')
    setTagSuccess('')
    setSavingTags(true)

    try {
      await setClientTags({
        ownerId,
        clientId: id,
        tagIds: selectedTagIds,
      })

      const refreshedClient = await getClientById({ ownerId, clientId: id })
      setClient(refreshedClient)
      setTagSuccess('Tags atualizadas com sucesso.')
    } catch (saveError) {
      setTagError(saveError.message)
    } finally {
      setSavingTags(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!ownerId || !id) return

    const confirmed = window.confirm('Excluir cliente?')
    if (!confirmed) return

    setDeleteError('')
    setDeletingClient(true)

    try {
      await deleteClient({ ownerId, clientId: id })
      navigate('/app/clients', { replace: true })
    } catch (deleteClientError) {
      setDeleteError(deleteClientError.message)
      setDeletingClient(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando detalhes do cliente...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
        <Link
          to="/app/clients"
          className="mt-3 inline-block rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 transition hover:bg-red-100"
        >
          Voltar para clientes
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{client.name}</h2>
          <p className="text-sm text-slate-600">Status: {client.status}</p>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/app/clients/${client.id}/edit`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Editar
          </Link>
          <Link
            to="/app/clients"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
          >
            Voltar
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2">
        <p className="text-sm text-slate-700">
          <strong>Email:</strong> {client.email ?? 'Nao informado'}
        </p>
        <p className="text-sm text-slate-700">
          <strong>Telefone:</strong> {client.phone ?? 'Nao informado'}
        </p>
        <p className="text-sm text-slate-700">
          <strong>Empresa:</strong> {client.company ?? 'Nao informado'}
        </p>
        <p className="text-sm text-slate-700">
          <strong>Documento:</strong> {client.document_number ?? 'Nao informado'}
        </p>
        <p className="text-sm text-slate-700 md:col-span-2">
          <strong>Notas:</strong> {client.notes ?? 'Sem notas'}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Tags do Cliente</h3>
        <p className="mt-1 text-sm text-slate-600">
          Associe ou remova tags para filtrar clientes na listagem.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {client.tags.length === 0 ? (
            <span className="text-sm text-slate-500">Cliente sem tags.</span>
          ) : (
            client.tags.map((tag) => (
              <span key={tag.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {tag.name}
              </span>
            ))
          )}
        </div>

        {tags.length === 0 ? (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Nenhuma tag cadastrada.{' '}
            <Link to="/app/tags" className="font-medium underline">
              Criar tags
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagSet.has(tag.id)}
                    onChange={() => handleToggleTag(tag.id)}
                    className="h-4 w-4"
                  />
                  {tag.name}
                </label>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleSaveTags}
                disabled={savingTags}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {savingTags ? 'Salvando tags...' : 'Salvar Tags'}
              </button>
            </div>
          </>
        )}

        {tagError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {tagError}
          </p>
        ) : null}

        {tagSuccess ? (
          <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {tagSuccess}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Excluir Cliente</h3>
        <p className="mt-1 text-sm text-slate-600">
          Esta acao remove o cliente e dados relacionados por cascade.
        </p>

        <button
          type="button"
          onClick={handleDeleteClient}
          disabled={deletingClient}
          className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
        >
          {deletingClient ? 'Excluindo cliente...' : 'Excluir cliente'}
        </button>

        {deleteError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {deleteError}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default ClientDetailPage
