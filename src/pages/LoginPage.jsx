import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AppLoadingScreen from '../components/AppLoadingScreen.jsx'
import DottedSurface from '../components/DottedSurface.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Button } from '../components/ui/Button.jsx'
import AnimatedCardStack from '../components/AnimatedCardStack.jsx'

const LOGIN_FAILURE_MESSAGE =
  'Não foi possível entrar. Verifique suas credenciais e tente novamente.'

/* ── Ícone Google ─────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path d="M21.805 10.023h-9.63v3.96h5.523c-.337 2.004-2.066 3.96-5.523 3.96-3.312 0-6.009-2.744-6.009-6.132s2.697-6.131 6.01-6.131c1.887 0 3.145.803 3.867 1.49l2.632-2.567C17.012 3.057 14.862 2 12.175 2 6.78 2 2.407 6.373 2.407 11.81s4.373 9.81 9.768 9.81c5.639 0 9.373-3.96 9.373-9.529 0-.64-.07-1.126-.151-1.57l.408-.498Z" fill="#4285F4" />
      <path d="M2.95 7.24 6.2 9.624c.879-2.177 3.007-3.944 5.975-3.944 1.886 0 3.145.803 3.867 1.49l2.632-2.567C17.012 3.057 14.862 2 12.175 2 8.35 2 5.028 4.177 2.95 7.24Z" fill="#34A853" />
      <path d="M12.175 21.62c2.617 0 4.807-.863 6.408-2.345l-2.968-2.427c-.794.551-1.814.944-3.44.944-3.444 0-5.564-1.967-5.955-3.844l-3.274 2.524c2.055 4.146 5.982 5.149 9.23 5.149Z" fill="#FBBC05" />
      <path d="M2.95 16.473a9.79 9.79 0 0 1-.543-3.18c0-1.123.196-2.208.543-3.18V7.24L6.2 9.624a6.217 6.217 0 0 0-.347 2.669c0 .93.125 1.832.367 2.654l-3.27 2.526Z" fill="#EA4335" />
    </svg>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const { session, loading, error, signInWithGoogle, signInWithPassword } = useAuth()

  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [formError, setFormError]           = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading]   = useState(false)

  useEffect(() => {
    if (!loading && session) navigate('/app', { replace: true })
  }, [loading, session, navigate])

  const handleGoogleLogin = async () => {
    setFormError('')
    setIsGoogleLoading(true)
    const { error: signInError } = await signInWithGoogle()
    if (signInError) { setFormError(LOGIN_FAILURE_MESSAGE); setIsGoogleLoading(false) }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!email || !password) { setFormError('Informe email e senha para continuar.'); return }
    setIsEmailLoading(true)
    const { error: signInError } = await signInWithPassword({ email, password })
    if (signInError) { setFormError(LOGIN_FAILURE_MESSAGE); setIsEmailLoading(false); return }
    navigate('/app', { replace: true })
  }

  const authError = formError || (error ? LOGIN_FAILURE_MESSAGE : '')

  if (loading) {
    return <AppLoadingScreen />
  }

  return (
    <main className="relative isolate flex min-h-screen overflow-hidden bg-dn-bg-base text-dn-text-primary dn-ambient-container dn-ambient-blue">
      {/* ══ FUNDO ANIMADO — Dotted Wave ══════════════════════════ */}
      <DottedSurface />

      {/* ══ LADO ESQUERDO — Animated Stack ══════════════════════ */}
      <section className="relative hidden w-1/2 flex-col justify-center items-center overflow-hidden lg:flex z-10 px-2">
        <div className="w-full max-w-[800px] flex items-center justify-center">
          <AnimatedCardStack />
        </div>
      </section>

      {/* ══ LADO DIREITO — Auth Panel ══════════════════════════════ */}
      <section className="relative flex w-full flex-col items-center justify-center lg:w-1/2 z-10 p-4 lg:p-12">
        <div className="dn-glass w-full max-w-[420px] rounded-dn-xl p-8 shadow-2xl relative overflow-hidden">
          {/* Ambient interno para destaque leve */}
          <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-dn-accent/10 blur-[50px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

          <div className="relative z-10">
            <h2 className="text-dn-h2 mb-2 text-white">
              Entrar no DevControl
            </h2>
            <p className="text-dn-body text-dn-text-secondary mb-8">
              Acesse sua conta para continuar.
            </p>

            {/* Botão Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isEmailLoading}
              className="w-full flex items-center justify-center gap-3 h-[44px] bg-dn-bg-elevated border-[0.5px] border-dn-border rounded-dn-md hover:bg-dn-bg-hover hover:border-dn-border-hover transition-dn text-dn-mono disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleLoading
                ? <span className="h-5 w-5 animate-dn-spin rounded-full border-2 border-dn-text-muted border-t-white" />
                : <GoogleIcon />}
              {isGoogleLoading ? 'Autenticando...' : 'Continuar com Google'}
            </button>

            {/* Divisor */}
            <div className="my-6 flex items-center gap-4">
              <span className="h-[1px] flex-1 bg-dn-border" />
              <span className="text-dn-caption text-dn-text-muted uppercase tracking-[0.08em]">
                ou com email
              </span>
              <span className="h-[1px] flex-1 bg-dn-border" />
            </div>

            {/* Formulário */}
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <div>
                <label className="block text-dn-label text-dn-text-muted mb-2">
                  E-MAIL
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com"
                  disabled={isEmailLoading || isGoogleLoading}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="block text-dn-label text-dn-text-muted">
                    SENHA
                  </label>
                  <a href="#" className="text-dn-label text-dn-accent hover:text-white transition-dn">
                    Esqueceu a senha?
                  </a>
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isEmailLoading || isGoogleLoading}
                  required
                />
              </div>

              {authError && (
                <div className="bg-dn-danger-bg border-[0.5px] border-dn-danger/30 rounded-dn-md p-3 text-dn-body text-dn-danger mt-2">
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isEmailLoading || isGoogleLoading}
                className="w-full mt-6 h-[44px]"
              >
                {isEmailLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-dn-spin rounded-full border-2 border-white/30 border-t-white" />
                    ACESSANDO...
                  </span>
                ) : 'ACESSAR TERMINAL'}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-6 w-full text-center text-dn-caption text-dn-text-muted tracking-[0.1em] uppercase z-10">
          DevControl v4.0.R // Conexão_Segura_Ativa
        </div>
      </section>
    </main>
  )
}

export default LoginPage
