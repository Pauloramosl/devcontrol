import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import DevControlLogo from './DevControlLogo.jsx'

const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-5 w-5 shrink-0">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const IconFinance = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const IconClients = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconProjects = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
)

const IconKanban = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 .91 1.51H15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09A1.65 1.65 0 0 0 20.91 10H21a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z" />
  </svg>
)

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)

const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.224-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.889-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.895 6.994c-.003 5.45-4.437 9.884-9.889 9.884M20.464 3.488A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.946L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
)

const IconLogOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const navItems = [
  { to: '/app', label: 'Dashboard', icon: <IconHome />, end: true },
  { to: '/app/calendar', label: 'Calendário', icon: <IconCalendar /> },
  { to: '/app/finance', label: 'Financeiro', icon: <IconFinance /> },
  { to: '/app/clients', label: 'Clientes', icon: <IconClients /> },
  { to: '/app/projects', label: 'Projetos', icon: <IconProjects /> },
  { to: '/app/kanban', label: 'Kanban', icon: <IconKanban /> },
  { to: '/app/whatsapp', label: 'WhatsApp', icon: <IconWhatsApp /> },
  { to: '/app/alerts', label: 'Alertas', icon: <IconBell /> },
]

function getUserInitials({ fullName, email }) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : fullName.substring(0, 2).toUpperCase()
  }

  return String(email || 'U').substring(0, 2).toUpperCase()
}

function SidebarItem({ to, icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      aria-label={label}
      className={({ isActive }) => `
        relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200
        ${isActive
          ? 'border-none bg-dn-accent text-white shadow-[0_0_18px_rgba(58,191,255,0.45)]'
          : 'border-white/[0.03] bg-[#1e2d44]/35 text-dn-text-secondary hover:border-white/[0.12] hover:bg-[#253754]/85 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
        }
      `}
    >
      {icon}
    </NavLink>
  )
}

function Sidebar() {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()

  const avatarUrl = user?.user_metadata?.avatar_url
  const fullName = user?.user_metadata?.full_name
  const email = user?.email || 'User'
  const initials = getUserInitials({ fullName, email })

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed left-3 top-3 bottom-3 z-[70] flex w-[76px] flex-col items-center justify-between py-6 px-2.5 pointer-events-none">
      {/* Logo Separado no Topo */}
      <div className="flex flex-col items-center shrink-0 pointer-events-auto">
        <Link
          to="/app"
          title="DevControl"
          aria-label="DevControl"
          className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <DevControlLogo className="h-8 w-14" imageClassName="drop-shadow-[0_0_12px_rgba(58,191,255,0.35)]" />
        </Link>
      </div>

      {/* Cápsula de Opções do Meio com Vidro Líquido */}
      <nav className="flex flex-col items-center gap-2.5 rounded-[28px] dn-glass p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] pointer-events-auto">
        {navItems.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Cápsula de Controle da Base com Vidro Líquido */}
      <div className="flex shrink-0 flex-col items-center gap-2.5 rounded-[28px] dn-glass p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] pointer-events-auto">
        <SidebarItem to="/app/settings" label="Configurações" icon={<IconSettings />} />

        <button
          type="button"
          title="Sair da conta"
          aria-label="Sair da conta"
          onClick={handleSignOut}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.03] bg-[#1e2d44]/35 text-dn-text-secondary transition-all duration-200 hover:border-dn-danger/30 hover:bg-dn-danger-bg hover:text-dn-danger shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
        >
          <IconLogOut />
        </button>

        <Link to="/app/settings" title={fullName || email} aria-label="Perfil" className="block">
          {avatarUrl ? (
            <span className="block h-10 w-10 overflow-hidden rounded-full border border-dn-accent/30 bg-dn-bg-elevated transition-all duration-200 hover:border-dn-accent hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(58,191,255,0.15)]">
              <img src={avatarUrl} alt={fullName || email} className="h-full w-full object-cover" />
            </span>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dn-accent/30 bg-dn-accent/15 text-[12px] font-bold text-dn-accent transition-all duration-200 hover:border-dn-accent hover:scale-105 active:scale-95">
              {initials}
            </span>
          )}
        </Link>
      </div>
    </aside>
  )
}

export default Sidebar
