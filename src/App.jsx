import { Navigate, Route, Routes } from 'react-router-dom'
import AuthenticatedLayout from './components/AuthenticatedLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppHomePage from './pages/AppHomePage.jsx'
import AuthCallbackPage from './pages/AuthCallbackPage.jsx'
import ClientDetailPage from './pages/ClientDetailPage.jsx'
import ClientFormPage from './pages/ClientFormPage.jsx'
import ClientsListPage from './pages/ClientsListPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProjectDetailPage from './pages/ProjectDetailPage.jsx'
import ProjectFormPage from './pages/ProjectFormPage.jsx'
import GlobalKanbanPage from './pages/GlobalKanbanPage.jsx'
import ProjectKanbanPage from './pages/ProjectKanbanPage.jsx'
import ProjectsListPage from './pages/ProjectsListPage.jsx'
import TagsPage from './pages/TagsPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/app" element={<AppHomePage />} />
          <Route path="/app/clients" element={<ClientsListPage />} />
          <Route path="/app/clients/new" element={<ClientFormPage mode="create" />} />
          <Route path="/app/clients/:id" element={<ClientDetailPage />} />
          <Route path="/app/clients/:id/edit" element={<ClientFormPage mode="edit" />} />
          <Route path="/app/tags" element={<TagsPage />} />
          <Route path="/app/projects" element={<ProjectsListPage />} />
          <Route path="/app/projects/new" element={<ProjectFormPage mode="create" />} />
          <Route path="/app/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/app/projects/:id/edit" element={<ProjectFormPage mode="edit" />} />
          <Route path="/app/projects/:id/kanban" element={<ProjectKanbanPage />} />
          <Route path="/app/kanban" element={<GlobalKanbanPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

export default App
