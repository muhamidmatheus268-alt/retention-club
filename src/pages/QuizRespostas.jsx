import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function QuizRespostas() {
  const [respostas, setRespostas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()
  const { signOut } = useAuth()

  useEffect(() => {
    supabase
      .from('quiz_respostas')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRespostas(data || []); setLoading(false) })
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0c0c10', color: '#fff' }}>

      {/* Sidebar */}
      <aside className="flex flex-col shrink-0 border-r" style={{ width: 220, backgroundColor: '#111118', borderColor: '#1e1e2a' }}>
        <div className="flex items-center gap-2.5 px-4 h-12 border-b shrink-0" style={{ borderColor: '#1e1e2a' }}>
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white shrink-0"
            style={{ backgroundColor: '#E8642A' }}>R</span>
          <span className="font-bold text-sm text-white tracking-tight">Retention Club</span>
        </div>

        <nav className="flex-1 px-2 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#33333f] px-3 mb-2">Geral</p>
          <button onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#6b6b80] hover:text-[#9999b0] transition-all mb-0.5"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffffff07'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
            <GridIcon />
            <span className="text-sm">Painel geral</span>
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all mb-0.5"
            style={{ backgroundColor: '#E8642A18' }}>
            <FunnelIcon active />
            <span className="text-sm font-medium text-white flex-1">Funil CRM</span>
            <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: '#E8642A' }} />
          </button>
        </nav>

        <div className="border-t px-2 py-2.5 shrink-0" style={{ borderColor: '#1e1e2a' }}>
          <button onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#555568] hover:text-[#8b8ba0] transition-colors mb-0.5"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffffff07'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
            <GridIcon />
            <span className="text-sm">Clientes</span>
          </button>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[#555568] hover:text-[#8b8ba0] transition-colors"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffffff07'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
            <LogoutIcon />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">

        {/* Topbar */}
        <header className="flex items-center justify-between px-6 h-12 border-b shrink-0"
          style={{ backgroundColor: '#111118', borderColor: '#1e1e2a' }}>
          <div className="flex items-center gap-1.5 text-sm">
            <button onClick={() => navigate('/admin')} className="text-[#444455] hover:text-[#777788] transition-colors text-xs">Clientes</button>
            <span className="text-[#222230] text-xs">/</span>
            <span className="text-white text-xs font-semibold">Funil CRM</span>
          </div>
          <a href="/quiz" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all"
            style={{ borderColor: '#2a2a38', color: '#555568' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555568'; e.currentTarget.style.borderColor = '#2a2a38' }}>
            ↗ Ver quiz público
          </a>
        </header>

        {/* Content */}
        <div className="flex-1 p-6" style={{ backgroundColor: '#0c0c10' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-bold text-white">Respostas do Quiz</h1>
              <p className="text-sm text-[#555568] mt-0.5">{respostas.length} diagnóstico{respostas.length !== 1 ? 's' : ''} recebido{respostas.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-[#555568] text-sm">Carregando...</div>
          ) : respostas.length === 0 ? (
            <div className="rounded-xl border p-12 text-center" style={{ borderColor: '#1e1e2a', backgroundColor: '#111118' }}>
              <div className="text-4xl mb-3">📋</div>
              <p className="text-white font-medium mb-1">Nenhuma resposta ainda</p>
              <p className="text-[#555568] text-sm">Compartilhe o link do quiz com seus clientes.</p>
              <a href="/quiz" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#E8642A' }}>
                ↗ Abrir quiz
              </a>
            </div>
          ) : (
            <div className="grid gap-3">
              {respostas.map(r => (
                <button key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  className="w-full text-left rounded-xl border p-4 transition-all"
                  style={{ borderColor: selected?.id === r.id ? '#E8642A44' : '#1e1e2a', backgroundColor: '#111118' }}
                  onMouseEnter={e => { if (selected?.id !== r.id) e.currentTarget.style.borderColor = '#2a2a38' }}
                  onMouseLeave={e => { if (selected?.id !== r.id) e.currentTarget.style.borderColor = '#1e1e2a' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">{r.empresa || '—'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: r.tem_crm === 'sim' ? '#22c55e22' : '#3b82f622', color: r.tem_crm === 'sim' ? '#22c55e' : '#3b82f6' }}>
                          {r.tem_crm === 'sim' ? 'Tem CRM' : 'Sem CRM'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#555568]">
                        <span>{r.responsavel}</span>
                        {r.email && <span>· {r.email}</span>}
                        {r.whatsapp && <span>· {r.whatsapp}</span>}
                        {r.segmento && <span>· {r.segmento}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-[#444455]">
                        {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="text-[10px] text-[#E8642A] mt-0.5">{selected?.id === r.id ? '▲ fechar' : '▼ ver detalhes'}</div>
                    </div>
                  </div>

                  {selected?.id === r.id && r.answers_json && (
                    <div className="mt-4 pt-4 border-t text-left" style={{ borderColor: '#1e1e2a' }}
                      onClick={e => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        {Object.entries(r.answers_json).map(([key, val]) => (
                          val && key !== 'nome_completo' ? (
                            <div key={key} className="flex flex-col">
                              <span className="text-[10px] text-[#444455] uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-[#9999b0] mt-0.5">
                                {Array.isArray(val) ? val.join(', ') : String(val)}
                              </span>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GridIcon() { return <svg width={14} height={14} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="#555568" strokeWidth="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="#555568" strokeWidth="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="#555568" strokeWidth="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="#555568" strokeWidth="1.5"/></svg> }
function FunnelIcon({ active }) { const c = active ? '#E8642A' : '#555568'; return <svg width={14} height={14} viewBox="0 0 16 16" fill="none"><path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5L2 3z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function LogoutIcon() { return <svg width={14} height={14} viewBox="0 0 16 16" fill="none"><path d="M10 8H3M3 8l2.5-2.5M3 8l2.5 2.5" stroke="#555568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 4V3a1 1 0 011-1h3a1 1 0 011 1v10a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1" stroke="#555568" strokeWidth="1.5" strokeLinecap="round"/></svg> }
