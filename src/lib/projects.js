import { supabase } from './supabase.js'

function normalizeText(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : null
}

function normalizeDate(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : null
}

function normalizeBudget(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  if (Number.isNaN(parsed)) {
    throw new Error('Budget value must be numeric.')
  }

  return parsed
}

function normalizeProjectInput(input) {
  const clientId = String(input?.client_id ?? '').trim()
  if (!clientId) {
    throw new Error('Client is required.')
  }

  const status = String(input?.status ?? '').trim() || 'active'

  return {
    client_id: clientId,
    service_type: normalizeText(input?.service_type),
    budget_value: normalizeBudget(input?.budget_value),
    scope_text: normalizeText(input?.scope_text),
    proposal_text: normalizeText(input?.proposal_text),
    start_date: normalizeDate(input?.start_date),
    due_date: normalizeDate(input?.due_date),
    status,
  }
}

function normalizePipelineId(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : null
}

function mapClientFromProject(projectRow) {
  if (!projectRow) return null
  if (Array.isArray(projectRow.clients)) {
    return projectRow.clients[0] ?? null
  }

  return projectRow.clients ?? null
}

export async function listProjectClients({ ownerId }) {
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

export async function listProjects({ ownerId, status = 'all', clientId = 'all' }) {
  if (!ownerId) {
    throw new Error('ownerId is required to list projects.')
  }

  let query = supabase
    .from('projects')
    .select(
      'id, owner_id, client_id, service_type, budget_value, status, due_date, created_at, clients(id, name)',
    )
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  const normalizedStatus = String(status ?? '').trim()
  if (normalizedStatus && normalizedStatus !== 'all') {
    query = query.eq('status', normalizedStatus)
  }

  const normalizedClientId = String(clientId ?? '').trim()
  if (normalizedClientId && normalizedClientId !== 'all') {
    query = query.eq('client_id', normalizedClientId)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return (data ?? []).map((project) => {
    const client = mapClientFromProject(project)
    return {
      ...project,
      client,
      client_name: client?.name ?? 'Unknown client',
    }
  })
}

export async function getProjectById({ ownerId, projectId }) {
  if (!ownerId || !projectId) {
    throw new Error('ownerId and projectId are required.')
  }

  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, owner_id, client_id, service_type, budget_value, scope_text, proposal_text, start_date, due_date, status, created_at, updated_at, clients(id, name)',
    )
    .eq('owner_id', ownerId)
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const client = mapClientFromProject(data)
  return {
    ...data,
    client,
    client_name: client?.name ?? 'Unknown client',
  }
}

export async function createProject({ ownerId, input, pipelineId = null }) {
  if (!ownerId) {
    throw new Error('ownerId is required to create a project.')
  }

  const payload = normalizeProjectInput(input)
  const normalizedPipelineId = normalizePipelineId(pipelineId)
  let templateColumns = []

  if (normalizedPipelineId) {
    const { data: pipelineColumns, error: pipelineColumnsError } = await supabase
      .from('pipeline_columns')
      .select('name, column_order')
      .eq('owner_id', ownerId)
      .eq('pipeline_id', normalizedPipelineId)
      .order('column_order', { ascending: true })

    if (pipelineColumnsError) {
      throw pipelineColumnsError
    }

    templateColumns = pipelineColumns ?? []
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      owner_id: ownerId,
      ...payload,
    })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  if (templateColumns.length > 0) {
    const rows = templateColumns.map((column) => ({
      owner_id: ownerId,
      project_id: data.id,
      name: column.name,
      column_order: column.column_order,
    }))

    const { error: cloneError } = await supabase.from('project_columns').insert(rows)

    if (cloneError) {
      throw cloneError
    }
  }

  return data
}

export async function updateProject({ ownerId, projectId, input }) {
  if (!ownerId || !projectId) {
    throw new Error('ownerId and projectId are required to update a project.')
  }

  const payload = normalizeProjectInput(input)

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('owner_id', ownerId)
    .eq('id', projectId)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteProject({ ownerId, projectId }) {
  if (!ownerId || !projectId) {
    throw new Error('ownerId and projectId are required to delete a project.')
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', projectId)

  if (error) {
    throw error
  }
}
