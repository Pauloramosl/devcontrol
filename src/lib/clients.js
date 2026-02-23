import { supabase } from './supabase.js'

export const CLIENT_STATUSES = ['active', 'paused', 'closed']

function normalizeText(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : null
}

function normalizeSearchTerm(value) {
  return String(value ?? '')
    .trim()
    .replace(/[%_]/g, '')
    .replace(/,/g, ' ')
}

function normalizeStatus(value) {
  const status = String(value ?? '').trim().toLowerCase()
  if (!CLIENT_STATUSES.includes(status)) {
    throw new Error('Invalid status. Use active, paused or closed.')
  }

  return status
}

function normalizeClientInput(input) {
  const name = String(input?.name ?? '').trim()
  if (!name) {
    throw new Error('Client name is required.')
  }

  const status = normalizeStatus(input?.status ?? 'active')

  return {
    name,
    email: normalizeText(input?.email),
    phone: normalizeText(input?.phone),
    company: normalizeText(input?.company),
    document_number: normalizeText(input?.document_number),
    status,
    notes: normalizeText(input?.notes),
  }
}

function mapTagFromRelation(relation) {
  if (!relation) return null
  if (Array.isArray(relation.client_tags)) {
    return relation.client_tags[0] ?? null
  }

  return relation.client_tags ?? null
}

function buildTagsMap(relations) {
  const map = new Map()

  for (const relation of relations ?? []) {
    const tag = mapTagFromRelation(relation)
    if (!tag) continue

    if (!map.has(relation.client_id)) {
      map.set(relation.client_id, [])
    }

    map.get(relation.client_id).push(tag)
  }

  return map
}

async function listRelationsByClientIds({ ownerId, clientIds }) {
  if (!clientIds.length) return []

  const { data, error } = await supabase
    .from('client_tag_relations')
    .select('client_id, tag_id, client_tags(id, name)')
    .eq('owner_id', ownerId)
    .in('client_id', clientIds)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function listClients({ ownerId, searchTerm = '', status = 'all', tagId = 'all' }) {
  if (!ownerId) {
    throw new Error('ownerId is required to list clients.')
  }

  let scopedClientIds = null

  if (tagId && tagId !== 'all') {
    const { data: relationRows, error: relationError } = await supabase
      .from('client_tag_relations')
      .select('client_id')
      .eq('owner_id', ownerId)
      .eq('tag_id', tagId)

    if (relationError) {
      throw relationError
    }

    const uniqueIds = [...new Set((relationRows ?? []).map((row) => row.client_id))]
    if (!uniqueIds.length) {
      return []
    }

    scopedClientIds = uniqueIds
  }

  let query = supabase
    .from('clients')
    .select('id, owner_id, name, email, company, status, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', normalizeStatus(status))
  }

  if (scopedClientIds) {
    query = query.in('id', scopedClientIds)
  }

  const cleanedSearchTerm = normalizeSearchTerm(searchTerm)
  if (cleanedSearchTerm) {
    query = query.or(`name.ilike.%${cleanedSearchTerm}%,email.ilike.%${cleanedSearchTerm}%`)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  const clients = data ?? []
  const clientIds = clients.map((client) => client.id)
  const relations = await listRelationsByClientIds({ ownerId, clientIds })
  const tagsMap = buildTagsMap(relations)

  return clients.map((client) => ({
    ...client,
    tags: tagsMap.get(client.id) ?? [],
  }))
}

export async function getClientById({ ownerId, clientId }) {
  if (!ownerId || !clientId) {
    throw new Error('ownerId and clientId are required to load client details.')
  }

  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, owner_id, name, email, phone, company, document_number, status, notes, created_at, updated_at',
    )
    .eq('owner_id', ownerId)
    .eq('id', clientId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const relations = await listRelationsByClientIds({ ownerId, clientIds: [clientId] })
  const tagsMap = buildTagsMap(relations)

  return {
    ...data,
    tags: tagsMap.get(clientId) ?? [],
  }
}

export async function createClient({ ownerId, input }) {
  if (!ownerId) {
    throw new Error('ownerId is required to create a client.')
  }

  const payload = normalizeClientInput(input)

  const { data, error } = await supabase
    .from('clients')
    .insert({
      owner_id: ownerId,
      ...payload,
    })
    .select('id, owner_id, name, status')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateClient({ ownerId, clientId, input }) {
  if (!ownerId || !clientId) {
    throw new Error('ownerId and clientId are required to update a client.')
  }

  const payload = normalizeClientInput(input)

  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('owner_id', ownerId)
    .eq('id', clientId)
    .select('id, owner_id, name, status')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function setClientTags({ ownerId, clientId, tagIds }) {
  if (!ownerId || !clientId) {
    throw new Error('ownerId and clientId are required to update client tags.')
  }

  const normalizedTagIds = [...new Set((tagIds ?? []).filter(Boolean))]

  if (normalizedTagIds.length > 0) {
    const { data: availableTags, error: tagsError } = await supabase
      .from('client_tags')
      .select('id')
      .eq('owner_id', ownerId)
      .in('id', normalizedTagIds)

    if (tagsError) {
      throw tagsError
    }

    if ((availableTags ?? []).length !== normalizedTagIds.length) {
      throw new Error('One or more selected tags are invalid for this account.')
    }
  }

  const { error: deleteError } = await supabase
    .from('client_tag_relations')
    .delete()
    .eq('owner_id', ownerId)
    .eq('client_id', clientId)

  if (deleteError) {
    throw deleteError
  }

  if (!normalizedTagIds.length) {
    return
  }

  const rows = normalizedTagIds.map((tagId) => ({
    owner_id: ownerId,
    client_id: clientId,
    tag_id: tagId,
  }))

  const { error: insertError } = await supabase.from('client_tag_relations').insert(rows)
  if (insertError) {
    throw insertError
  }
}

export async function deleteClient({ ownerId, clientId }) {
  if (!ownerId || !clientId) {
    throw new Error('ownerId and clientId are required to delete a client.')
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', clientId)

  if (error) {
    throw error
  }
}
