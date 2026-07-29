import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { loadAlerts } from '../lib/alerts.js'
import { Button } from '../components/ui/Button.jsx'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

function getClientName(row) {
  if (!row?.clients) return '-'
  if (Array.isArray(row.clients)) return row.clients[0]?.name ?? '-'
  return row.clients?.name ?? '-'
}

function getProjectInfo(task) {
  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects
  return {
    projectName: project?.service_type ?? 'Projeto',
    clientName: project?.clients?.name ?? '-',
  }
}

function AlertsPage() {
  const { user } = useAuth()
  const ownerId = user?.id

  const [data, setData] = useState({
    overdueInvoices: [],
    overdueExpenses: [],
    upcomingInvoices: [],
    upcomingExpenses: [],
    overdueTasks: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const [alerts, overdueTasks] = await Promise.all([
        loadAlerts({ ownerId }),
        import('../lib/kanban.js').then((m) => m.loadOverdueTasks({ ownerId })).catch(() => [])
      ])
      setData({
        ...alerts,
        overdueTasks: overdueTasks || []
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

  const upcomingItems = useMemo(() => {
    const items = [
      ...(data.upcomingInvoices || []).map((invoice) => ({
        id: `invoice-${invoice.id}`,
        type: 'Cobrança',
        title: `Invoice ${invoice.reference_month ?? ''}`.trim(),
        clientName: getClientName(invoice),
        value: invoice.value,
        date: invoice.due_date,
        link: '/app/finance/invoices',
      })),
      ...(data.upcomingExpenses || []).map((expense) => ({
        id: `expense-${expense.id}`,
        type: 'Despesa',
        title: expense.description,
        clientName: null,
        value: expense.value,
        date: expense.due_date,
        link: '/app/finance/expenses',
      })),
    ]

    return items.sort((left, right) => (left.date || '').localeCompare(right.date || ''))
  }, [data.upcomingExpenses, data.upcomingInvoices])

  const hasAlerts =
    (data.overdueInvoices?.length ?? 0) > 0 ||
    (data.overdueExpenses?.length ?? 0) > 0 ||
    (data.overdueTasks?.length ?? 0) > 0 ||
    (upcomingItems?.length ?? 0) > 0

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-dn-h2 text-white">Alertas</h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">
            Alertas derivados por vencimento e tarefas atrasadas.
          </p>
        </div>
        <Link to="/app/finance">
          <Button variant="ghost">Voltar para Financeiro</Button>
        </Link>
      </div>

      {loading ? (
        <p className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-4 text-dn-body text-dn-text-muted animate-dn-shimmer">
          Carregando alertas...
        </p>
      ) : null}

      {error ? (
        <p className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-md p-4 text-dn-body text-dn-danger">
          {error}
        </p>
      ) : null}

      {!loading && !error && !hasAlerts ? (
        <div className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-dn-success-bg flex items-center justify-center text-dn-success mb-4">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
             </svg>
          </div>
          <h3 className="text-dn-h3 text-white mb-1">Tudo em dia!</h3>
          <p className="text-dn-body text-dn-text-secondary">
            Nenhum alerta ativo no momento.
          </p>
        </div>
      ) : null}

      {/* COBRANÇAS VENCIDAS */}
      {!loading && data.overdueInvoices.length > 0 ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-danger/30 rounded-dn-lg p-6 dn-ambient-container dn-ambient-red">
          <h3 className="text-dn-h3 text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-dn-danger"></span>
            Cobranças Vencidas
          </h3>
          <div className="space-y-3">
            {data.overdueInvoices.map((invoice) => (
              <div key={invoice.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-dn-bg-hover transition-dn">
                <div>
                  <p className="text-dn-caption text-dn-danger uppercase tracking-wider mb-1">COBRANÇA</p>
                  <p className="text-dn-body font-medium text-white">Invoice {invoice.reference_month ?? '-'}</p>
                  <p className="text-dn-caption text-dn-text-secondary mt-1">
                    Cliente: <span className="text-dn-text-primary">{getClientName(invoice)}</span> | Data: <span className="text-dn-text-primary">{invoice.due_date}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-dn-mono text-dn-danger font-bold">{formatCurrency(invoice.value)}</span>
                  <Link to="/app/finance/invoices">
                    <Button variant="ghost" className="h-8 text-xs text-dn-accent">Abrir Cobranças</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* DESPESAS VENCIDAS */}
      {!loading && data.overdueExpenses.length > 0 ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-danger/30 rounded-dn-lg p-6 dn-ambient-container dn-ambient-red">
          <h3 className="text-dn-h3 text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-dn-danger"></span>
            Despesas Vencidas
          </h3>
          <div className="space-y-3">
            {data.overdueExpenses.map((expense) => (
              <div key={expense.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-dn-bg-hover transition-dn">
                <div>
                  <p className="text-dn-caption text-dn-danger uppercase tracking-wider mb-1">DESPESA</p>
                  <p className="text-dn-body font-medium text-white">{expense.description}</p>
                  <p className="text-dn-caption text-dn-text-secondary mt-1">
                    Categoria: <span className="text-dn-text-primary">{expense.category ?? '-'}</span> | Data: <span className="text-dn-text-primary">{expense.due_date}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-dn-mono text-dn-danger font-bold">{formatCurrency(expense.value)}</span>
                  <Link to="/app/finance/expenses">
                    <Button variant="ghost" className="h-8 text-xs text-dn-accent">Abrir Despesas</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* PRÓXIMOS VENCIMENTOS */}
      {!loading && upcomingItems.length > 0 ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6">
          <h3 className="text-dn-h3 text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-dn-warning"></span>
            Próximos Vencimentos
          </h3>
          <div className="space-y-3">
            {upcomingItems.map((item) => (
              <div key={item.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-dn-bg-hover transition-dn">
                <div>
                  <p className="text-dn-caption text-dn-warning uppercase tracking-wider mb-1">{item.type}</p>
                  <p className="text-dn-body font-medium text-white">{item.title}</p>
                  <p className="text-dn-caption text-dn-text-secondary mt-1">
                    {item.clientName && <>Cliente: <span className="text-dn-text-primary">{item.clientName}</span> | </>}
                    Data: <span className="text-dn-text-primary">{item.date}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-dn-mono text-dn-text-primary">{formatCurrency(item.value)}</span>
                  <Link to={item.link}>
                    <Button variant="ghost" className="h-8 text-xs text-dn-accent">Abrir</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* TAREFAS ATRASADAS */}
      {!loading && data.overdueTasks.length > 0 ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-danger/30 rounded-dn-lg p-6 dn-ambient-container dn-ambient-red">
          <h3 className="text-dn-h3 text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-dn-danger"></span>
            Tarefas Atrasadas
          </h3>
          <div className="space-y-3">
            {data.overdueTasks.map((task) => {
              const { projectName, clientName } = getProjectInfo(task)
              return (
                <div key={task.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-dn-bg-hover transition-dn">
                  <div>
                    <p className="text-dn-caption text-dn-danger uppercase tracking-wider mb-1">TAREFA</p>
                    <p className="text-dn-body font-medium text-white">{task.title}</p>
                    <p className="text-dn-caption text-dn-text-secondary mt-1">
                      Projeto: <span className="text-dn-text-primary">{projectName}</span> | Cliente: <span className="text-dn-text-primary">{clientName}</span> | Prazo: <span className="text-dn-text-primary">{task.due_date}</span>
                    </p>
                  </div>
                  <div>
                    <Link to={`/app/projects/${task.project_id}/kanban`}>
                      <Button variant="ghost" className="h-8 text-xs text-dn-accent">Abrir Kanban</Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </section>
  )
}

export default AlertsPage
