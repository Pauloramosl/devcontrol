import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AppLoadingScreen from './AppLoadingScreen.jsx'
import { useEffect, useState } from 'react'

function ProtectedRoute() {
  const { session, loading } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  // Força o loader a aparecer por pelo menos 2.5 segundos para exibir a animação
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  if (loading || !minTimeElapsed) {
    return <AppLoadingScreen />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
