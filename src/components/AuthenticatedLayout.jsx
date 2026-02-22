import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const navClassName = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`

function AuthenticatedLayout() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [isSigningOut, setIsSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setLogoutError('')

    const { error } = await signOut()

    if (error) {
      setLogoutError(error.message)
      setIsSigningOut(false)
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-slate-900">DevControl</h1>
            <nav className="flex flex-wrap gap-1">
              <NavLink to="/app" end className={navClassName}>
                Home
              </NavLink>
              <NavLink to="/app/clients" className={navClassName}>
                Clientes
              </NavLink>
              <NavLink to="/app/projects" className={navClassName}>
                Projetos
              </NavLink>
              <NavLink to="/app/tags" className={navClassName}>
                Tags
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-slate-600 md:block">
              {user?.email ?? 'Signed user'}
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      {logoutError ? (
        <div className="mx-auto mt-4 w-full max-w-5xl px-4">
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {logoutError}
          </p>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default AuthenticatedLayout
