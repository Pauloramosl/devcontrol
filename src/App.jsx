import { Navigate, Route, Routes } from 'react-router-dom'
import AuthenticatedLayout from './components/AuthenticatedLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppHomePage from './pages/AppHomePage.jsx'
import AuthCallbackPage from './pages/AuthCallbackPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/app" element={<AppHomePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

export default App
