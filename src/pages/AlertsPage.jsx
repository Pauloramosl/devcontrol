import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { loadAlerts } from '../lib/alerts.js'

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
      const alerts = await loadAlerts({ ownerId })
      setData(alerts)
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
      ...data.upcomingInvoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        type: 'Cobranca',
        title: `Invoice ${invoice.reference_month ?? ''}`.trim(),
        clientName: getClientName(invoice),
        value: invoice.value,
        date: invoice.due_date,
        link: '/app/finance/invoices',
      })),
      ...data.upcomingExpenses.map((expense) => ({
        id: `expense-${expense.id}`,
        type: 'Despesa',
        title: expense.description,
        clientName: null,
        value: expense.value,
        date: expense.due_date,
        link: '/app/finance/expenses',
      })),
    ]

    return items.sort((left, right) => left.date.localeCompare(right.date))
  }, [data.upcomingExpenses, data.upcomingInvoices])

  const hasAlerts =
    data.overdueInvoices.length ||
    data.overdueExpenses.length ||
    upcomingItems.length ||
    data.overdueTasks.length

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Alertas</h2>
          <p className="mt-1 text-sm text-slate-600">
            Alertas derivados por vencimento e tarefas atrasadas.
          </p>
        </div>
        <Link
          to="/app/finance"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
        >
          Voltar para Financeiro
        </Link>
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando alertas...
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && !error && !hasAlerts ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">Nenhum alerta ativo no momento.</p>
        </div>
      ) : null}

      {!loading && data.overdueInvoices.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-900">Cobrancas vencidas</h3>
          <ul className="mt-3 space-y-2">
            {data.overdueInvoices.map((invoice) => (
              <li key={invoice.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-xs uppercase text-slate-500">Tipo: Cobranca</p>
                <p className="text-sm font-semibold text-slate-900">
                  Invoice {invoice.reference_month ?? '-'}
                </p>
                <p className="text-xs text-slate-500">
                  Cliente: {getClientName(invoice)} | Data: {invoice.due_date} | Valor:{' '}
                  {formatCurrency(invoice.value)}
                </p>
                <Link
                  to="/app/finance/invoices"
                  className="mt-2 inline-block text-xs font-medium text-slate-700 underline"
                >
                  Abrir cobrancas
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && data.overdueExpenses.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-900">Despesas vencidas</h3>
          <ul className="mt-3 space-y-2">
            {data.overdueExpenses.map((expense) => (
              <li key={expense.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-xs uppercase text-slate-500">Tipo: Despesa</p>
                <p className="text-sm font-semibold text-slate-900">{expense.description}</p>
                <p className="text-xs text-slate-500">
                  Categoria: {expense.category ?? '-'} | Data: {expense.due_date} | Valor:{' '}
                  {formatCurrency(expense.value)}
                </p>
                <Link
                  to="/app/finance/expenses"
                  className="mt-2 inline-block text-xs font-medium text-slate-700 underline"
                >
                  Abrir despesas
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && upcomingItems.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-900">Proximos vencimentos</h3>
          <ul className="mt-3 space-y-2">
            {upcomingItems.map((item) => (
              <li key={item.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-xs uppercase text-slate-500">Tipo: {item.type}</p>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {item.clientName ? `Cliente: ${item.clientName} | ` : ''}
                  Data: {item.date} | Valor: {formatCurrency(item.value)}
                </p>
                <Link
                  to={item.link}
                  className="mt-2 inline-block text-xs font-medium text-slate-700 underline"
                >
                  Abrir {item.type === 'Despesa' ? 'despesas' : 'cobrancas'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && data.overdueTasks.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-900">Tarefas atrasadas</h3>
          <ul className="mt-3 space-y-2">
            {data.overdueTasks.map((task) => {
              const projectInfo = getProjectInfo(task)
              return (
                <li key={task.id} className="rounded-md border border-slate-200 p-3">
                  <p className="text-xs uppercase text-slate-500">Tipo: Tarefa</p>
                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                  <p className="text-xs text-slate-500">
                    Projeto: {projectInfo.projectName} | Cliente: {projectInfo.clientName} | Data:{' '}
                    {task.due_date}
                  </p>
                  <Link
                    to={`/app/projects/${task.project_id}/kanban`}
                    className="mt-2 inline-block text-xs font-medium text-slate-700 underline"
                  >
                    Abrir kanban do projeto
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </section>
  )
}

export default AlertsPage
