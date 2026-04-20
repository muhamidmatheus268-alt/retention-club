import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ClientProvider, useClient } from '../contexts/ClientContext'
import NotificationBell from '../components/NotificationBell'

function BrainIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="4" stroke={color} strokeWidth="1.4"/><path d="M5.5 7c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5M8 3V2M8 12v2M5 10.5l-1.5 1M11 10.5l1.5 1" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></svg> }
function ChatIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 4.5A2.5 2.5 0 015.5 2h5A2.5 2.5 0 0113 4.5v3A2.5 2.5 0 0110.5 10H7l-3 2.5V10A1 1 0 013 9V4.5z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/><circle cx="6" cy="6" r=".7" fill={color}/><circle cx="8" cy="6" r=".7" fill={color}/><circle cx="10" cy="6" r=".7" fill={color}/></svg> }

const MODULES = [
  { key: 'calendar',       label: 'Calendário',        path: 'calendar',       Icon: CalIcon },
  { key: 'chat',           label: 'Chat IA',           path: 'chat',           Icon: ChatIcon },
  { key: 'cerebro',        label: 'Cérebro IA',        path: 'cerebro',        Icon: BrainIcon },
  { key: 'diagnostico',    label: 'Diagnóstico',       path: 'diagnostico',    Icon: DiagIcon },
  { key: 'automacoes',     label: 'Automações',        path: 'automacoes',     Icon: AutoIcon },
  { key: 'relatorios',     label: 'Relatórios',        path: 'relatorios',     Icon: RelIcon },
  { key: 'projecao',       label: 'Projeção',          path: 'projecao',       Icon: ProjIcon },
  { key: 'base',           label: 'Controle de Base',  path: 'base',           Icon: BaseIcon },
  { key: 'acompanhamento', label: 'Acompanhamento',    path: 'acompanhamento', Icon: AcompIcon },
  { key: 'contas',         label: 'Central de Contas', path: 'contas',         Icon: ContasIcon },
  { key: 'pesquisas',      label: 'Pesquisas',         path: 'pesquisas',      Icon: PesqIcon },
  { key: 'imagens',        label: 'Banco de Imagens',  path: 'imagens',        Icon: ImgIcon },
  { key: 'ata',            label: 'ATAs',              path: 'ata',            Icon: AtaIcon },
]

export default function AppLayout({ children, module: activeModule, fullHeight = false }) {
  return (
    <ClientProvider>
      <AppShell activeModule={activeModule} fullHeight={fullHeight}>
        {children}
      </AppShell>
    </ClientProvider>
  )
}

function AppShell({ children, activeModule, fullHeight }) {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const location  = useLocation()
  const { signOut } = useAuth()
  const { client, brandColor } = useClient()
  const [clients, setClients]  = useState([])
  const [dropOpen, setDropOpen] = useState(false)
  const [badges, setBadges]    = useState({}) // { [moduleKey]: number }

  useEffect(() => {
    supabase.from('clients').select('id,name,slug,brand_color').order('name')
      .then(({ data }) => setClients(data || []))
  }, [])

  /* Fetch per-module counts once we have the active client */
  useEffect(() => {
    if (!client?.id) return
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      supabase.from('acompanhamento').select('id', { count: 'exact', head: true })
        .eq('client_id', client.id).eq('status', 'pendente'),
      supabase.from('calendar_entries').select('id', { count: 'exact', head: true })
        .eq('client_id', client.id).eq('status', 'pendente').gte('date', today),
      supabase.from('atas').select('id', { count: 'exact', head: true })
        .eq('client_id', client.id),
      supabase.from('automacoes').select('id', { count: 'exact', head: true })
        .eq('client_id', client.id).in('status_automacao', ['planejada','em_construcao']),
    ]).then(([a, c, at, au]) => {
      setBadges({
        acompanhamento: a.count || 0,
        calendar:       c.count || 0,
        ata:            at.count || 0,
        automacoes:     au.count || 0,
      })
    }).catch(() => {})
  }, [client?.id, activeModule])

  function switchClient(c) {
    setDropOpen(false)
    navigate(`/admin/${activeModule || 'calendar'}/${c.slug}`)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0c0c10', color: '#fff' }}>

      {/* ─── Sidebar ─── */}
      <aside className="flex flex-col shrink-0 border-r" style={{ width: 220, backgroundColor: '#111118', borderColor: '#1e1e2a' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-12 border-b shrink-0" style={{ borderColor: '#1e1e2a' }}>
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white shrink-0"
            style={{ backgroundColor: brandColor }}>R</span>
          <span className="font-bold text-sm text-white tracking-tight">Retention Club</span>
        </div>

        {/* Client switcher */}
        <div className="px-3 py-2.5 border-b relative shrink-0" style={{ borderColor: '#1e1e2a' }}>
          <button onClick={() => setDropOpen(o => !o)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors"
            style={{ backgroundColor: dropOpen ? '#ffffff0a' : 'transparent' }}
            onMouseEnter={e => { if (!dropOpen) e.currentTarget.style.backgroundColor = '#ffffff08' }}
            onMouseLeave={e => { if (!dropOpen) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            {client
              ? <><span className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: client.brand_color || '#E8642A' }} />
                  <span className="text-sm font-medium text-white truncate flex-1">{client.name}</span></>
              : <span className="text-sm text-[#555568] flex-1">Selecionar cliente</span>
            }
            <ChevronIcon open={dropOpen} />
          </button>

          {dropOpen && (
            <div className="drop-enter absolute left-3 right-3 top-full mt-1 rounded-xl border py-1.5 z-50 shadow-2xl"
              style={{ backgroundColor: '#17171f', borderColor: '#2a2a38' }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#444455] px-3 mb-1.5">Carteira</p>
              <div className="max-h-48 overflow-y-auto">
                {clients.map(c => (
                  <button key={c.id} onClick={() => switchClient(c)}
                    className="w-full flex items-center gap-2 px-3 py-2 transition-colors text-left"
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffffff08' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}
                  >
                    <span className="w-3.5 h-3.5 rounded shrink-0" style={{ backgroundColor: c.brand_color || '#E8642A' }} />
                    <span className={`text-xs truncate flex-1 ${client?.id === c.id ? 'text-white font-semibold' : 'text-[#8b8ba0]'}`}>{c.name}</span>
                    {client?.id === c.id && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: brandColor }} />}
                  </button>
                ))}
              </div>
              <div className="border-t mt-1 pt-1" style={{ borderColor: '#2a2a38' }}>
                <Link to="/admin" onClick={() => setDropOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#555568] hover:text-white transition-colors">
                  <span className="text-base leading-none">+</span> Novo cliente
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Module nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {client ? (
            <>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#33333f] px-3 mb-2 truncate">
                {client.name}
              </p>
              {MODULES.map(({ key, label, path, Icon }) => {
                const isActive = activeModule === key
                const badge = badges[key] || 0
                return (
                  <button key={key}
                    onClick={() => navigate(`/admin/${path}/${slug}`)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all mb-0.5 group"
                    style={isActive ? { backgroundColor: brandColor + '18' } : {}}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#ffffff07' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = '' }}
                  >
                    <Icon size={14} color={isActive ? brandColor : '#555568'} />
                    <span className={`text-sm font-medium flex-1 ${isActive ? 'text-white' : 'text-[#6b6b80] group-hover:text-[#9999b0]'}`}>
                      {label}
                    </span>
                    {badge > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: isActive ? brandColor + '35' : '#2a2a38',
                          color: isActive ? '#fff' : '#9ca3af',
                          minWidth: 18, textAlign: 'center',
                        }}>
                        {badge}
                      </span>
                    )}
                    {isActive && <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: brandColor }} />}
                  </button>
                )
              })}
            </>
          ) : (
            <p className="text-xs text-[#333340] px-3 mt-2">Selecione um cliente</p>
          )}
        </nav>

        {/* Bottom */}
        <div className="border-t px-2 py-2.5 shrink-0" style={{ borderColor: '#1e1e2a' }}>
          <NavBottom icon={<GridIcon size={14} color="#555568" />} label="Painel geral" onClick={() => navigate('/admin')} />
          <NavBottom icon={<ExecIcon size={14} color="#555568" />} label="Dashboard executivo" onClick={() => navigate('/admin/executivo')} />
          <NavBottom icon={<FunnelIcon size={14} color="#555568" />} label="Funil CRM" onClick={() => navigate('/admin/quiz-respostas')} />
          <NavBottom icon={<LogoutIcon size={14} color="#555568" />} label="Sair" onClick={async () => { await signOut(); navigate('/login') }} />
          <div className="flex items-center justify-between px-3 pt-2 mt-1 border-t" style={{ borderColor: '#1a1a26' }}>
            <span className="text-[10px]" style={{ color: '#33333f' }}>Atalhos</span>
            <div className="flex items-center gap-1">
              <kbd className="text-[9px] font-mono px-1 py-0.5 rounded border" style={{ borderColor: '#2a2a38', color: '#555568' }}>⌘K</kbd>
              <kbd className="text-[9px] font-mono px-1 py-0.5 rounded border" style={{ borderColor: '#2a2a38', color: '#555568' }}>?</kbd>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className={`flex-1 flex flex-col min-w-0 ${fullHeight ? 'overflow-hidden' : 'overflow-auto'}`}>

        {/* Topbar */}
        <header className="flex items-center justify-between px-6 h-12 border-b shrink-0"
          style={{ backgroundColor: '#111118', borderColor: '#1e1e2a' }}>
          <div className="flex items-center gap-1.5 text-sm">
            <Link to="/admin" className="text-[#444455] hover:text-[#777788] transition-colors text-xs">Clientes</Link>
            {client && <>
              <span className="text-[#222230] text-xs">/</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: client.brand_color || '#E8642A' }} />
                <span className="text-[#777788] text-xs font-medium">{client.name}</span>
              </div>
              {activeModule && <>
                <span className="text-[#222230] text-xs">/</span>
                <span className="text-white text-xs font-semibold">
                  {MODULES.find(m => m.key === activeModule)?.label}
                </span>
              </>}
            </>}
          </div>
          {client && (
            <a href={`/calendar/${client.slug}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all"
              style={{ borderColor: '#2a2a38', color: '#555568' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555568'; e.currentTarget.style.borderColor = '#2a2a38' }}>
              <ExternalIcon size={11} /> Visão do cliente
            </a>
          )}
        </header>

        {/* Content */}
        <div className={`flex-1 ${fullHeight ? 'overflow-hidden' : 'overflow-auto'}`}
          style={{ backgroundColor: '#0c0c10' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function NavBottom({ icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-[#555568] hover:text-[#8b8ba0] mb-0.5"
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffffff07' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}>
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function ChevronIcon({ open }) {
  return <svg className={`w-3 h-3 text-[#555568] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function CalIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke={color} strokeWidth="1.5"/><path d="M5 2v2M11 2v2M2 7h12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function DiagIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M2 12l3-4 3 2 3-5 3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function AutoIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke={color} strokeWidth="1.5"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M3.8 12.2l1-1M11.2 4.8l1-1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function RelIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="1.5" stroke={color} strokeWidth="1.5"/><path d="M6 6h4M6 9h4M6 12h2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function ProjIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M2 14l3-6 3 3 3-8 3 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function BaseIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5"/></svg> }
function AcompIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth="1.5"/><path d="M8 5v3l2 2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function ContasIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke={color} strokeWidth="1.5"/><path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M11 7.5l1.5 1.5L15 6.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function PesqIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4" stroke={color} strokeWidth="1.5"/><path d="M10 10l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function GridIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5"/></svg> }
function LogoutIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M10 8H3M3 8l2.5-2.5M3 8l2.5 2.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 4V3a1 1 0 011-1h3a1 1 0 011 1v10a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function FunnelIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5L2 3z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ExecIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M2 13l3-3 3 2 3-4 3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 3v11h12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function ExternalIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 2h4v4M14 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ImgIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke={color} strokeWidth="1.5"/><circle cx="6" cy="7" r="1.2" fill={color}/><path d="M2 11l3-3 2.5 2.5L10 8l4 4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function AtaIcon({ size, color }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2" y="1.5" width="12" height="13" rx="2" stroke={color} strokeWidth="1.5"/><path d="M5 5.5h6M5 8h6M5 10.5h3.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/><path d="M10 10l1.5 1.5L14 9" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> }
