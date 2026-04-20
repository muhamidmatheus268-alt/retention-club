import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import CalendarView from '../components/CalendarView'

const MODULES = [
  { key: 'calendar',    label: 'Calendário',  icon: CalIcon,   desc: 'Campanhas e réguas agendadas' },
  { key: 'diagnostico', label: 'Diagnóstico', icon: ChartIcon, desc: 'BI e métricas de performance' },
  { key: 'relatorios',  label: 'Relatórios',  icon: DocIcon,   desc: 'Relatórios mensais entregues' },
  { key: 'ata',         label: 'ATAs',        icon: AtaIconPortal, desc: 'Reuniões e decisões' },
]

export default function ClientPortal() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [client, setClient]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState('calendar')

  useEffect(() => {
    if (!profile?.client_id) return
    supabase.from('clients').select('*').eq('id', profile.client_id).single()
      .then(({ data }) => { setClient(data); setLoading(false) })
  }, [profile])

  if (!profile?.client_id) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0c0c10' }}>
      <div className="text-center max-w-sm px-6">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-white font-bold mb-2">Conta não configurada</h2>
        <p className="text-[#555568] text-sm mb-6">
          Sua conta de acesso ainda não foi vinculada a um cliente. Entre em contato com seu gestor.
        </p>
        <button onClick={async () => { await signOut(); navigate('/login') }}
          className="text-sm text-[#E8642A] hover:opacity-80 transition-opacity">
          ← Sair
        </button>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0c0c10' }}>
      <div className="flex flex-col items-center gap-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
          style={{ backgroundColor: '#E8642A' }}>R</span>
        <p className="text-[#555568] text-sm">Carregando…</p>
      </div>
    </div>
  )

  if (!client) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0c0c10' }}>
      <p className="text-[#555568] text-sm">Cliente não encontrado.</p>
    </div>
  )

  const brandColor = client.brand_color || '#E8642A'
  const brandLogo  = client.brand_logo  || null
  const brandFont  = client.brand_font  || null

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: '#0c0c10', ...(brandFont ? { fontFamily: `'${brandFont}', sans-serif` } : {}) }}>

      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-6 h-14 border-b"
        style={{ backgroundColor: '#0e0e14', borderColor: '#1e1e2a' }}>
        <div className="flex items-center gap-3">
          {brandLogo
            ? <img src={brandLogo} alt={client.name} className="h-7 w-auto object-contain" style={{ maxWidth: 140 }} />
            : <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: brandColor }} />
                <span className="text-white font-semibold text-sm">{client.name}</span>
              </div>
          }
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#333340' }}>
            Portal do Cliente
          </span>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="text-xs transition-colors hover:text-white"
            style={{ color: '#555568' }}>
            Sair
          </button>
        </div>
      </header>

      {/* Module tabs */}
      <div className="shrink-0 flex items-center gap-0 px-4 border-b"
        style={{ backgroundColor: '#0c0c10', borderColor: '#1e1e2a' }}>
        {MODULES.map(mod => {
          const Icon = mod.icon
          const active = activeModule === mod.key
          return (
            <button key={mod.key} onClick={() => setActiveModule(mod.key)}
              className="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all"
              style={active
                ? { borderBottomColor: brandColor, color: '#fff' }
                : { borderBottomColor: 'transparent', color: '#555568' }}>
              <Icon active={active} color={active ? brandColor : '#555568'} />
              {mod.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeModule === 'calendar' && (
          <CalendarView
            clientId={client.id}
            clientName={client.name}
            isAdmin={false}
            brandColor={brandColor}
            brandFont={brandFont}
          />
        )}
        {activeModule === 'diagnostico' && (
          <DiagnosticoView client={client} brandColor={brandColor} />
        )}
        {activeModule === 'relatorios' && (
          <RelatoriosView client={client} brandColor={brandColor} />
        )}
        {activeModule === 'ata' && (
          <AtasView client={client} brandColor={brandColor} />
        )}
      </div>
    </div>
  )
}

/* ── ATAs view (read-only) ── */
function AtasView({ client, brandColor }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)

  useEffect(() => {
    supabase.from('atas').select('*')
      .eq('client_id', client.id).order('data', { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [client.id])

  if (loading) return <div className="py-16 text-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-white font-bold text-lg mb-1">ATAs de reunião</h2>
      <p className="text-[#555568] text-sm mb-6">Decisões e próximos passos</p>
      {items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border" style={{ borderColor: '#1e1e2a' }}>
          <p className="text-5xl mb-4">📝</p>
          <p className="text-white font-medium mb-1">Nenhuma ATA ainda</p>
          <p className="text-[#555568] text-sm">As ATAs das suas reuniões aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(a => (
            <div key={a.id} className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: '#111118', borderColor: '#1e1e2a', borderLeft: `3px solid ${brandColor}` }}>
              <button onClick={() => setSel(sel?.id === a.id ? null : a)}
                className="w-full flex items-start justify-between p-4 text-left hover:bg-[#ffffff05] transition-colors">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm">{a.titulo || 'Reunião'}</p>
                  <p className="text-[#555568] text-xs mt-0.5">
                    {a.data && new Date(a.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {a.participantes && ` · ${a.participantes}`}
                  </p>
                </div>
                <span className="text-[#555568] text-sm shrink-0 ml-3">{sel?.id === a.id ? '−' : '+'}</span>
              </button>
              {sel?.id === a.id && (
                <div className="px-4 pb-4 pt-1 border-t space-y-3" style={{ borderColor: '#1e1e2a' }}>
                  {a.resumo && <p className="text-sm" style={{ color: '#c4c4d0' }}>{a.resumo}</p>}
                  {Array.isArray(a.action_items) && a.action_items.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: brandColor }}>Próximos passos</p>
                      <ul className="space-y-1">
                        {a.action_items.map((it, i) => (
                          <li key={i} className="flex gap-2 text-xs" style={{ color: '#c4c4d0' }}>
                            <span className="shrink-0" style={{ color: brandColor }}>●</span>
                            <span>{typeof it === 'string' ? it : (it.descricao || it.acao || JSON.stringify(it))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AtaIconPortal({ color }) {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1.5" width="12" height="13" rx="1.5" stroke={color} strokeWidth="1.4"/>
      <path d="M5 5.5h6M5 8h6M5 10.5h3.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

/* ── Diagnóstico placeholder (read-only) ── */
function DiagnosticoView({ client, brandColor }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl"
        style={{ backgroundColor: brandColor + '15', border: `1px solid ${brandColor}25` }}>📊</div>
      <h2 className="text-white font-bold text-lg mb-2">Diagnóstico</h2>
      <p className="text-[#555568] text-sm max-w-sm mx-auto">
        Seu painel de BI com métricas de performance do CRM será exibido aqui.
        Em breve disponível.
      </p>
    </div>
  )
}

/* ── Relatórios placeholder ── */
function RelatoriosView({ client, brandColor }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('relatorios').select('*')
      .eq('client_id', client.id).order('created_at', { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [client.id])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-[#555568] text-sm">Carregando…</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-white font-bold text-lg mb-1">Relatórios</h2>
      <p className="text-[#555568] text-sm mb-6">Relatórios mensais da sua operação CRM</p>

      {items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border" style={{ borderColor: '#1e1e2a' }}>
          <p className="text-5xl mb-4">📋</p>
          <p className="text-white font-medium mb-1">Nenhum relatório ainda</p>
          <p className="text-[#555568] text-sm">Seus relatórios mensais aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(r => (
            <div key={r.id} className="rounded-xl border p-4 flex items-center justify-between"
              style={{ backgroundColor: '#111118', borderColor: '#1e1e2a' }}>
              <div>
                <p className="text-white font-semibold text-sm">{r.titulo || 'Relatório'}</p>
                <p className="text-[#555568] text-xs mt-0.5">
                  {new Date(r.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              {r.url && (
                <a href={r.url} target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: brandColor }}>
                  Abrir ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── icons ── */
function CalIcon({ active, color }) {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke={color} strokeWidth="1.4"/>
      <path d="M1.5 6h13" stroke={color} strokeWidth="1.4"/>
      <path d="M5 1.5v2M11 1.5v2" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function ChartIcon({ color }) {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <path d="M2 12l4-4 3 3 5-6" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function DocIcon({ color }) {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={color} strokeWidth="1.4"/>
      <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
