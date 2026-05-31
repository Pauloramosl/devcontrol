import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/* ── ÍCONES SVG EXTRAS ─────────────────────────────────────────────── */
const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-5 w-5 shrink-0">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconFinance = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconClients = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconProjects = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
);

const IconKanban = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconLogOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
)

const SidebarItem = ({ to, icon, label, end = false, dotColor }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `
        group/item relative flex h-9 items-center rounded-dn-md transition-dn w-[36px] overflow-hidden mx-auto
        group-hover:w-[calc(100%-20px)] group-hover:mx-2.5
        ${isActive
          ? 'bg-dn-accent-20 text-dn-accent border-[0.5px] border-dn-accent/30'
          : 'text-dn-text-muted hover:bg-dn-bg-hover hover:text-dn-text-secondary border-[0.5px] border-transparent'
        }
      `}
    >
      <div className="w-[36px] flex shrink-0 items-center justify-center h-full">
        {icon}
      </div>
      <span className="text-[13px] font-medium text-dn-text-primary ml-2 whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {label}
      </span>
      {dotColor && (
        <span className={`absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${dotColor}`}></span>
      )}
    </NavLink>
  );
};

function Sidebar() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) navigate('/login', { replace: true });
  };

  return (
    <aside className="group fixed top-0 left-0 bottom-0 z-[60] flex flex-col w-[56px] hover:w-[220px] bg-[#060a14fa] border-r-[0.5px] border-dn-border transition-[width] duration-250 ease-in-out overflow-hidden">
      
      {/* Spacer to clear header space if needed, though in v2 sidebar is top to bottom, header goes right of sidebar */}
      <div className="h-[56px] flex items-center shrink-0 border-b-[0.5px] border-dn-border px-4">
        {/* Logo Icon when collapsed, Logo Text when expanded */}
        <div className="w-6 h-6 flex items-center justify-center font-bold text-[14px] text-dn-accent shrink-0 tracking-tighter">
          [DC]
        </div>
        <span className="text-[15px] font-bold text-dn-text-primary tracking-tight ml-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap">
          DEVCONTROL
        </span>
      </div>

      <nav className="flex flex-col gap-1 py-4 flex-1">
        <SidebarItem to="/app" end icon={<IconHome />} label="Dashboard" />
        <SidebarItem to="/app/finance" icon={<IconFinance />} label="Financeiro" dotColor="bg-dn-accent-strong" />
        <SidebarItem to="/app/clients" icon={<IconClients />} label="Clientes" />
        <SidebarItem to="/app/projects" icon={<IconProjects />} label="Projetos" dotColor="bg-dn-success" />
        <SidebarItem to="/app/kanban" icon={<IconKanban />} label="Kanban" />
        
        <div className="border-t-[0.5px] border-dn-accent/10 my-2 mx-2" />
        
        <SidebarItem to="/app/alerts" icon={<IconSettings />} label="Alertas" dotColor="bg-dn-warning" />
      </nav>

      <div className="border-t-[0.5px] border-dn-accent/10 my-2 mx-2" />

      <div className="pb-4">
        <button 
          onClick={handleSignOut}
          className="group/item relative flex h-9 items-center rounded-dn-md transition-dn w-[36px] overflow-hidden mx-auto group-hover:w-[calc(100%-20px)] group-hover:mx-2.5 text-dn-text-muted hover:bg-dn-danger-bg hover:text-dn-danger border-[0.5px] border-transparent"
        >
          <div className="w-[36px] flex shrink-0 items-center justify-center h-full">
            <IconLogOut />
          </div>
          <span className="text-[13px] font-medium ml-2 whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Sair da Conta
          </span>
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;
