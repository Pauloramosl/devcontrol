import { supabase } from './supabase.js'

function normalizeTagName(name) {
  return String(name ?? '').trim()
}

export async function listTags({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to list tags.')
  }

  const { data, error } = await supabase
    .from('client_tags')
    .select('id, owner_id, name, created_at')
    .eq('owner_id', ownerId)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createTag({ ownerId, name }) {
  if (!ownerId) {
    throw new Error('ownerId is required to create a tag.')
  }

  const normalizedName = normalizeTagName(name)
  if (!normalizedName) {
    throw new Error('Tag name is required.')
  }

  const { data, error } = await supabase
    .from('client_tags')
    .insert({ owner_id: ownerId, name: normalizedName })
    .select('id, owner_id, name, created_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteTag({ ownerId, tagId }) {
  if (!ownerId || !tagId) {
    throw new Error('ownerId and tagId are required to delete a tag.')
  }

  const { error } = await supabase
    .from('client_tags')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', tagId)

  if (error) {
    throw error
  }
}
