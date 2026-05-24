import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteClient, getClientById, setClientTags } from '../lib/clients.js'
import { listTags } from '../lib/tags.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const CLIENT_STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
}

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
          setError('Cliente não encontrado.')
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
      
      // Auto-hide success message after 3s
      setTimeout(() => setTagSuccess(''), 3000)
    } catch (saveError) {
      setTagError(saveError.message)
    } finally {
      setSavingTags(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!ownerId || !id) return

    const confirmed = window.confirm('Tem certeza que deseja excluir este cliente?')
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
      <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6">
        <p className="text-dn-body text-dn-text-muted animate-dn-shimmer">Carregando detalhes do cliente...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-lg p-6">
        <p className="text-dn-body text-dn-danger">{error}</p>
        <div className="mt-4">
          <Link to="/app/clients">
            <Button variant="ghost" className="text-dn-danger">Voltar para clientes</Button>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dn-bg-card border-[0.5px] border-dn-border p-6 rounded-dn-xl shadow-lg">
        <div>
          <h2 className="text-[24px] font-semibold text-white tracking-tight">{client.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-dn-body text-dn-text-secondary">Status:</span>
            <Badge variant={client.status === 'active' || client.status === 'ativo' ? 'active' : 'warning'} className="uppercase">
              {CLIENT_STATUS_LABELS[client.status] ?? client.status}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to={`/app/clients/${client.id}/edit`}>
            <Button variant="ghost">Editar</Button>
          </Link>
          <Link to="/app/clients">
            <Button variant="ghost">Voltar</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-8 md:grid-cols-2 shadow-lg">
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Email</span>
          <span className="text-dn-body font-medium text-white">{client.email ?? 'Não informado'}</span>
        </div>
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Telefone</span>
          <span className="text-dn-body font-medium text-white">{client.phone ?? 'Não informado'}</span>
        </div>
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Empresa</span>
          <span className="text-dn-body font-medium text-white">{client.company ?? 'Não informado'}</span>
        </div>
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Documento</span>
          <span className="text-dn-body font-medium text-white">{client.document_number ?? 'Não informado'}</span>
        </div>
        <div className="flex flex-col bg-dn-bg-elevated p-4 rounded-dn-md border-[0.5px] border-dn-border md:col-span-2">
          <span className="text-dn-caption text-dn-text-muted uppercase tracking-wider mb-1">Notas Internas</span>
          <p className="text-dn-body text-dn-text-secondary whitespace-pre-wrap">{client.notes ?? 'Sem notas adicionais'}</p>
        </div>
      </div>

      {/* GESTÃO DE TAGS */}
      <div className="rounded-dn-xl border-[0.5px] border-dn-border bg-dn-bg-card p-8 shadow-lg">
        <h3 className="text-dn-h3 text-white">Tags do Cliente</h3>
        <p className="mt-1 text-dn-body text-dn-text-secondary">
          Associe ou remova tags para filtrar este cliente na listagem.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 pb-6 border-b-[0.5px] border-dn-border">
          {client.tags.length === 0 ? (
            <span className="text-dn-body text-dn-text-muted">Nenhuma tag associada atualmente.</span>
          ) : (
            client.tags.map((tag) => (
              <Badge key={tag.id} variant="premium" className="px-3 py-1 text-xs">
                {tag.name}
              </Badge>
            ))
          )}
        </div>

        {tags.length === 0 ? (
          <div className="mt-6 rounded-md border-[0.5px] border-dn-border bg-dn-bg-elevated px-4 py-3 text-dn-body text-dn-text-muted">
            Nenhuma tag cadastrada no sistema.{' '}
            <Link to="/app/tags" className="font-medium text-dn-accent hover:text-white transition-colors">
              Gerenciar tags
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <h4 className="text-dn-body font-medium text-white mb-4">Selecione as tags aplicáveis:</h4>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-3 rounded-dn-md border-[0.5px] border-dn-border bg-dn-bg-elevated px-4 py-3 cursor-pointer hover:bg-dn-bg-hover transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagSet.has(tag.id)}
                    onChange={() => handleToggleTag(tag.id)}
                    className="h-4 w-4 rounded border-dn-border bg-dn-bg-card checked:bg-dn-accent focus:ring-dn-accent"
                  />
                  <span className="text-dn-body text-dn-text-primary">{tag.name}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Button
                type="button"
                onClick={handleSaveTags}
                disabled={savingTags}
                className="bg-dn-accent hover:bg-dn-accent/90 text-white"
              >
                {savingTags ? 'SALVANDO...' : 'SALVAR TAGS'}
              </Button>

              {tagSuccess && (
                <span className="text-dn-body text-dn-success animate-pulse">{tagSuccess}</span>
              )}
            </div>
          </div>
        )}

        {tagError ? (
          <p className="mt-4 rounded-md border-[0.5px] border-dn-danger/50 bg-[#161B26] px-4 py-3 text-dn-body text-dn-danger">
            {tagError}
          </p>
        ) : null}
      </div>

      {/* ZONA DE PERIGO */}
      <div className="rounded-dn-xl border-[0.5px] border-dn-danger/30 bg-dn-danger-bg p-8 dn-ambient-container dn-ambient-red">
        <h3 className="text-dn-h3 text-dn-danger flex items-center gap-2">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
           Zona de Perigo: Excluir Cliente
        </h3>
        <p className="mt-2 text-dn-body text-dn-text-secondary max-w-2xl">
          Esta ação remove o cliente e dados relacionados por cascade. Essa exclusão <strong>não pode ser desfeita</strong>.
        </p>

        <div className="mt-6">
          <Button
            type="button"
            onClick={handleDeleteClient}
            disabled={deletingClient}
            className="bg-transparent border border-dn-danger text-dn-danger hover:bg-dn-danger/10 hover:text-white transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)]"
          >
            {deletingClient ? 'EXCLUINDO...' : 'EXCLUIR CLIENTE DEFINITIVAMENTE'}
          </Button>
        </div>

        {deleteError ? (
          <p className="mt-4 rounded-md bg-[#161B26] border-[0.5px] border-dn-danger/50 p-3 text-dn-body text-dn-danger">
            {deleteError}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default ClientDetailPage
