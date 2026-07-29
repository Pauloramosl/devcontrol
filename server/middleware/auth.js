import { supabaseAuth } from '../lib/supabaseAdmin.js'

export async function requireSupabaseUser(req, res, next) {
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'missing_token',
        message: 'Authentication token is required.',
      },
    })
  }

  const { data, error } = await supabaseAuth.auth.getUser(token)

  if (error || !data?.user) {
    return res.status(401).json({
      error: {
        code: 'invalid_token',
        message: 'Invalid or expired session.',
      },
    })
  }

  req.accessToken = token
  req.user = data.user
  return next()
}
