import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';


/* ── Mapa de rotas → nome da seção ── */
const SECTION_MAP = [
  { path: '/app/finance',    label: 'Financeiro' },
  { path: '/app/clients',    label: 'Clientes' },
  { path: '/app/projects',   label: 'Projetos' },
  { path: '/app/kanban',     label: 'Kanban' },
  { path: '/app/alerts',     label: 'Alertas' },
  { path: '/app/tags',       label: 'Tags' },
  { path: '/app/pipelines',  label: 'Pipelines' },
  { path: '/app/settings',   label: 'Configurações' },
  { path: '/app',            label: 'Dashboard' },
];

function getSectionLabel(pathname) {
  const match = SECTION_MAP.find(s => pathname.startsWith(s.path));
  return match ? match.label : 'DevControl';
}

function Header() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Extrair informações do usuário
  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName = user?.user_metadata?.full_name;
  const email = user?.email || 'User';
  
  let initials = 'U';
  if (fullName) {
    const parts = fullName.split(' ');
    initials = parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : fullName.substring(0, 2).toUpperCase();
  } else {
    initials = email.substring(0, 2).toUpperCase();
  }

  const sectionLabel = getSectionLabel(location.pathname);

  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] px-6 z-50 flex items-center justify-between border-b-[0.5px] border-dn-border bg-[#0a1220f2] backdrop-blur-[8px]">
      <div className="flex items-center gap-4">
        {/* Placeholder para a logo/sidebar */}
        <div className="w-[56px] shrink-0" />
        <h1 className="text-[15px] font-bold text-dn-text-primary tracking-[-0.02em]">{sectionLabel.toUpperCase()}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* ── Search com efeito glow animado ── */}
        <div id="poda" className="relative flex items-center justify-center group hidden md:flex">
          {/* Camada 1: Glow externo principal */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[44px] max-w-[244px] rounded-dn-md blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[999px] before:h-[999px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg]
                          before:bg-[conic-gradient(#000,#1A6FFF_5%,#000_38%,#000_50%,#8B5CF6_60%,#000_87%)] before:transition-all before:duration-2000
                          group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]">
          </div>
          {/* Camada 2–4: Glow secundário */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[42px] max-w-[242px] rounded-dn-md blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0),#0c1a5a,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#4c1d6e,rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
                          group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
          </div>
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[42px] max-w-[242px] rounded-dn-md blur-[3px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0),#0c1a5a,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#4c1d6e,rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
                          group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
          </div>
          {/* Camada 5: Brilho fino */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[40px] max-w-[240px] rounded-dn-md blur-[2px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
                          before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#7aa3d8,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#b3a2da,rgba(0,0,0,0)_58%)] before:brightness-[1.4]
                          before:transition-all before:duration-2000 group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]">
          </div>
          {/* Camada 6: Borda interna sólida */}
          <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[38px] max-w-[238px] rounded-dn-md blur-[0.5px]
                          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg]
                          before:bg-[conic-gradient(#0a1220,#1A6FFF_5%,#0a1220_14%,#0a1220_50%,#8B5CF6_60%,#0a1220_64%)] before:brightness-[1.3]
                          before:transition-all before:duration-2000 group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]">
          </div>

          {/* Input principal */}
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 z-[2]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle stroke="url(#searchGrad)" r="8" cy="11" cx="11"></circle>
                <line stroke="url(#searchGradL)" y2="16.65" y1="22" x2="16.65" x1="22"></line>
                <defs>
                  <linearGradient gradientTransform="rotate(50)" id="searchGrad">
                    <stop stopColor="#3ABFFF" offset="0%"></stop>
                    <stop stopColor="#4A5F7A" offset="100%"></stop>
                  </linearGradient>
                  <linearGradient id="searchGradL">
                    <stop stopColor="#4A5F7A" offset="0%"></stop>
                    <stop stopColor="#2a3a50" offset="100%"></stop>
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-dn-bg-primary border-none w-[240px] h-[36px] rounded-dn-md text-dn-text-primary text-dn-mono pl-9 pr-3 focus:outline-none placeholder:text-dn-text-muted"
            />
            {/* Glow accent sutil ao lado do ícone */}
            <div className="pointer-events-none absolute w-[20px] h-[14px] bg-[#1A6FFF] top-[8px] left-[4px] blur-xl opacity-60 transition-all duration-2000 group-hover:opacity-0"></div>
          </div>
        </div>

        <button className="relative w-9 h-9 rounded-dn-md text-dn-text-muted flex items-center justify-center hover:bg-dn-bg-hover transition-dn" title="Notificações">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-dn-danger"></span>
        </button>

        <Link to="/app/settings" className="block relative group">
          {avatarUrl ? (
            <div className="w-8 h-8 rounded-full bg-dn-bg-elevated overflow-hidden border-[0.5px] border-dn-border group-hover:border-dn-accent transition-all">
              <img src={avatarUrl} alt={fullName || 'User'} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-dn-accent/20 flex items-center justify-center text-[13px] font-medium text-dn-accent border-[0.5px] border-transparent group-hover:border-dn-accent transition-all">
              {initials}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}

export default Header;
