import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const LOGIN_FAILURE_MESSAGE =
  'Não foi possível entrar. Verifique suas credenciais e tente novamente.'

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M21.805 10.023h-9.63v3.96h5.523c-.337 2.004-2.066 3.96-5.523 3.96-3.312 0-6.009-2.744-6.009-6.132s2.697-6.131 6.01-6.131c1.887 0 3.145.803 3.867 1.49l2.632-2.567C17.012 3.057 14.862 2 12.175 2 6.78 2 2.407 6.373 2.407 11.81s4.373 9.81 9.768 9.81c5.639 0 9.373-3.96 9.373-9.529 0-.64-.07-1.126-.151-1.57l.408-.498Z"
        fill="#4285F4"
      />
      <path
        d="M2.95 7.24 6.2 9.624c.879-2.177 3.007-3.944 5.975-3.944 1.886 0 3.145.803 3.867 1.49l2.632-2.567C17.012 3.057 14.862 2 12.175 2 8.35 2 5.028 4.177 2.95 7.24Z"
        fill="#34A853"
      />
      <path
        d="M12.175 21.62c2.617 0 4.807-.863 6.408-2.345l-2.968-2.427c-.794.551-1.814.944-3.44.944-3.444 0-5.564-1.967-5.955-3.844l-3.274 2.524c2.055 4.146 5.982 5.149 9.23 5.149Z"
        fill="#FBBC05"
      />
      <path
        d="M2.95 16.473a9.79 9.79 0 0 1-.543-3.18c0-1.123.196-2.208.543-3.18V7.24L6.2 9.624a6.217 6.217 0 0 0-.347 2.669c0 .93.125 1.832.367 2.654l-3.27 2.526Z"
        fill="#EA4335"
      />
    </svg>
  )
}

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
      setFormError(LOGIN_FAILURE_MESSAGE)
      setIsGoogleLoading(false)
    }
  }

  const handleEmailLogin = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!email || !password) {
      setFormError('Informe email e senha para continuar.')
      return
    }

    setIsEmailLoading(true)
    const { error: signInError } = await signInWithPassword({ email, password })

    if (signInError) {
      setFormError(LOGIN_FAILURE_MESSAGE)
      setIsEmailLoading(false)
      return
    }

    navigate('/app', { replace: true })
  }

  const authError = formError || (error ? LOGIN_FAILURE_MESSAGE : '')

  if (loading) {
    return (
      <main className="login-shell flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-[rgba(11,18,32,0.84)] p-6 text-center shadow-[0_24px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl">
          <span className="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-blue-200/30 border-t-blue-400" />
          <p className="text-sm text-slate-200">Verificando sessão...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:px-8 lg:py-6">
        <section className="order-2 lg:order-1">
          <div className="relative min-h-[280px] overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#05070D] via-[#09111F] to-[#0F172A] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.75)] sm:min-h-[320px] sm:p-8 lg:min-h-[calc(100vh-3rem)] lg:p-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="login-flow-line absolute left-[-12%] top-[22%] h-px w-[140%] bg-gradient-to-r from-transparent via-blue-300/30 to-transparent" />
              <div
                className="login-flow-line absolute left-[-18%] top-[44%] h-px w-[145%] rotate-[7deg] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"
                style={{ animationDelay: '-4s' }}
              />
              <div
                className="login-flow-line absolute left-[-15%] top-[66%] h-px w-[130%] -rotate-[8deg] bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent"
                style={{ animationDelay: '-8s' }}
              />
              <div className="login-glow-pulse absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.25)_0%,rgba(34,211,238,0.08)_36%,rgba(0,0,0,0)_72%)]" />
              <div
                className="login-glow-pulse absolute -bottom-20 right-[-22%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18)_0%,rgba(15,23,42,0.05)_52%,rgba(0,0,0,0)_78%)]"
                style={{ animationDelay: '-2s' }}
              />
            </div>

            <div className="login-fade-delayed relative z-10 max-w-2xl">
              <span className="inline-flex items-center rounded-full border border-blue-200/20 bg-blue-500/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-blue-100">
                DEVCONTROL
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
                O centro de comando do seu negócio digital.
              </h1>
              <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
                Gerencie operações, acompanhe entregas e tenha visão financeira em uma única
                plataforma.
              </p>
            </div>

            <div className="login-core-float relative z-10 mt-8 hidden rounded-3xl border border-blue-200/15 bg-[rgba(15,23,42,0.68)] p-6 backdrop-blur-sm md:block lg:mt-14">
              <div className="relative h-44 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220]/85">
                <div className="absolute left-6 top-10 h-px w-[70%] rotate-6 bg-gradient-to-r from-blue-400/0 via-blue-300/50 to-cyan-300/0" />
                <div className="absolute left-8 top-24 h-px w-[64%] -rotate-6 bg-gradient-to-r from-cyan-300/0 via-cyan-300/45 to-blue-300/0" />
                <div className="absolute right-8 top-14 h-3 w-3 rounded-full bg-cyan-300/70 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
                <div className="absolute left-14 top-20 h-3 w-3 rounded-full bg-blue-400/70 shadow-[0_0_18px_rgba(96,165,250,0.5)]" />
                <div className="absolute bottom-7 right-16 h-3 w-3 rounded-full bg-blue-300/70 shadow-[0_0_18px_rgba(147,197,253,0.55)]" />
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 flex items-center justify-center lg:order-2">
          <div className="login-panel-enter w-full max-w-md rounded-2xl border border-[rgba(96,165,250,0.24)] bg-[rgba(11,18,32,0.84)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-200/80">
              Central de Acesso
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
              Acesse sua central de controle
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Entre para gerenciar clientes, projetos, finanças e execução em um só lugar.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isEmailLoading}
              className="login-button-lift mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-100 transition-all duration-200 hover:border-blue-400/30 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <GoogleIcon />
              )}
              {isGoogleLoading ? 'Redirecionando para Google...' : 'Entrar com Google'}
            </button>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-400">ou continue com email</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <label className="block text-sm font-medium text-slate-200" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="voce@empresa.com"
                disabled={isEmailLoading || isGoogleLoading}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 transition-all duration-200 hover:border-white/20 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <label className="block text-sm font-medium text-slate-200" htmlFor="login-password">
                Senha
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="********"
                disabled={isEmailLoading || isGoogleLoading}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 transition-all duration-200 hover:border-white/20 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={isEmailLoading || isGoogleLoading}
                className="login-button-lift mt-1 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:from-blue-500 hover:to-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEmailLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            {/* TODO: Adicionar recuperação de senha e cadastro em fase futura. */}
            {authError ? (
              <p
                className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                role="alert"
              >
                {authError}
              </p>
            ) : null}

            <p className="mt-5 text-xs text-slate-400">
              Seu acesso é protegido por autenticação segura.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
