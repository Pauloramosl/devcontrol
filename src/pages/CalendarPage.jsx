import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Select } from '../components/ui/Select.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { createAppointment, deleteAppointment, listAppointments } from '../lib/appointments.js'
import { listClients } from '../lib/clients.js'
import { listExpenses, listInvoices } from '../lib/finance.js'
import { listProjects } from '../lib/projects.js'
import { supabase } from '../lib/supabase.js'

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i)
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const EMPTY_CALENDAR_DATA = {
  projects: [],
  tasks: [],
  invoices: [],
  expenses: [],
  appointments: [],
  clients: [],
}

const EVENT_META = {
  project: {
    label: 'Projeto',
    chipClass: 'bg-dn-accent/15 border-dn-accent/30 text-dn-accent',
  },
  task: {
    label: 'Tarefa',
    chipClass: 'bg-dn-purple/15 border-dn-purple/30 text-dn-purple',
  },
  invoice: {
    label: 'Fatura',
    chipClass: 'bg-dn-success/15 border-dn-success/30 text-dn-success',
  },
  expense: {
    label: 'Despesa',
    chipClass: 'bg-dn-danger/15 border-dn-danger/30 text-dn-danger',
  },
  meeting: {
    label: 'Compromisso',
    chipClass: 'bg-dn-warning/15 border-dn-warning/30 text-dn-warning',
  },
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function getTodayDateString() {
  const today = new Date()
  return formatLocalDate(today)
}

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateLabel(dateString) {
  if (!dateString) return 'Selecione um dia'

  return new Date(`${dateString}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(value) {
  const numericValue = Number(value ?? 0)
  if (!Number.isFinite(numericValue)) return null
  return currencyFormatter.format(numericValue)
}

function getRelation(value) {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

async function listCalendarTasks({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to list calendar tasks.')
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, owner_id, project_id, title, due_date, priority, status, projects(id, service_type, clients(id, name)), project_columns!inner(name)',
    )
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .not('due_date', 'is', null)
    .not('project_columns.name', 'ilike', '%conclu%')
    .order('due_date', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

function mapCalendarDataToEvents(calendarData) {
  const projectEvents = calendarData.projects
    .filter((project) => project.due_date)
    .map((project) => ({
      id: `project-${project.id}`,
      type: 'project',
      title: project.service_type || 'Projeto sem título',
      date: project.due_date,
      client: project.client_name,
      budget: formatCurrency(project.budget_value),
      redirectPath: `/app/projects/${project.id}`,
    }))

  const taskEvents = calendarData.tasks
    .filter((task) => task.due_date)
    .map((task) => {
      const project = getRelation(task.projects)
      const client = getRelation(project?.clients)

      return {
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        date: task.due_date,
        project: project?.service_type ?? 'Projeto',
        client: client?.name ?? null,
        priority: task.priority,
        redirectPath: task.project_id ? `/app/projects/${task.project_id}/kanban` : '/app/kanban',
      }
    })

  const invoiceEvents = calendarData.invoices
    .filter((invoice) => invoice.due_date && invoice.status !== 'canceled')
    .map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: 'invoice',
      title: `Fatura - ${invoice.client_name ?? 'Cliente'}`,
      date: invoice.due_date,
      client: invoice.client_name,
      value: formatCurrency(invoice.value),
      status: invoice.display_status ?? invoice.status,
      redirectPath: '/app/finance/invoices',
    }))

  const expenseEvents = calendarData.expenses
    .filter((expense) => expense.due_date && expense.status !== 'canceled')
    .map((expense) => ({
      id: `expense-${expense.id}`,
      type: 'expense',
      title: expense.description,
      date: expense.due_date,
      value: formatCurrency(expense.value),
      status: expense.display_status ?? expense.status,
      redirectPath: '/app/finance/expenses',
    }))

  const appointmentEvents = calendarData.appointments
    .filter((appointment) => appointment.date)
    .map((appointment) => ({
      id: `appointment-${appointment.id}`,
      appointmentId: appointment.id,
      type: 'meeting',
      appointmentType: appointment.type,
      title: appointment.title,
      date: appointment.date,
      time: appointment.time,
      client: appointment.client_name,
      description: appointment.description,
    }))

  return {
    projectEvents,
    taskEvents,
    invoiceEvents,
    expenseEvents,
    appointmentEvents,
  }
}

function groupEventsByDate(eventGroups, activeFilters) {
  const map = {}

  const addEvent = (event) => {
    if (!event.date) return
    if (!map[event.date]) map[event.date] = []
    map[event.date].push(event)
  }

  if (activeFilters.projects) {
    eventGroups.projectEvents.forEach(addEvent)
  }

  if (activeFilters.tasks) {
    eventGroups.taskEvents.forEach(addEvent)
  }

  if (activeFilters.finance) {
    eventGroups.invoiceEvents.forEach(addEvent)
    eventGroups.expenseEvents.forEach(addEvent)
  }

  if (activeFilters.meetings) {
    eventGroups.appointmentEvents.forEach(addEvent)
  }

  Object.values(map).forEach((events) => {
    events.sort((left, right) => {
      if (left.time && right.time) return left.time.localeCompare(right.time)
      if (left.time) return -1
      if (right.time) return 1
      return left.title.localeCompare(right.title)
    })
  })

  return map
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
      {Array.from({ length: 28 }, (_, index) => (
        <div
          key={index}
          className="h-[140px] rounded-2xl border border-white/5 bg-dn-bg-elevated/40 p-3 animate-pulse"
        >
          <div className="h-7 w-7 rounded-full bg-white/10" />
          <div className="mt-12 space-y-2">
            <div className="h-5 rounded-md bg-white/10" />
            <div className="h-5 w-3/4 rounded-md bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DayEventsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="rounded-xl border border-white/5 bg-dn-bg-elevated p-3.5 animate-pulse">
          <div className="flex justify-between">
            <div className="h-4 w-16 rounded bg-white/10" />
            <div className="h-4 w-10 rounded bg-white/10" />
          </div>
          <div className="mt-4 h-4 w-full rounded bg-white/10" />
          <div className="mt-2 h-3 w-2/3 rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}

function CalendarPage() {
  const { user, loading: authLoading } = useAuth()
  const ownerId = user?.id

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDayString, setSelectedDayString] = useState(() => getTodayDateString())
  const [activeFilters, setActiveFilters] = useState({
    projects: true,
    tasks: true,
    finance: true,
    meetings: true,
  })
  const [calendarData, setCalendarData] = useState(EMPTY_CALENDAR_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    time: '10:00',
    clientName: '',
    description: '',
    type: 'Reunião',
  })
  const [successToast, setSuccessToast] = useState('')

  const showToast = useCallback((message) => {
    setSuccessToast(message)
    window.setTimeout(() => setSuccessToast(''), 3000)
  }, [])

  const loadCalendarData = useCallback(async () => {
    if (!ownerId) {
      setCalendarData(EMPTY_CALENDAR_DATA)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError('')

    try {
      const [projects, tasks, invoices, expenses, appointments, clients] = await Promise.all([
        listProjects({ ownerId, status: 'active' }),
        listCalendarTasks({ ownerId }),
        listInvoices({ ownerId, status: 'all' }),
        listExpenses({ ownerId, status: 'all' }),
        listAppointments({ ownerId }),
        listClients({ ownerId, status: 'active' }),
      ])

      setCalendarData({
        projects,
        tasks,
        invoices,
        expenses,
        appointments,
        clients,
      })
    } catch (error) {
      setLoadError(error?.message ?? 'Não foi possível carregar os dados do calendário.')
    } finally {
      setIsLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    if (authLoading) return
    loadCalendarData()
  }, [authLoading, loadCalendarData])

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay()
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    for (let day = 1; day <= totalDaysInMonth; day += 1) {
      days.push({
        day,
        month,
        year,
        isCurrentMonth: true,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        firstDayIndex: day === 1 ? firstDayIndex : undefined,
      })
    }

    return days
  }, [currentDate])

  const eventGroups = useMemo(() => mapCalendarDataToEvents(calendarData), [calendarData])

  const eventsByDate = useMemo(
    () => groupEventsByDate(eventGroups, activeFilters),
    [activeFilters, eventGroups],
  )

  const selectedDayEvents = useMemo(() => {
    if (!selectedDayString) return []
    return eventsByDate[selectedDayString] || []
  }, [eventsByDate, selectedDayString])

  const selectedDayLabel = useMemo(() => formatDateLabel(selectedDayString), [selectedDayString])

  const prevMonth = () => {
    setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))
  }

  const handleMonthSelect = (event) => {
    setCurrentDate((date) => new Date(date.getFullYear(), Number.parseInt(event.target.value, 10), 1))
  }

  const handleYearSelect = (event) => {
    setCurrentDate((date) => new Date(Number.parseInt(event.target.value, 10), date.getMonth(), 1))
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDayString(formatLocalDate(today))
  }

  const resetScheduleForm = () => {
    setScheduleForm({
      title: '',
      time: '10:00',
      clientName: '',
      description: '',
      type: 'Reunião',
    })
  }

  const handleScheduleSubmit = async (event) => {
    event.preventDefault()
    if (!ownerId || !selectedDayString || !scheduleForm.title.trim()) return

    setIsSaving(true)
    setLoadError('')

    try {
      await createAppointment({
        ownerId,
        input: {
          title: scheduleForm.title,
          date: selectedDayString,
          time: scheduleForm.time,
          client_name: scheduleForm.clientName,
          description: scheduleForm.description,
          type: scheduleForm.type,
        },
      })

      await loadCalendarData()
      setShowScheduleModal(false)
      resetScheduleForm()
      showToast('Compromisso agendado com sucesso!')
    } catch (error) {
      setLoadError(error?.message ?? 'Não foi possível agendar o compromisso.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAppointment = async (eventItem) => {
    if (!ownerId || !eventItem.appointmentId) return

    if (!window.confirm('Remover este compromisso do calendário?')) {
      return
    }

    setIsSaving(true)
    setLoadError('')

    try {
      await deleteAppointment({ ownerId, appointmentId: eventItem.appointmentId })
      setCalendarData((current) => ({
        ...current,
        appointments: current.appointments.filter((appointment) => appointment.id !== eventItem.appointmentId),
      }))
      showToast('Compromisso removido.')
    } catch (error) {
      setLoadError(error?.message ?? 'Não foi possível remover o compromisso.')
    } finally {
      setIsSaving(false)
    }
  }

  const isToday = (dateString) => dateString === getTodayDateString()

  return (
    <div className="relative min-h-[calc(100vh-100px)] pt-4 pb-10 space-y-6">
      <div className="absolute top-0 left-0 w-full h-[500px] pointer-events-none z-0 overflow-hidden opacity-40">
        <div className="absolute -top-[100px] left-[10%] w-[400px] h-[400px] bg-dn-accent/15 rounded-full blur-[140px]" />
        <div className="absolute top-[80px] right-[10%] w-[350px] h-[350px] bg-dn-purple/15 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 bg-dn-bg-card border-[0.5px] border-white/5 p-6 rounded-[24px] shadow-2xl backdrop-blur-xl">
        <div>
          <h2 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-dn-accent/20 flex items-center justify-center text-dn-accent shadow-[0_0_15px_rgba(58,191,255,0.15)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            Calendário
          </h2>
          <p className="text-dn-body text-dn-text-secondary mt-1">
            Planejamento integrado de projetos, kanban, faturamento e reuniões.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLoading && (
            <span className="inline-flex items-center gap-2 rounded-full border border-dn-accent/20 bg-dn-accent/10 px-3 py-2 text-[11px] font-semibold text-dn-accent">
              <span className="h-2 w-2 rounded-full bg-dn-accent animate-ping" />
              Sincronizando
            </span>
          )}
          <Button variant="ghost" onClick={handleToday}>
            Ir para Hoje
          </Button>
          <Link to="/app">
            <Button variant="ghost">Dashboard</Button>
          </Link>
        </div>
      </div>

      {successToast && (
        <div className="fixed top-24 right-8 z-[100] px-4 py-3 bg-dn-success-bg border-[0.5px] border-dn-success text-dn-success rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-dn-success animate-ping" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {loadError && (
        <div className="relative z-10 rounded-2xl border border-dn-danger/30 bg-dn-danger-bg px-4 py-3 text-sm text-dn-danger">
          {loadError}
        </div>
      )}

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <aside className="lg:col-span-1 space-y-6">
          <section className="bg-dn-bg-card border-[0.5px] border-white/5 rounded-[24px] p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 font-mono">Filtros de Eventos</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group text-dn-body text-dn-text-primary">
                <input
                  type="checkbox"
                  checked={activeFilters.projects}
                  onChange={(event) => setActiveFilters((current) => ({ ...current, projects: event.target.checked }))}
                  className="w-4 h-4 rounded bg-dn-bg-elevated border-dn-border text-dn-accent focus:ring-dn-accent/30"
                />
                <span className="flex items-center gap-2 group-hover:text-dn-accent transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full bg-dn-accent" />
                  Prazos de Projetos
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group text-dn-body text-dn-text-primary">
                <input
                  type="checkbox"
                  checked={activeFilters.tasks}
                  onChange={(event) => setActiveFilters((current) => ({ ...current, tasks: event.target.checked }))}
                  className="w-4 h-4 rounded bg-dn-bg-elevated border-dn-border text-dn-purple focus:ring-dn-purple/30"
                />
                <span className="flex items-center gap-2 group-hover:text-dn-purple transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full bg-dn-purple" />
                  Tarefas Kanban
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group text-dn-body text-dn-text-primary">
                <input
                  type="checkbox"
                  checked={activeFilters.finance}
                  onChange={(event) => setActiveFilters((current) => ({ ...current, finance: event.target.checked }))}
                  className="w-4 h-4 rounded bg-dn-bg-elevated border-dn-border text-dn-success focus:ring-dn-success/30"
                />
                <span className="flex items-center gap-2 group-hover:text-dn-success transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full bg-dn-success" />
                  Finanças (Faturas/Contas)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group text-dn-body text-dn-text-primary">
                <input
                  type="checkbox"
                  checked={activeFilters.meetings}
                  onChange={(event) => setActiveFilters((current) => ({ ...current, meetings: event.target.checked }))}
                  className="w-4 h-4 rounded bg-dn-bg-elevated border-dn-border text-dn-warning focus:ring-dn-warning/30"
                />
                <span className="flex items-center gap-2 group-hover:text-dn-warning transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full bg-dn-warning animate-pulse" />
                  Compromissos / Reuniões
                </span>
              </label>
            </div>
          </section>

          <section className="bg-dn-bg-card border-[0.5px] border-white/5 rounded-[24px] p-6 shadow-xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-dn-accent/30 to-transparent" />

            <header className="mb-4">
              <span className="text-[10px] text-dn-text-muted font-bold font-mono tracking-widest uppercase">
                Dia Selecionado
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{selectedDayLabel}</h3>
            </header>

            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto scrollbar-thin">
              {isLoading ? (
                <DayEventsSkeleton />
              ) : selectedDayEvents.length === 0 ? (
                <p className="text-xs text-dn-text-muted text-center py-6 border border-dashed border-white/5 rounded-xl">
                  Nenhum evento neste dia.
                </p>
              ) : (
                selectedDayEvents.map((eventItem) => {
                  const meta = EVENT_META[eventItem.type] ?? EVENT_META.project
                  const categoryLabel = eventItem.type === 'meeting' ? eventItem.appointmentType || meta.label : meta.label

                  return (
                    <div
                      key={eventItem.id}
                      className="bg-dn-bg-elevated border-[0.5px] border-white/5 rounded-xl p-3.5 hover:border-white/10 transition-colors relative group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold font-mono border px-1.5 py-0.5 rounded uppercase ${meta.chipClass}`}>
                          {categoryLabel}
                        </span>
                        {eventItem.time && (
                          <span className="text-[10px] text-white font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">
                            {eventItem.time}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-semibold text-white leading-normal line-clamp-2">{eventItem.title}</h4>

                      {eventItem.client && (
                        <p className="text-[10px] text-dn-text-secondary mt-1">
                          Cliente: <span className="text-white">{eventItem.client}</span>
                        </p>
                      )}
                      {eventItem.project && (
                        <p className="text-[10px] text-dn-text-secondary mt-1">
                          Projeto: <span className="text-white">{eventItem.project}</span>
                        </p>
                      )}
                      {eventItem.value && (
                        <p className="text-[10px] text-dn-text-secondary mt-1">
                          Valor: <span className="text-dn-accent font-mono font-bold">{eventItem.value}</span>
                        </p>
                      )}
                      {eventItem.budget && (
                        <p className="text-[10px] text-dn-text-secondary mt-1">
                          Orçamento: <span className="text-dn-accent font-mono font-bold">{eventItem.budget}</span>
                        </p>
                      )}
                      {eventItem.description && (
                        <p className="text-[10px] text-dn-text-muted mt-2 line-clamp-3">{eventItem.description}</p>
                      )}

                      <div className="flex justify-end gap-2 mt-3 pt-2 border-t-[0.5px] border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {eventItem.redirectPath ? (
                          <Link to={eventItem.redirectPath} className="w-full">
                            <button className="w-full bg-dn-accent/10 border-[0.5px] border-dn-accent/30 hover:bg-dn-accent hover:text-white py-1 rounded text-[9px] font-bold transition-all text-dn-accent tracking-wider">
                              ABRIR ELEMENTO
                            </button>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleDeleteAppointment(eventItem)}
                            className="w-full bg-dn-danger/10 border-[0.5px] border-dn-danger/30 hover:bg-dn-danger hover:text-white py-1 rounded text-[9px] font-bold transition-all text-dn-danger tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            EXCLUIR COMPROMISSO
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {selectedDayString && (
              <button
                type="button"
                disabled={isSaving || isLoading}
                onClick={() => setShowScheduleModal(true)}
                className="w-full bg-dn-accent/15 border border-dn-accent/30 text-dn-accent py-3 rounded-full text-xs font-semibold shadow-[0_0_15px_rgba(58,191,255,0.1)] hover:shadow-[0_0_25px_rgba(58,191,255,0.25)] hover:bg-dn-accent/25 hover:border-dn-accent/60 transition-all font-mono tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agendar Compromisso +
              </button>
            )}
          </section>
        </aside>

        <main className="lg:col-span-3 bg-dn-bg-card border-[0.5px] border-white/5 rounded-[28px] p-6 shadow-2xl backdrop-blur-xl">
          <nav className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b-[0.5px] border-white/5">
            <div className="flex items-center gap-2">
              <select
                value={currentDate.getMonth()}
                onChange={handleMonthSelect}
                className="h-10 text-xs font-bold font-mono tracking-tight text-white border border-white/10 hover:border-dn-accent rounded-xl bg-dn-bg-elevated px-3 cursor-pointer outline-none"
                style={{ width: '140px' }}
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index} className="bg-dn-bg-elevated text-white">
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={currentDate.getFullYear()}
                onChange={handleYearSelect}
                className="h-10 text-xs font-bold font-mono tracking-tight text-white border border-white/10 hover:border-dn-accent rounded-xl bg-dn-bg-elevated px-3 cursor-pointer outline-none"
                style={{ width: '100px' }}
              >
                {YEARS.map((year) => (
                  <option key={year} value={year} className="bg-dn-bg-elevated text-white">
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                type="button"
                onClick={prevMonth}
                title="Mês Anterior"
                className="w-9 h-9 rounded-full bg-dn-bg-elevated border-[0.5px] border-white/5 text-dn-text-secondary hover:text-white hover:border-dn-accent/50 flex items-center justify-center transition-all hover:shadow-[0_0_10px_rgba(58,191,255,0.15)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={nextMonth}
                title="Próximo Mês"
                className="w-9 h-9 rounded-full bg-dn-bg-elevated border-[0.5px] border-white/5 text-dn-text-secondary hover:text-white hover:border-dn-accent/50 flex items-center justify-center transition-all hover:shadow-[0_0_10px_rgba(58,191,255,0.15)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </nav>

          <div className="grid gap-2 text-center mb-3" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-[11px] font-bold text-dn-text-muted tracking-widest font-mono uppercase py-1">
                {day}
              </span>
            ))}
          </div>

          {isLoading ? (
            <CalendarSkeleton />
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(140px, 1fr)' }}>
              {calendarDays.map((cell) => {
                const dayEvents = eventsByDate[cell.dateString] || []
                const daySelected = cell.dateString === selectedDayString
                const cellToday = isToday(cell.dateString)
                const colStartStyle = cell.day === 1 ? { gridColumnStart: cell.firstDayIndex + 1 } : {}

                return (
                  <div
                    key={cell.dateString}
                    onClick={() => setSelectedDayString(cell.dateString)}
                    style={colStartStyle}
                    className={`relative flex flex-col justify-between p-3 rounded-2xl border transition-all cursor-pointer h-full group
                      ${cell.isCurrentMonth ? 'bg-dn-bg-elevated/40 text-dn-text-primary' : 'bg-transparent text-dn-text-muted border-transparent opacity-35'}
                      ${
                        daySelected
                          ? 'border-dn-accent/80 bg-dn-accent/10 shadow-[0_0_12px_rgba(58,191,255,0.25)]'
                          : cellToday
                            ? 'border-dn-accent shadow-[0_0_15px_rgba(58,191,255,0.35)] ring-1 ring-dn-accent'
                            : 'border-white/5 hover:border-white/20'
                      }
                    `}
                  >
                    <header className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold font-mono leading-none w-8 h-8 flex items-center justify-center rounded-full text-white">
                        {cell.day}
                      </span>
                    </header>

                    <div className="flex flex-col gap-1 mt-auto w-full overflow-hidden max-h-[90px]">
                      {dayEvents.slice(0, 3).map((eventItem) => {
                        const meta = EVENT_META[eventItem.type] ?? EVENT_META.project

                        return (
                          <div
                            key={eventItem.id}
                            title={eventItem.title}
                            className={`text-[10px] font-semibold font-mono truncate px-2 py-1 rounded-md border ${meta.chipClass} transition-all`}
                          >
                            {eventItem.time ? `${eventItem.time} · ${eventItem.title}` : eventItem.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] font-bold font-mono text-dn-text-muted leading-none pl-1 mt-1">
                          +{dayEvents.length - 3} mais
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
          <div className="w-full max-w-lg rounded-[28px] bg-dn-bg-card border-[0.5px] border-white/10 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-dn-warning via-dn-accent to-dn-success" />

            <header className="mb-6">
              <h3 className="text-2xl font-bold text-white tracking-tight">Agendar Compromisso</h3>
              <p className="mt-1 text-xs text-dn-text-secondary">
                Agende um compromisso ou reunião para o dia{' '}
                <span className="text-dn-accent font-semibold">{formatDateLabel(selectedDayString)}</span>.
              </p>
            </header>

            <form onSubmit={handleScheduleSubmit} className="space-y-6">
              <div>
                <label className="block text-dn-label text-dn-text-muted mb-1.5 uppercase font-mono tracking-wider">
                  Título do Agendamento *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Ex: Reunião de definição de escopo"
                  value={scheduleForm.title}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dn-label text-dn-text-muted mb-1.5 uppercase font-mono tracking-wider">
                    Tipo
                  </label>
                  <Select
                    value={scheduleForm.type}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, type: event.target.value }))}
                  >
                    <option value="Reunião">Reunião</option>
                    <option value="Ligação">Ligação/Call</option>
                    <option value="Entrega">Entrega/Deadline</option>
                    <option value="Outro">Outro</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-dn-label text-dn-text-muted mb-1.5 uppercase font-mono tracking-wider">
                    Horário
                  </label>
                  <Input
                    type="time"
                    required
                    value={scheduleForm.time}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, time: event.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-dn-label text-dn-text-muted mb-1.5 uppercase font-mono tracking-wider">
                  Cliente Vinculado (Opcional)
                </label>
                <Select
                  value={scheduleForm.clientName}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, clientName: event.target.value }))}
                >
                  <option value="">Nenhum cliente</option>
                  {calendarData.clients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-dn-label text-dn-text-muted mb-1.5 uppercase font-mono tracking-wider">
                  Descrição / Observações
                </label>
                <textarea
                  rows={3}
                  placeholder="Pauta da reunião, links de salas virtuais, etc."
                  value={scheduleForm.description}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md px-4 py-2.5 text-dn-body text-white outline-none focus:border-dn-accent/50 focus:ring-1 focus:ring-dn-accent/50 transition-all resize-none placeholder-dn-text-muted"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-[0.5px] border-white/5 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-dn-accent hover:bg-dn-accent/90">
                  {isSaving ? 'Salvando...' : 'Agendar Compromisso'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarPage
