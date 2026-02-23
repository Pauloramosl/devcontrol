import { rankAfter, rankBefore, rankBetween, generateSequentialRanks } from './rank.js'
import { supabase } from './supabase.js'

function normalizeText(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : null
}

function normalizeTaskInput(input) {
  const title = String(input?.title ?? '').trim()
  if (!title) {
    throw new Error('Task title is required.')
  }

  return {
    title,
    description: normalizeText(input?.description),
    priority: normalizeText(input?.priority),
    due_date: normalizeText(input?.due_date),
  }
}

async function createTaskLog({
  ownerId,
  taskId,
  eventType,
  oldValue = null,
  newValue = null,
}) {
  const { error } = await supabase.from('task_logs').insert({
    owner_id: ownerId,
    task_id: taskId,
    event_type: eventType,
    old_value: oldValue,
    new_value: newValue,
  })

  if (error) {
    throw error
  }
}

function getRankForPosition({ prevRank, nextRank }) {
  if (prevRank && nextRank) {
    return rankBetween(prevRank, nextRank)
  }

  if (prevRank) {
    return rankAfter(prevRank)
  }

  if (nextRank) {
    return rankBefore(nextRank)
  }

  return 'U'
}

async function listColumnTasks({ ownerId, columnId, excludeTaskId = null }) {
  let query = supabase
    .from('tasks')
    .select('id, rank')
    .eq('owner_id', ownerId)
    .eq('column_id', columnId)
    .order('rank', { ascending: true })

  if (excludeTaskId) {
    query = query.neq('id', excludeTaskId)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return data ?? []
}

export async function listProjectColumns({ ownerId, projectId }) {
  if (!ownerId || !projectId) {
    throw new Error('ownerId and projectId are required to list columns.')
  }

  const { data, error } = await supabase
    .from('project_columns')
    .select('id, owner_id, project_id, name, column_order, created_at, updated_at')
    .eq('owner_id', ownerId)
    .eq('project_id', projectId)
    .order('column_order', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createProjectColumn({ ownerId, projectId, name }) {
  if (!ownerId || !projectId) {
    throw new Error('ownerId and projectId are required to create a column.')
  }

  const columnName = String(name ?? '').trim()
  if (!columnName) {
    throw new Error('Column name is required.')
  }

  const { data: lastColumn, error: orderError } = await supabase
    .from('project_columns')
    .select('column_order')
    .eq('owner_id', ownerId)
    .eq('project_id', projectId)
    .order('column_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (orderError) {
    throw orderError
  }

  const nextOrder = typeof lastColumn?.column_order === 'number' ? lastColumn.column_order + 1 : 0

  const { data, error } = await supabase
    .from('project_columns')
    .insert({
      owner_id: ownerId,
      project_id: projectId,
      name: columnName,
      column_order: nextOrder,
    })
    .select('id, owner_id, project_id, name, column_order, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function renameProjectColumn({ ownerId, columnId, name }) {
  if (!ownerId || !columnId) {
    throw new Error('ownerId and columnId are required to rename a column.')
  }

  const columnName = String(name ?? '').trim()
  if (!columnName) {
    throw new Error('Column name is required.')
  }

  const { data, error } = await supabase
    .from('project_columns')
    .update({ name: columnName })
    .eq('owner_id', ownerId)
    .eq('id', columnId)
    .select('id, owner_id, project_id, name, column_order, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteProjectColumn({ ownerId, columnId }) {
  if (!ownerId || !columnId) {
    throw new Error('ownerId and columnId are required to delete a column.')
  }

  const { error } = await supabase
    .from('project_columns')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', columnId)

  if (error) {
    throw error
  }
}

export async function reorderProjectColumns({
  ownerId,
  projectId,
  orderedColumnIds,
  previousOrderedColumnIds = [],
}) {
  if (!ownerId || !projectId) {
    throw new Error('ownerId and projectId are required to reorder columns.')
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
      .from('project_columns')
      .update({ column_order: index })
      .eq('owner_id', ownerId)
      .eq('project_id', projectId)
      .eq('id', columnId)

    if (error) {
      throw error
    }
  }
}

export async function listProjectTasks({ ownerId, projectId }) {
  if (!ownerId || !projectId) {
    throw new Error('ownerId and projectId are required to list tasks.')
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, owner_id, project_id, client_id, service_type, column_id, title, description, priority, due_date, rank, status, created_at, updated_at',
    )
    .eq('owner_id', ownerId)
    .eq('project_id', projectId)
    .order('column_id', { ascending: true })
    .order('rank', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createTask({ ownerId, projectId, columnId, input }) {
  if (!ownerId || !projectId || !columnId) {
    throw new Error('ownerId, projectId and columnId are required to create a task.')
  }

  const taskInput = normalizeTaskInput(input)

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('client_id, service_type')
    .eq('owner_id', ownerId)
    .eq('id', projectId)
    .single()

  if (projectError) {
    throw projectError
  }

  const { data: lastTask, error: rankError } = await supabase
    .from('tasks')
    .select('rank')
    .eq('owner_id', ownerId)
    .eq('column_id', columnId)
    .order('rank', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (rankError) {
    throw rankError
  }

  const nextRank = lastTask?.rank ? rankAfter(lastTask.rank) : 'U'

  const { data: createdTask, error: insertError } = await supabase
    .from('tasks')
    .insert({
      owner_id: ownerId,
      project_id: projectId,
      client_id: projectData.client_id,
      service_type: projectData.service_type,
      column_id: columnId,
      title: taskInput.title,
      description: taskInput.description,
      priority: taskInput.priority,
      due_date: taskInput.due_date,
      rank: nextRank,
      status: 'active',
    })
    .select(
      'id, owner_id, project_id, client_id, service_type, column_id, title, description, priority, due_date, rank, status, created_at, updated_at',
    )
    .single()

  if (insertError) {
    throw insertError
  }

  await createTaskLog({
    ownerId,
    taskId: createdTask.id,
    eventType: 'create_task',
    newValue: {
      column_id: createdTask.column_id,
      rank: createdTask.rank,
      title: createdTask.title,
    },
  })

  return createdTask
}

export async function updateTask({ ownerId, taskId, input }) {
  if (!ownerId || !taskId) {
    throw new Error('ownerId and taskId are required to edit a task.')
  }

  const taskInput = normalizeTaskInput(input)

  const { data: currentTask, error: currentError } = await supabase
    .from('tasks')
    .select('id, title, description, priority, due_date')
    .eq('owner_id', ownerId)
    .eq('id', taskId)
    .single()

  if (currentError) {
    throw currentError
  }

  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      title: taskInput.title,
      description: taskInput.description,
      priority: taskInput.priority,
      due_date: taskInput.due_date,
    })
    .eq('owner_id', ownerId)
    .eq('id', taskId)
    .select(
      'id, owner_id, project_id, client_id, service_type, column_id, title, description, priority, due_date, rank, status, created_at, updated_at',
    )
    .single()

  if (updateError) {
    throw updateError
  }

  await createTaskLog({
    ownerId,
    taskId: updatedTask.id,
    eventType: 'edit_task',
    oldValue: {
      title: currentTask.title,
      description: currentTask.description,
      priority: currentTask.priority,
      due_date: currentTask.due_date,
    },
    newValue: {
      title: updatedTask.title,
      description: updatedTask.description,
      priority: updatedTask.priority,
      due_date: updatedTask.due_date,
    },
  })

  return updatedTask
}

export async function rebalanceColumnRanks({ ownerId, columnId }) {
  if (!ownerId || !columnId) {
    throw new Error('ownerId and columnId are required to rebalance ranks.')
  }

  const tasks = await listColumnTasks({ ownerId, columnId })
  const targetRanks = generateSequentialRanks(tasks.length)

  for (let index = 0; index < tasks.length; index += 1) {
    if (tasks[index].rank === targetRanks[index]) {
      continue
    }

    const { error } = await supabase
      .from('tasks')
      .update({ rank: targetRanks[index] })
      .eq('owner_id', ownerId)
      .eq('id', tasks[index].id)

    if (error) {
      throw error
    }
  }
}

export async function moveTask({
  ownerId,
  taskId,
  toColumnId,
  beforeTaskId = null,
}) {
  if (!ownerId || !taskId || !toColumnId) {
    throw new Error('ownerId, taskId and toColumnId are required to move a task.')
  }

  if (beforeTaskId && beforeTaskId === taskId) {
    return null
  }

  const { data: movingTask, error: movingError } = await supabase
    .from('tasks')
    .select('id, column_id, rank')
    .eq('owner_id', ownerId)
    .eq('id', taskId)
    .single()

  if (movingError) {
    throw movingError
  }

  const computeTargetRank = async () => {
    const targetTasks = await listColumnTasks({ ownerId, columnId: toColumnId, excludeTaskId: taskId })

    let targetIndex = targetTasks.length
    if (beforeTaskId) {
      const foundIndex = targetTasks.findIndex((task) => task.id === beforeTaskId)
      if (foundIndex >= 0) {
        targetIndex = foundIndex
      }
    }

    const prevRank = targetIndex > 0 ? targetTasks[targetIndex - 1].rank : null
    const nextRank = targetIndex < targetTasks.length ? targetTasks[targetIndex].rank : null
    return getRankForPosition({ prevRank, nextRank })
  }

  let targetRank = await computeTargetRank()
  if (!targetRank) {
    await rebalanceColumnRanks({ ownerId, columnId: toColumnId })
    targetRank = await computeTargetRank()
  }

  if (!targetRank) {
    throw new Error('Could not generate rank for task movement.')
  }

  const { data: movedTask, error: moveError } = await supabase
    .from('tasks')
    .update({
      column_id: toColumnId,
      rank: targetRank,
    })
    .eq('owner_id', ownerId)
    .eq('id', taskId)
    .select(
      'id, owner_id, project_id, client_id, service_type, column_id, title, description, priority, due_date, rank, status, created_at, updated_at',
    )
    .single()

  if (moveError) {
    throw moveError
  }

  await createTaskLog({
    ownerId,
    taskId,
    eventType: 'move_task',
    oldValue: {
      column_id: movingTask.column_id,
      rank: movingTask.rank,
    },
    newValue: {
      column_id: movedTask.column_id,
      rank: movedTask.rank,
    },
  })

  return movedTask
}

export async function listProjectTaskLogs({ ownerId, projectId, limit = 50 }) {
  if (!ownerId || !projectId) {
    throw new Error('ownerId and projectId are required to list task logs.')
  }

  const { data, error } = await supabase
    .from('task_logs')
    .select('id, owner_id, task_id, event_type, old_value, new_value, created_at, tasks!inner(id, title, project_id)')
    .eq('owner_id', ownerId)
    .eq('tasks.project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []).map((log) => {
    const relatedTask = Array.isArray(log.tasks) ? log.tasks[0] : log.tasks
    return {
      ...log,
      task_title: relatedTask?.title ?? 'Task',
    }
  })
}
