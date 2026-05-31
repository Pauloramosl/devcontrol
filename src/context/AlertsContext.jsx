import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAlertCounts } from '../lib/alerts.js'
import { useAuth } from './AuthContext.jsx'

const AlertsContext = createContext(undefined)

const EMPTY_COUNTS = {
  overdueInvoices: 0,
  overdueExpenses: 0,
  upcomingInvoices: 0,
  upcomingExpenses: 0,
  total: 0,
}

export function AlertsProvider({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  const [counts, setCounts] = useState(EMPTY_COUNTS)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCounts(EMPTY_COUNTS)
      return
    }

    setLoading(true)

    try {
      const data = await getAlertCounts({ ownerId: user.id })
      setCounts(data)
    } catch {
      setCounts(EMPTY_COUNTS)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!active) return
      await refresh()
    }

    load()

    return () => {
      active = false
    }
  }, [refresh, location.pathname])

  useEffect(() => {
    const handleFocus = () => {
      refresh()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      counts,
      refresh,
      loading,
    }),
    [counts, refresh, loading],
  )

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAlerts() {
  const context = useContext(AlertsContext)
  if (!context) {
    throw new Error('useAlerts must be used inside AlertsProvider.')
  }
  return context
}
