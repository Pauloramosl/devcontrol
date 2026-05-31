import { supabase } from './supabase.js'

function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayIsoDate() {
  return formatIsoDate(new Date())
}

function getIsoDatePlusDays(days) {
  const base = new Date()
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days)
  return formatIsoDate(next)
}

export async function getAlertCounts({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to load alerts.')
  }

  const today = getTodayIsoDate()
  const nextWeek = getIsoDatePlusDays(7)

  const [overdueInvoices, overdueExpenses, upcomingInvoices, upcomingExpenses] =
    await Promise.all([
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .lt('due_date', today),
      supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .lt('due_date', today),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .gte('due_date', today)
        .lte('due_date', nextWeek),
      supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .gte('due_date', today)
        .lte('due_date', nextWeek),
    ])

  if (overdueInvoices.error) throw overdueInvoices.error
  if (overdueExpenses.error) throw overdueExpenses.error
  if (upcomingInvoices.error) throw upcomingInvoices.error
  if (upcomingExpenses.error) throw upcomingExpenses.error

  const counts = {
    overdueInvoices: overdueInvoices.count ?? 0,
    overdueExpenses: overdueExpenses.count ?? 0,
    upcomingInvoices: upcomingInvoices.count ?? 0,
    upcomingExpenses: upcomingExpenses.count ?? 0,
  }

  return {
    ...counts,
    total:
      counts.overdueInvoices +
      counts.overdueExpenses +
      counts.upcomingInvoices +
      counts.upcomingExpenses,
  }
}

export async function loadAlerts({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to load alerts.')
  }

  const today = getTodayIsoDate()
  const nextWeek = getIsoDatePlusDays(7)

  const [overdueInvoicesResult, overdueExpensesResult, upcomingInvoicesResult, upcomingExpensesResult] =
    await Promise.all([
      supabase
        .from('invoices')
        .select('id, client_id, value, due_date, reference_month, clients(id, name)')
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true }),
      supabase
        .from('expenses')
        .select('id, description, category, value, due_date, status')
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true }),
      supabase
        .from('invoices')
        .select('id, client_id, value, due_date, reference_month, clients(id, name)')
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .gte('due_date', today)
        .lte('due_date', nextWeek)
        .order('due_date', { ascending: true }),
      supabase
        .from('expenses')
        .select('id, description, category, value, due_date, status')
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .gte('due_date', today)
        .lte('due_date', nextWeek)
        .order('due_date', { ascending: true }),
    ])

  if (overdueInvoicesResult.error) throw overdueInvoicesResult.error
  if (overdueExpensesResult.error) throw overdueExpensesResult.error
  if (upcomingInvoicesResult.error) throw upcomingInvoicesResult.error
  if (upcomingExpensesResult.error) throw upcomingExpensesResult.error

  return {
    overdueInvoices: overdueInvoicesResult.data ?? [],
    overdueExpenses: overdueExpensesResult.data ?? [],
    upcomingInvoices: upcomingInvoicesResult.data ?? [],
    upcomingExpenses: upcomingExpensesResult.data ?? [],
  }
}
