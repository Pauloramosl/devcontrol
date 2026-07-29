import { supabase } from './supabase.js'

function normalizeText(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : null
}

function normalizeAppointmentInput(input) {
  const title = String(input?.title ?? '').trim()
  if (!title) {
    throw new Error('Appointment title is required.')
  }

  const date = String(input?.date ?? '').trim()
  if (!date) {
    throw new Error('Appointment date is required.')
  }

  return {
    title,
    date,
    time: normalizeText(input?.time),
    client_name: normalizeText(input?.client_name),
    description: normalizeText(input?.description),
    type: normalizeText(input?.type) ?? 'Reunião',
  }
}

export async function listAppointments({ ownerId }) {
  if (!ownerId) {
    throw new Error('ownerId is required to list appointments.')
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('id, owner_id, title, date, time, client_name, description, type, created_at, updated_at')
    .eq('owner_id', ownerId)
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createAppointment({ ownerId, input }) {
  if (!ownerId) {
    throw new Error('ownerId is required to create appointment.')
  }

  const payload = normalizeAppointmentInput(input)

  const { data, error } = await supabase
    .from('appointments')
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

export async function deleteAppointment({ ownerId, appointmentId }) {
  if (!ownerId || !appointmentId) {
    throw new Error('ownerId and appointmentId are required to delete appointment.')
  }

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('owner_id', ownerId)
    .eq('id', appointmentId)

  if (error) {
    throw error
  }
}
