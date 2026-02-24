import { supabase } from './supabase.js'

export async function loadGlobalKanbanData({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to load global kanban data.')
  }

  const [projectsResult, clientsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, owner_id, client_id, service_type, status, due_date, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name')
      .eq('owner_id', ownerId)
      .order('name', { ascending: true }),
  ])

  if (projectsResult.error) {
    throw projectsResult.error
  }

  if (clientsResult.error) {
    throw clientsResult.error
  }

  const projects = projectsResult.data ?? []
  const clients = clientsResult.data ?? []
  const projectIds = projects.map((project) => project.id)

  if (!projectIds.length) {
    return {
      projects,
      clients,
      columns: [],
      tasks: [],
    }
  }

  const [columnsResult, tasksResult] = await Promise.all([
    supabase
      .from('project_columns')
      .select('id, owner_id, project_id, name, column_order')
      .eq('owner_id', ownerId)
      .in('project_id', projectIds)
      .order('project_id', { ascending: true })
      .order('column_order', { ascending: true }),
    supabase
      .from('tasks')
      .select(
        'id, owner_id, project_id, client_id, service_type, column_id, title, description, priority, due_date, rank, status, created_at, updated_at',
      )
      .eq('owner_id', ownerId)
      .in('project_id', projectIds),
  ])

  if (columnsResult.error) {
    throw columnsResult.error
  }

  if (tasksResult.error) {
    throw tasksResult.error
  }

  return {
    projects,
    clients,
    columns: columnsResult.data ?? [],
    tasks: tasksResult.data ?? [],
  }
}
