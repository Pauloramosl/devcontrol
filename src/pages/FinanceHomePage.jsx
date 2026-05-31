import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { generateCurrentMonthInvoices, getFinanceSummary } from '../lib/finance.js'
import { useAlerts } from '../context/AlertsContext.jsx'
import { MetricCard } from '../components/ui/MetricCard.jsx'
import { Button } from '../components/ui/Button.jsx'
import { AnimatedCounter } from '../components/ui/AnimatedCounter.jsx'

const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

function FinanceHomePage() {
  const { user } = useAuth()
  const ownerId = user?.id

  const [summary, setSummary] = useState({
    mrr: 0,
    receivableTotal: 0,
    payableTotal: 0,
    predictedIncoming: 0,
    predictedOutgoing: 0,
    predictedBalance: 0,
    overdueCount: 0,
    overdueTotal: 0,
    upcomingInvoices: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generateMessage, setGenerateMessage] = useState('')
  const { counts, refresh: refreshAlerts } = useAlerts()

  const loadSummary = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)
    setError('')

    try {
      const data = await getFinanceSummary({ ownerId })
      setSummary(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const handleGenerateCurrentMonth = async () => {
    if (!ownerId) return

    setSaving(true)
    setError('')
    setGenerateMessage('')

    try {
      const result = await generateCurrentMonthInvoices({ ownerId })
      setGenerateMessage(
        `Mes ${result.referenceMonth}: ${result.createdCount} cobrança(s) criada(s), ${result.skippedCount} ignorada(s).`,
      )
      await loadSummary()
      refreshAlerts()
    } catch (generateError) {
      setError(generateError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleWhatsAppCharge = (invoice) => {
    const dateParts = invoice.due_date ? invoice.due_date.split('-') : [];
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : invoice.due_date;

    const text = `Olá ${invoice.client_name}, verificamos que a fatura no valor de ${formatCurrency(invoice.value)} com vencimento em ${formattedDate} encontra-se em aberto. Poderia verificar, por favor?`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-dn-h2 text-white">Financeiro</h2>
          <p className="mt-1 text-dn-body text-dn-text-secondary">
            Recorrências, cobranças, despesas e indicadores básicos de fluxo de caixa.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGenerateCurrentMonth}
            disabled={saving}
          >
            {saving ? 'GERANDO...' : 'GERAR MÊS ATUAL'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/app/finance/recurrences">
          <Button variant="ghost">Ver recorrências</Button>
        </Link>
        <Link to="/app/finance/invoices">
          <Button variant="ghost">Ver cobranças</Button>
        </Link>
        <Link to="/app/finance/expenses">
          <Button variant="ghost">Ver despesas</Button>
        </Link>
      </div>

      {loading ? (
        <p className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-4 text-dn-body text-dn-text-muted animate-dn-shimmer">
          Carregando resumo financeiro...
        </p>
      ) : null}

      {error ? (
        <p className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-md p-4 text-dn-body text-dn-danger">
          {error}
        </p>
      ) : null}

      {generateMessage ? (
        <p className="bg-dn-success-bg border-[0.5px] border-dn-success/30 rounded-dn-md p-4 text-dn-body text-dn-success">
          {generateMessage}
        </p>
      ) : null}

      {!loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="MRR"
            value={<AnimatedCounter value={summary.mrr} formatCurrency={true} />}
            deltaType="neutral"
            delta="ATIVO"
          />
          <MetricCard
            label="A Receber"
            value={<AnimatedCounter value={summary.receivableTotal} formatCurrency={true} />}
            deltaType="positive"
            delta="MÊS ATUAL"
          />
          <MetricCard
            label="Inadimplência"
            value={<AnimatedCounter value={summary.overdueTotal} formatCurrency={true} />}
            deltaType={summary.overdueCount > 0 ? "negative" : "neutral"}
            delta={`${summary.overdueCount} CLIENTES`}
          />
          <MetricCard
            label="A Pagar"
            value={<AnimatedCounter value={summary.payableTotal} formatCurrency={true} />}
            deltaType="neutral"
            delta="DESPESAS"
          />
        </div>
      ) : null}

      {!loading ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6">
          <h3 className="text-dn-h3 text-white mb-4">Previsão</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4">
              <p className="text-dn-label text-dn-text-muted mb-1">Entradas Previstas</p>
              <p className="text-[20px] font-bold text-white tracking-tight">
                <AnimatedCounter value={summary.predictedIncoming} formatCurrency={true} />
              </p>
            </div>
            <div className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4">
              <p className="text-dn-label text-dn-text-muted mb-1">Saídas Previstas</p>
              <p className="text-[20px] font-bold text-white tracking-tight">
                <AnimatedCounter value={summary.predictedOutgoing} formatCurrency={true} />
              </p>
            </div>
            <div className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4">
              <p className="text-dn-label text-dn-text-muted mb-1">Saldo Previsto</p>
              <p className="text-[20px] font-bold text-dn-accent tracking-tight">
                <AnimatedCounter value={summary.predictedBalance} formatCurrency={true} />
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-dn-h3 text-white">Resumo de Alertas</h3>
            <Link to="/app/alerts" className="text-dn-body text-dn-accent hover:text-white transition-dn underline">
              Ver todos os alertas
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4">
              <p className="text-dn-label text-dn-text-muted mb-1">Cobranças Vencidas</p>
              <p className={`text-[20px] font-bold tracking-tight ${counts.overdueInvoices > 0 ? 'text-dn-danger' : 'text-white'}`}>
                <AnimatedCounter value={counts.overdueInvoices} />
              </p>
            </div>
            <div className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4">
              <p className="text-dn-label text-dn-text-muted mb-1">Despesas Vencidas</p>
              <p className={`text-[20px] font-bold tracking-tight ${counts.overdueExpenses > 0 ? 'text-dn-danger' : 'text-white'}`}>
                <AnimatedCounter value={counts.overdueExpenses} />
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && summary.overdueInvoicesList?.length > 0 ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-danger/50 rounded-dn-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-dn-danger"></div>
          <h3 className="text-dn-h3 text-dn-danger mb-4 flex items-center gap-2">
            Ação Rápida: Cobranças Atrasadas
            <span className="bg-dn-danger-bg text-[11px] px-2 py-0.5 rounded-full border-[0.5px] border-dn-danger/30">
              {summary.overdueInvoicesList.length}
            </span>
          </h3>
          <div className="space-y-3">
            {summary.overdueInvoicesList.map((invoice) => (
              <div key={invoice.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-dn hover:border-dn-danger/30">
                <div>
                  <p className="text-dn-body font-medium text-white">{invoice.client_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-dn-caption text-dn-danger">
                      Vencido em: <span className="font-semibold">{invoice.due_date ? invoice.due_date.split('-').reverse().join('/') : '-'}</span>
                    </p>
                    <span className="text-dn-mono text-dn-text-primary text-sm">
                      {formatCurrency(invoice.value)}
                    </span>
                  </div>
                </div>
                <div>
                  <Button 
                    onClick={() => handleWhatsAppCharge(invoice)}
                    className="w-full sm:w-auto bg-[#25D366] hover:bg-[#128C7E] text-white border-none shadow-[0_0_10px_rgba(37,211,102,0.2)] hover:shadow-[0_0_15px_rgba(37,211,102,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    <IconWhatsApp />
                    Cobrar no WhatsApp
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="bg-dn-bg-card border-[0.5px] border-dn-border rounded-dn-lg p-6">
          <h3 className="text-dn-h3 text-white mb-4">Próximos Vencimentos</h3>
          {summary.upcomingInvoices.length === 0 ? (
            <p className="text-dn-body text-dn-text-muted">Sem cobranças pendentes no momento.</p>
          ) : (
            <div className="space-y-3">
              {summary.upcomingInvoices.map((invoice) => (
                <div key={invoice.id} className="bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md p-4 flex justify-between items-center transition-dn hover:bg-dn-bg-hover">
                  <div>
                    <p className="text-dn-body font-medium text-white">{invoice.client_name}</p>
                    <p className="text-dn-caption text-dn-text-secondary mt-1">
                      Vencimento: <span className="text-dn-text-primary">{invoice.due_date ? invoice.due_date.split('-').reverse().join('/') : '-'}</span>
                    </p>
                  </div>
                  <div className="text-dn-mono text-dn-accent">
                    {formatCurrency(invoice.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  )
}

export default FinanceHomePage
