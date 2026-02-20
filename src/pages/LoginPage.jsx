import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function LoginPage() {
  const navigate = useNavigate()
  const { session, loading, error, signInWithGoogle, signInWithPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)

  useEffect(() => {
    if (!loading && session) {
      navigate('/app', { replace: true })
    }
  }, [loading, session, navigate])

  const handleGoogleLogin = async () => {
    setFormError('')
    setIsGoogleLoading(true)

    const { error: signInError } = await signInWithGoogle()

    if (signInError) {
      setFormError(signInError.message)
      setIsGoogleLoading(false)
    }
  }

  const handleEmailLogin = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!email || !password) {
      setFormError('Enter email and password to continue.')
      return
    }

    setIsEmailLoading(true)
    const { error: signInError } = await signInWithPassword({ email, password })

    if (signInError) {
      setFormError(signInError.message)
      setIsEmailLoading(false)
      return
    }

    navigate('/app', { replace: true })
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-sm text-slate-600">Checking existing session...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in to DevControl</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use Google OAuth to access the protected app area.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isEmailLoading}
          className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isGoogleLoading ? 'Redirecting to Google...' : 'Entrar com Google'}
        </button>

        <div className="my-6 h-px bg-slate-200" />

        <form className="space-y-3" onSubmit={handleEmailLogin}>
          <label className="block text-sm text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="********"
            />
          </label>

          <button
            type="submit"
            disabled={isEmailLoading || isGoogleLoading}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isEmailLoading ? 'Signing in...' : 'Login with email/password'}
          </button>
        </form>

        {/* TODO: Add forgot password and sign-up screens in a future phase. */}
        {formError || error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError || error}
          </p>
        ) : null}
      </section>
    </main>
  )
}

export default LoginPage
