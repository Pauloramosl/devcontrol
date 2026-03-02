import { supabase } from './supabase.js'

export const RECURRENCE_STATUSES = ['active', 'paused', 'canceled']
export const INVOICE_STATUSES = ['pending', 'paid', 'overdue', 'canceled']
export const INVOICE_FILTER_STATUSES = ['all', 'pending', 'paid', 'overdue']
export const PAYMENT_METHOD_OPTIONS = ['pix', 'boleto', 'transfer', 'card', 'cash']

function normalizeText(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : null
}

function normalizePositiveValue(value) {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Value must be greater than 0.')
  }

  return parsed
}

function normalizeDueDay(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
    throw new Error('Due day must be between 1 and 31.')
  }

  return parsed
}

function normalizeStartDate(value) {
  const date = String(value ?? '').trim()
  if (!date) {
    throw new Error('Start date is required.')
  }

  return date
}

function normalizeRecurrenceStatus(value) {
  const status = String(value ?? '').trim().toLowerCase()
  if (!RECURRENCE_STATUSES.includes(status)) {
    throw new Error('Invalid recurrence status.')
  }

  return status
}

function normalizeReferenceMonth(value) {
  const referenceMonth = String(value ?? '').trim()
  if (!referenceMonth) return ''
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) {
    throw new Error('Reference month must use YYYY-MM.')
  }

  return referenceMonth
}

function normalizeRecurrenceInput(input) {
  return {
    client_id: String(input?.client_id ?? '').trim(),
    value: normalizePositiveValue(input?.value),
    periodicity: 'monthly',
    start_date: normalizeStartDate(input?.start_date),
    due_day: normalizeDueDay(input?.due_day),
    status: normalizeRecurrenceStatus(input?.status ?? 'active'),
    notes: normalizeText(input?.notes),
  }
}

function mapClient(row) {
  if (!row) return null
  if (Array.isArray(row.clients)) return row.clients[0] ?? null
  return row.clients ?? null
}

export function getTodayIsoDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getCurrentReferenceMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function buildDueDateFromReferenceMonth(referenceMonth, dueDay) {
  const [yearRaw, monthRaw] = referenceMonth.split('-')
  const year = Number.parseInt(yearRaw, 10)
  const month = Number.parseInt(monthRaw, 10)

  const lastDayOfMonth = new Date(year, month, 0).getDate()
  const safeDueDay = Math.min(Math.max(dueDay, 1), lastDayOfMonth)
  return `${yearRaw}-${String(month).padStart(2, '0')}-${String(safeDueDay).padStart(2, '0')}`
}

export function getInvoiceDisplayStatus(invoice, todayIsoDate = getTodayIsoDate()) {
  if (invoice.status === 'pending' && invoice.due_date && invoice.due_date < todayIsoDate) {
    return 'overdue'
  }

  return invoice.status
}

export async function listFinanceClients({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to load clients.')
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('owner_id', ownerId)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function listRecurrences({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to list recurrences.')
  }

  const { data, error } = await supabase
    .from('recurrences')
    .select(
      'id, owner_id, client_id, value, periodicity, start_date, due_day, status, last_generated_month, notes, created_at, updated_at, clients(id, name)',
    )
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const client = mapClient(row)
    return {
      ...row,
      client_name: client?.name ?? 'Cliente',
    }
  })
}

export async function getRecurrenceById({ ownerId, recurrenceId }) {
  if (!ownerId || !recurrenceId) {
    throw new Error('ownerId and recurrenceId are required.')
  }

  const { data, error } = await supabase
    .from('recurrences')
    .select(
      'id, owner_id, client_id, value, periodicity, start_date, due_day, status, last_generated_month, notes, created_at, updated_at, clients(id, name)',
    )
    .eq('owner_id', ownerId)
    .eq('id', recurrenceId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) return null

  const client = mapClient(data)
  return {
    ...data,
    client_name: client?.name ?? 'Cliente',
  }
}

export async function createRecurrence({ ownerId, input }) {
  if (!ownerId) {
    throw new Error('ownerId is required to create recurrence.')
  }

  const payload = normalizeRecurrenceInput(input)
  if (!payload.client_id) {
    throw new Error('Client is required.')
  }

  const { data, error } = await supabase
    .from('recurrences')
    .insert({
      owner_id: ownerId,
      ...payload,
    })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateRecurrence({ ownerId, recurrenceId, input }) {
  if (!ownerId || !recurrenceId) {
    throw new Error('ownerId and recurrenceId are required to update recurrence.')
  }

  const payload = normalizeRecurrenceInput(input)
  if (!payload.client_id) {
    throw new Error('Client is required.')
  }

  const { data, error } = await supabase
    .from('recurrences')
    .update(payload)
    .eq('owner_id', ownerId)
    .eq('id', recurrenceId)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteRecurrence({ ownerId, recurrenceId }) {
  if (!ownerId || !recurrenceId) {
    throw new Error('ownerId and recurrenceId are required to delete recurrence.')
  }

  const { error } = await supabase
    .from('recurrences')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', recurrenceId)

  if (error) {
    throw error
  }
}

export async function generateCurrentMonthInvoices({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to generate invoices.')
  }

  const referenceMonth = getCurrentReferenceMonth()

  const { data: recurrences, error: recurrencesError } = await supabase
    .from('recurrences')
    .select('id, owner_id, client_id, value, due_day')
    .eq('owner_id', ownerId)
    .eq('status', 'active')

  if (recurrencesError) {
    throw recurrencesError
  }

  const activeRecurrences = recurrences ?? []
  if (!activeRecurrences.length) {
    return {
      referenceMonth,
      createdCount: 0,
      skippedCount: 0,
    }
  }

  const recurrenceIds = activeRecurrences.map((row) => row.id)

  const { data: existingInvoices, error: existingError } = await supabase
    .from('invoices')
    .select('id, recurrence_id')
    .eq('owner_id', ownerId)
    .eq('reference_month', referenceMonth)
    .in('recurrence_id', recurrenceIds)

  if (existingError) {
    throw existingError
  }

  const existingRecurrenceIds = new Set((existingInvoices ?? []).map((row) => row.recurrence_id))

  const rowsToInsert = activeRecurrences
    .filter((row) => !existingRecurrenceIds.has(row.id))
    .map((row) => ({
      owner_id: ownerId,
      client_id: row.client_id,
      recurrence_id: row.id,
      reference_month: referenceMonth,
      value: row.value,
      due_date: buildDueDateFromReferenceMonth(referenceMonth, row.due_day),
      status: 'pending',
    }))

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('invoices').insert(rowsToInsert)
    if (insertError) {
      throw insertError
    }

    const { error: updateLastGeneratedError } = await supabase
      .from('recurrences')
      .update({ last_generated_month: referenceMonth })
      .eq('owner_id', ownerId)
      .in(
        'id',
        rowsToInsert.map((row) => row.recurrence_id),
      )

    if (updateLastGeneratedError) {
      throw updateLastGeneratedError
    }
  }

  return {
    referenceMonth,
    createdCount: rowsToInsert.length,
    skippedCount: activeRecurrences.length - rowsToInsert.length,
  }
}

export async function listInvoices({
  ownerId,
  status = 'all',
  clientId = 'all',
  referenceMonth = '',
}) {
  if (!ownerId) {
    throw new Error('ownerId is required to list invoices.')
  }

  const normalizedStatus = String(status ?? 'all').trim().toLowerCase()
  if (!INVOICE_FILTER_STATUSES.includes(normalizedStatus)) {
    throw new Error('Invalid status filter.')
  }

  const normalizedClientId = String(clientId ?? 'all').trim()
  const normalizedReferenceMonth = normalizeReferenceMonth(referenceMonth)

  let query = supabase
    .from('invoices')
    .select(
      'id, owner_id, client_id, project_id, recurrence_id, reference_month, value, due_date, status, payment_method, paid_at, created_at, updated_at, clients(id, name)',
    )
    .eq('owner_id', ownerId)
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: false })

  if (normalizedClientId && normalizedClientId !== 'all') {
    query = query.eq('client_id', normalizedClientId)
  }

  if (normalizedReferenceMonth) {
    query = query.eq('reference_month', normalizedReferenceMonth)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  const todayIsoDate = getTodayIsoDate()

  const mapped = (data ?? []).map((invoice) => {
    const client = mapClient(invoice)
    const displayStatus = getInvoiceDisplayStatus(invoice, todayIsoDate)

    return {
      ...invoice,
      client_name: client?.name ?? 'Cliente',
      display_status: displayStatus,
    }
  })

  if (normalizedStatus === 'all') {
    return mapped
  }

  return mapped.filter((invoice) => invoice.display_status === normalizedStatus)
}

export async function markInvoiceAsPaid({ ownerId, invoiceId, paymentMethod }) {
  if (!ownerId || !invoiceId) {
    throw new Error('ownerId and invoiceId are required to mark invoice as paid.')
  }

  const method = normalizeText(paymentMethod)
  if (!method) {
    throw new Error('Payment method is required.')
  }

  const paidAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: paidAt,
      payment_method: method,
    })
    .eq('owner_id', ownerId)
    .eq('id', invoiceId)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getFinanceSummary({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to load finance summary.')
  }

  const [recurrencesResult, invoicesResult] = await Promise.all([
    supabase
      .from('recurrences')
      .select('id, value, status, periodicity')
      .eq('owner_id', ownerId),
    supabase
      .from('invoices')
      .select('id, value, due_date, status, payment_method, clients(id, name)')
      .eq('owner_id', ownerId),
  ])

  if (recurrencesResult.error) {
    throw recurrencesResult.error
  }

  if (invoicesResult.error) {
    throw invoicesResult.error
  }

  const recurrences = recurrencesResult.data ?? []
  const invoices = invoicesResult.data ?? []
  const todayIsoDate = getTodayIsoDate()

  const mrr = recurrences
    .filter((recurrence) => recurrence.status === 'active' && recurrence.periodicity === 'monthly')
    .reduce((sum, recurrence) => sum + Number(recurrence.value ?? 0), 0)

  const mappedInvoices = invoices.map((invoice) => ({
    ...invoice,
    display_status: getInvoiceDisplayStatus(invoice, todayIsoDate),
    client_name: mapClient(invoice)?.name ?? 'Cliente',
  }))

  const receivableTotal = mappedInvoices
    .filter((invoice) => invoice.display_status === 'pending' || invoice.display_status === 'overdue')
    .reduce((sum, invoice) => sum + Number(invoice.value ?? 0), 0)

  const overdueInvoices = mappedInvoices.filter((invoice) => invoice.display_status === 'overdue')

  const overdueCount = overdueInvoices.length
  const overdueTotal = overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.value ?? 0), 0)

  const upcomingInvoices = mappedInvoices
    .filter((invoice) => invoice.display_status === 'pending')
    .sort((left, right) => left.due_date.localeCompare(right.due_date))
    .slice(0, 5)

  return {
    mrr,
    receivableTotal,
    overdueCount,
    overdueTotal,
    upcomingInvoices,
  }
}
