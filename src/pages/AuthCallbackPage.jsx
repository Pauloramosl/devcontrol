import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const completeSignIn = async () => {
      const query = new URLSearchParams(window.location.search)
      const oauthError = query.get('error_description') || query.get('error')
      const code = query.get('code')

      if (oauthError && mounted) {
        setError(oauthError)
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        )

        if (exchangeError && mounted) {
          setError(exchangeError.message)
          return
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession()

      if (!mounted) return

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      navigate(data.session ? '/app' : '/login', { replace: true })
    }

    completeSignIn()

    return () => {
      mounted = false
    }
  }, [navigate])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Finalizing login...</h1>
        <p className="mt-2 text-sm text-slate-600">
          Waiting for Supabase session confirmation.
        </p>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error}</p>
            <Link to="/login" className="mt-2 inline-block font-medium text-red-700 underline">
              Back to login
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default AuthCallbackPage
