import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { getLogger } from './logger'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getUserRole(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'superadmin')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return (data as { role: string }).role ?? null
}

export async function requireSuperadminAuth(event: H3Event) {
  const log = getLogger(event)
  const supabase = await serverSupabaseClient(event)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    log.warn('Unauthorized access attempt - no user', {
      error: userError?.message,
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  const role = await getUserRole(supabase, user.id)

  if (role !== 'superadmin') {
    log.warn('Unauthorized access attempt - insufficient role', {
      userId: user.id,
      email: user.email,
      role: role ?? 'none',
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Superadmin role required',
    })
  }

  log.info('Superadmin authenticated', {
    userId: user.id,
    email: user.email,
  })

  return {
    user,
    supabase,
  }
}

export async function getSuperadminUser(event: H3Event) {
  const supabase = await serverSupabaseClient(event)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const role = await getUserRole(supabase, user.id)

  if (role !== 'superadmin') {
    return null
  }

  return user
}
