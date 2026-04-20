import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const S = { bg: '#0c0c10', card: '#111118', border: '#1e1e2a', ib: '#2a2a38', muted: '#555568', faint: '#333340' }

function fmtBRL(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmtBRLs(v) { const n = Number(v || 0); if (n >= 1e6) return 'R$' + (n/1e6).toFixed(1) + 'M'; if (n >= 1e3) return 'R$' + (n/1e3).toFixed(1) + 'k'; return fmtBRL(n) }

export default function ExecutiveDashboard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchSummary() }, [mes, ano])

  async function fetchSummary() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/executive-summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes, ano }),
      })
      const d = await res.json()
      if (!res.ok) setError(d.error || 'Erro')
      else setData(d)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: S.bg }}>
      <header className="flex items-center justify-between px-6 h-12 border-b sticky top-0 z-40"
        style={{ backgroundColor: S.card, borderColor: S.border }}>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-xs" style={{ color: S.muted }}>← Clientes</Link>
          <span className="text-[#222230] text-xs">/</span>
          <span className="text-xs font-bold text-white">Dashboard executivo</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, color: '#fff' }}>
            {MONTH_NAMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, color: '#fff' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: S.border, color: S.muted }}>
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Resumo executivo · {MONTH_NAMES[mes - 1]}/{ano}</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>
            Visão consolidada de toda a carteira · atualizado em tempo real
          </p>
        </div>

        {loading && (
          <div className="py-20 text-center">
            <div className="w-10 h-10 rounded-full mx-auto mb-3 animate-spin"
              style={{ background: 'conic-gradient(#E8642A, transparent)', maskImage: 'radial-gradient(circle, transparent 55%, #000 56%)', WebkitMaskImage: 'radial-gradient(circle, transparent 55%, #000 56%)' }} />
            <p className="text-sm" style={{ color: S.muted }}>Consolidando dados…</p>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#f87171' }}>
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Kpi label="Receita total"   value={fmtBRLs(data.totals.receita)} accent="#10b981" />
              <Kpi label="Meta agregada"   value={fmtBRLs(data.totals.meta)}    accent="#E8642A"
                   hint={data.totals.atingimento_pct != null ? `${data.totals.atingimento_pct.toFixed(0)}% atingido` : null} />
              <Kpi label="Disparos"        value={data.totals.disparos.toLocaleString('pt-BR')} />
              <Kpi label="Saudáveis"       value={`${data.totals.healthy}/${data.totals.clientes}`}
                   accent={data.totals.healthy > data.totals.clientes / 2 ? '#10b981' : '#f59e0b'}
                   hint={data.totals.atRisk > 0 ? `${data.totals.atRisk} em risco` : null} />
            </div>

            {/* AI insight */}
            {data.ai && (
              <div className="rounded-xl border p-4 mb-6"
                style={{ background: 'linear-gradient(135deg, #E8642A15, transparent)', borderColor: '#E8642A40' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span>✨</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#E8642A' }}>IA · Headline</p>
                </div>
                <p className="text-sm text-white leading-relaxed mb-3">{data.ai.headline}</p>

                {data.ai.acoes_da_semana?.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 mt-4" style={{ color: S.muted }}>
                      Ações da semana
                    </p>
                    <ol className="space-y-1.5">
                      {data.ai.acoes_da_semana.map((a, i) => (
                        <li key={i} className="flex gap-2 text-sm" style={{ color: '#c4c4d0' }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5" style={{ backgroundColor: '#E8642A' }}>{i + 1}</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {data.ai.clientes_para_acionar?.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 mt-4" style={{ color: S.muted }}>
                      Clientes para acionar
                    </p>
                    <ul className="space-y-1">
                      {data.ai.clientes_para_acionar.map((c, i) => (
                        <li key={i} className="text-sm" style={{ color: '#c4c4d0' }}>— {c}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* Top/Worst */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <ClientList title="🏆 Top 3 por receita" clients={data.top3} accent="#10b981" />
              {data.worst3.length > 0 && <ClientList title="⚠ Em risco" clients={data.worst3} accent="#ef4444" />}
            </div>

            {/* Full list */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: S.muted }}>
                Toda carteira ({data.per_client.length})
              </p>
              <div className="space-y-2">
                {[...data.per_client].sort((a, b) => b.receita_bi - a.receita_bi).map(c => (
                  <HealthBar key={c.id} c={c} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Kpi({ label, value, accent, hint }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.muted }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: accent || '#fff' }}>{value}</p>
      {hint && <p className="text-[10px] mt-1" style={{ color: S.faint }}>{hint}</p>}
    </div>
  )
}

function ClientList({ title, clients, accent }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: accent }}>{title}</p>
      <div className="space-y-2">
        {clients.map(c => (
          <div key={c.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-sm text-white truncate">{c.name}</span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold" style={{ color: '#fff' }}>{fmtBRLs(c.receita_bi)}</p>
              <p className="text-[10px]" style={{ color: S.muted }}>saúde {c.health}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HealthBar({ c }) {
  const color = c.health >= 70 ? '#10b981' : c.health >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <Link to={`/admin/diagnostico/${c.id}`}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-[#ffffff05]"
      style={{ backgroundColor: S.card, borderColor: S.border }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
      <span className="text-sm text-white font-medium min-w-0 truncate flex-1">{c.name}</span>
      <div className="flex items-center gap-6 shrink-0 text-xs" style={{ color: S.muted }}>
        {c.has_bi ? (
          <>
            <span>{fmtBRLs(c.receita_bi)}</span>
            <span>{c.disparos} disparos</span>
            <span className="w-20 flex items-center gap-1.5">
              <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: S.ib }}>
                <div className="h-full rounded-full" style={{ width: `${c.health}%`, backgroundColor: color }} />
              </div>
              <span className="font-bold" style={{ color }}>{c.health}</span>
            </span>
          </>
        ) : (
          <span className="text-[#555568] italic">sem dados</span>
        )}
      </div>
    </Link>
  )
}
