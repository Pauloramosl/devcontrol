import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getFinanceSummary, getMonthlyChartData } from '../lib/finance.js'
import { loadAlerts } from '../lib/alerts.js'
import { listProjects } from '../lib/projects.js'
import { listClients } from '../lib/clients.js'
import { Button } from '../components/ui/Button.jsx'
import { AnimatedCounter } from '../components/ui/AnimatedCounter.jsx'
import { RevenueChart } from '../components/ui/RevenueChart.jsx'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0))
}

function AppHomePage() {
  const { user } = useAuth()
  const ownerId = user?.id
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)

  const [dashboardData, setDashboardData] = useState({
    mrr: 0,
    activeClientsCount: 0,
    activeProjectsCount: 0,
    payableTotal: 0,
    alertsCount: 0,
    recentProjects: [],
    criticalAlerts: [],
  })

  const [chartData, setChartData] = useState([])
  const [chartMode, setChartMode] = useState('revenue')

  const fetchDashboardData = useCallback(async () => {
    if (!ownerId) return

    setLoading(true)

    try {
      const [financeRes, alertsRes, projectsRes, clientsRes, chartRes] = await Promise.all([
        getFinanceSummary({ ownerId }),
        loadAlerts({ ownerId }),
        listProjects({ ownerId, status: 'all', clientId: 'all' }),
        listClients({ ownerId, searchTerm: '', status: 'all', tagId: 'all' }),
        getMonthlyChartData({ ownerId, months: 6 }),
      ])

      const mrr = financeRes.mrr || 0
      const payableTotal = financeRes.payableTotal || 0

      const alertsCount = alertsRes.overdueInvoices.length + alertsRes.overdueExpenses.length
      
      const criticalAlerts = [
        ...alertsRes.overdueInvoices.map(i => ({ id: `inv-${i.id}`, type: 'Cobrança', text: `Invoice ${i.reference_month ?? '-'}`, date: i.due_date, link: '/app/finance/invoices' })),
        ...alertsRes.overdueExpenses.map(e => ({ id: `exp-${e.id}`, type: 'Despesa', text: e.description, date: e.due_date, link: '/app/finance/expenses' }))
      ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)

      const activeProjects = projectsRes.filter(p => p.status === 'active' || p.status === 'ativo')
      const recentProjects = [...activeProjects].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 4)

      const activeClientsCount = clientsRes.filter(c => c.status === 'active' || c.status === 'ativo').length

      setDashboardData({
        mrr,
        activeClientsCount,
        activeProjectsCount: activeProjects.length,
        payableTotal,
        alertsCount,
        recentProjects,
        criticalAlerts,
      })

      setChartData(chartRes)
    } catch (err) {
      console.error('Falha ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Re-fetch when the user navigates back to this page or tabs back in
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData()
      }
    }
    const handleFocus = () => fetchDashboardData()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchDashboardData])

  // Cálculo fictício de saúde para o gráfico Donut
  const healthPercentage = Math.max(0, 100 - (dashboardData.alertsCount * 5))

  return (
    <div className="relative min-h-[calc(100vh-100px)] pt-4 pb-10">
      {/* AMBIENT GLOW BACKDROP */}
      <div className="absolute top-0 left-0 w-full h-[500px] pointer-events-none z-0 overflow-visible opacity-50">
        <div className="absolute -top-[120px] -left-[80px] w-[500px] h-[500px] bg-dn-accent/20 rounded-full blur-[160px]"></div>
        <div className="absolute top-[30px] right-[5%] w-[500px] h-[300px] bg-dn-danger/15 rounded-full blur-[180px]"></div>
        <div className="absolute -top-[60px] right-[35%] w-[350px] h-[350px] bg-dn-purple/15 rounded-full blur-[160px]"></div>
      </div>

      <div className="relative z-10 space-y-6">
        
        {/* VISÃO GERAL (OVERALL PORTFOLIO) */}
        <section className="bg-dn-bg-card border-[0.5px] border-white/5 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle inner top highlight */}
          <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
                Visão Geral
                {loading && <span className="w-4 h-4 rounded-full border-2 border-dn-accent border-t-transparent animate-spin"></span>}
              </h2>
              <p className="text-dn-body text-dn-text-secondary mt-1">Métricas consolidadas da operação em tempo real.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/app/finance">
                 <button className="bg-dn-bg-elevated hover:bg-dn-bg-hover text-white px-6 py-2.5 rounded-full text-sm font-medium border border-white/10 transition-all shadow-lg hover:shadow-xl hover:border-white/20">
                   Financeiro
                 </button>
              </Link>
              <Link to="/app/projects/new">
                 <button className="bg-dn-danger hover:bg-dn-danger/90 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]">
                   Novo Projeto +
                 </button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col">
              <span className="text-sm text-dn-text-secondary font-medium mb-2 flex items-center justify-between pr-4">
                Receita (MRR)
                <span className="text-[10px] text-dn-success bg-dn-success/10 px-2 py-0.5 rounded-full">↑ Ativo</span>
              </span>
              <span className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                <AnimatedCounter value={dashboardData.mrr} formatCurrency={true} />
              </span>
            </div>
            
            <div className="flex flex-col border-l-[0.5px] border-white/10 pl-8">
              <span className="text-sm text-dn-text-secondary font-medium mb-2 flex items-center justify-between pr-4">
                Projetos Ativos
                <span className="text-[10px] text-dn-accent bg-dn-accent/10 px-2 py-0.5 rounded-full">On time</span>
              </span>
              <span className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                <AnimatedCounter value={dashboardData.activeProjectsCount} />
              </span>
            </div>

            <div className="flex flex-col border-l-[0.5px] border-white/10 pl-8">
              <span className="text-sm text-dn-text-secondary font-medium mb-2 flex items-center justify-between pr-4">
                Clientes Base
                <span className="text-[10px] text-dn-text-muted bg-white/5 px-2 py-0.5 rounded-full">Total</span>
              </span>
              <span className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                <AnimatedCounter value={dashboardData.activeClientsCount} />
              </span>
            </div>

            <div className="flex flex-col border-l-[0.5px] border-white/10 pl-8">
              <span className="text-sm text-dn-text-secondary font-medium mb-2 flex items-center justify-between pr-4">
                Total A Pagar
                <span className="text-[10px] text-dn-warning bg-dn-warning/10 px-2 py-0.5 rounded-full">Despesas</span>
              </span>
              <span className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                <AnimatedCounter value={dashboardData.payableTotal} formatCurrency={true} />
              </span>
            </div>
          </div>
        </section>

        {/* BOTTOM LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LADO ESQUERDO: Gráfico e Projetos */}
          <section className="lg:col-span-2 bg-dn-bg-card border-[0.5px] border-white/5 rounded-[32px] p-8 shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-dn-accent/10 flex items-center justify-center text-dn-accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Performance Financeira</h3>
                  <p className="text-xs text-dn-accent mt-0.5 font-mono">ÚLTIMOS 6 MESES</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[{ key: 'revenue', label: 'Receita' }, { key: 'expenses', label: 'Despesas' }, { key: 'balance', label: 'Saldo' }].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setChartMode(opt.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      chartMode === opt.key
                        ? opt.key === 'revenue' ? 'text-dn-accent bg-dn-accent/20 border-[0.5px] border-dn-accent/50 shadow-[0_0_10px_rgba(58,191,255,0.2)]'
                        : opt.key === 'expenses' ? 'text-dn-danger bg-dn-danger/20 border-[0.5px] border-dn-danger/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : 'text-dn-success bg-dn-success/20 border-[0.5px] border-dn-success/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'text-dn-text-muted hover:text-white bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <RevenueChart data={chartData} mode={chartMode} />

            {/* RECENT PROJECTS LIST */}
            <div className="space-y-4">
              {dashboardData.recentProjects.length === 0 && !loading ? (
                 <p className="text-sm text-dn-text-muted text-center py-4">Nenhum projeto recente.</p>
              ) : (
                dashboardData.recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between group py-2 border-b-[0.5px] border-white/5 last:border-0 hover:bg-white/5 rounded-lg px-2 transition-colors cursor-pointer" onClick={() => navigate(`/app/projects/${project.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-dn-bg-elevated border border-white/10 flex items-center justify-center text-dn-text-muted text-xs font-mono">
                        {project.service_type ? project.service_type.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-dn-accent transition-colors">{project.service_type ?? 'Projeto'}</p>
                        <p className="text-xs text-dn-text-secondary">{project.client_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-white">{project.budget_value ? formatCurrency(project.budget_value) : '-'}</p>
                      <p className="text-xs text-dn-text-muted">Prazo: {project.due_date ?? '-'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

          </section>

          {/* LADO DIREITO: Saúde e Alertas */}
          <section className="bg-dn-bg-card border-[0.5px] border-white/5 rounded-[32px] p-8 shadow-2xl relative flex flex-col items-center">
            
            <div className="w-full flex items-center justify-between mb-6">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-dn-accent/20 flex items-center justify-center text-dn-accent">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                 </div>
                 <h3 className="text-lg font-bold text-white">Eficiência</h3>
               </div>
               <span className="text-xs text-dn-text-muted">Estado Global</span>
            </div>

            {/* DONUT CHART (SVG) */}
            <div className="relative w-[180px] h-[180px] my-6">
              {/* Outer Glow */}
              <div className="absolute inset-0 rounded-full blur-[20px] bg-dn-accent/20"></div>
              
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                
                {/* Colored Progress Ring */}
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="transparent" 
                  stroke={healthPercentage > 80 ? "#10B981" : healthPercentage > 50 ? "#F59E0B" : "#EF4444"} 
                  strokeWidth="8" 
                  strokeDasharray={`${healthPercentage * 2.51} 251.2`} 
                  strokeLinecap="round" 
                  className="transition-all duration-1000 ease-out drop-shadow-md"
                />
                
                {/* Secondary decorative ring piece */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3ABFFF" strokeWidth="8" strokeDasharray="20 251.2" strokeDashoffset="-220" strokeLinecap="round" />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white tracking-tighter"><AnimatedCounter value={healthPercentage} />%</span>
                <span className="text-[10px] text-dn-text-secondary flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${healthPercentage === 100 ? 'bg-dn-success' : 'bg-dn-warning animate-pulse'}`}></span>
                  {healthPercentage === 100 ? 'Excelente' : 'Atenção'}
                </span>
              </div>
            </div>

            <div className="w-full border-t-[0.5px] border-white/10 pt-6 mt-2 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-dn-text-muted">Total Alertas Ativos</span>
                <span className="text-white font-mono font-bold bg-white/10 px-2 py-0.5 rounded">{dashboardData.alertsCount}</span>
              </div>
              
              <div className="space-y-3">
                {dashboardData.criticalAlerts.length === 0 && !loading ? (
                  <p className="text-xs text-dn-success text-center bg-dn-success/10 py-3 rounded-lg border border-dn-success/20">Sem pendências críticas!</p>
                ) : (
                  dashboardData.criticalAlerts.map(alert => (
                    <div key={alert.id} className="flex flex-col bg-[#161B26] p-3 rounded-xl border-[0.5px] border-white/5 hover:border-dn-danger/50 transition-colors cursor-pointer" onClick={() => navigate(alert.link)}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-dn-danger">{alert.type}</span>
                        <span className="text-[10px] text-dn-text-muted">{alert.date}</span>
                      </div>
                      <span className="text-xs text-white line-clamp-1">{alert.text}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 flex gap-2">
                <Link to="/app/alerts" className="w-full">
                  <button className="w-full bg-transparent border-[0.5px] border-dn-danger/50 text-dn-danger hover:bg-dn-danger/10 hover:text-white py-2.5 rounded-full text-xs font-semibold transition-colors">
                    Ver todos alertas
                  </button>
                </Link>
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  )
}

export default AppHomePage
