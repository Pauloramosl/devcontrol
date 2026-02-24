import { supabase } from './supabase.js'

function normalizeName(value, fieldLabel) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    throw new Error(`${fieldLabel} is required.`)
  }

  return trimmed
}

export async function listPipelines({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to list pipelines.')
  }

  const { data, error } = await supabase
    .from('pipelines')
    .select('id, owner_id, name, created_at, updated_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getPipelineById({ ownerId, pipelineId }) {
  if (!ownerId || !pipelineId) {
    throw new Error('ownerId and pipelineId are required to load pipeline.')
  }

  const { data, error } = await supabase
    .from('pipelines')
    .select('id, owner_id, name, created_at, updated_at')
    .eq('owner_id', ownerId)
    .eq('id', pipelineId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function createPipeline({ ownerId, name }) {
  if (!ownerId) {
    throw new Error('ownerId is required to create pipeline.')
  }

  const normalizedName = normalizeName(name, 'Pipeline name')

  const { data, error } = await supabase
    .from('pipelines')
    .insert({
      owner_id: ownerId,
      name: normalizedName,
    })
    .select('id, owner_id, name, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deletePipeline({ ownerId, pipelineId }) {
  if (!ownerId || !pipelineId) {
    throw new Error('ownerId and pipelineId are required to delete pipeline.')
  }

  const { error } = await supabase
    .from('pipelines')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', pipelineId)

  if (error) {
    throw error
  }
}

export async function listPipelineColumns({ ownerId, pipelineId }) {
  if (!ownerId || !pipelineId) {
    throw new Error('ownerId and pipelineId are required to list columns.')
  }

  const { data, error } = await supabase
    .from('pipeline_columns')
    .select('id, owner_id, pipeline_id, name, column_order, created_at, updated_at')
    .eq('owner_id', ownerId)
    .eq('pipeline_id', pipelineId)
    .order('column_order', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createPipelineColumn({ ownerId, pipelineId, name }) {
  if (!ownerId || !pipelineId) {
    throw new Error('ownerId and pipelineId are required to create column.')
  }

  const columnName = normalizeName(name, 'Column name')

  const { data: lastColumn, error: orderError } = await supabase
    .from('pipeline_columns')
    .select('column_order')
    .eq('owner_id', ownerId)
    .eq('pipeline_id', pipelineId)
    .order('column_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (orderError) {
    throw orderError
  }

  const nextOrder = typeof lastColumn?.column_order === 'number' ? lastColumn.column_order + 1 : 0

  const { data, error } = await supabase
    .from('pipeline_columns')
    .insert({
      owner_id: ownerId,
      pipeline_id: pipelineId,
      name: columnName,
      column_order: nextOrder,
    })
    .select('id, owner_id, pipeline_id, name, column_order, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function renamePipelineColumn({ ownerId, columnId, name }) {
  if (!ownerId || !columnId) {
    throw new Error('ownerId and columnId are required to rename column.')
  }

  const columnName = normalizeName(name, 'Column name')

  const { data, error } = await supabase
    .from('pipeline_columns')
    .update({ name: columnName })
    .eq('owner_id', ownerId)
    .eq('id', columnId)
    .select('id, owner_id, pipeline_id, name, column_order, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deletePipelineColumn({ ownerId, columnId }) {
  if (!ownerId || !columnId) {
    throw new Error('ownerId and columnId are required to delete column.')
  }

  const { error } = await supabase
    .from('pipeline_columns')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', columnId)

  if (error) {
    throw error
  }
}

export async function reorderPipelineColumns({
  ownerId,
  pipelineId,
  orderedColumnIds,
  previousOrderedColumnIds = [],
}) {
  if (!ownerId || !pipelineId) {
    throw new Error('ownerId and pipelineId are required to reorder columns.')
  }

  const uniqueIds = [...new Set(orderedColumnIds ?? [])]
  const previousIndexMap = new Map(
    (previousOrderedColumnIds ?? []).map((columnId, index) => [columnId, index]),
  )

  for (let index = 0; index < uniqueIds.length; index += 1) {
    const columnId = uniqueIds[index]
    const previousIndex = previousIndexMap.get(columnId)
    if (previousIndex === index) {
      continue
    }

    const { error } = await supabase
      .from('pipeline_columns')
      .update({ column_order: index })
      .eq('owner_id', ownerId)
      .eq('pipeline_id', pipelineId)
      .eq('id', columnId)

    if (error) {
      throw error
    }
  }
}
