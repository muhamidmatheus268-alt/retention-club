import { useState, useEffect } from 'react'

const S = { panel: '#13131d', border: '#2a2a38', muted: '#555568', faint: '#333340', input: '#0a0a0f' }

export default function PostMortemModal({ open, onClose, clientId, channel, year, month, brandColor = '#E8642A' }) {
  const [state, setState] = useState('loading') // loading | done | error
  const [analysis, setAnalysis] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setState('loading'); setError(''); setAnalysis(null)
    fetch('/api/analyze-month', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, year, month, channel }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setError(d.error + (d.detail ? ': ' + d.detail.slice(0, 200) : '')); setState('error'); return }
        setAnalysis(d.analysis); setStats(d.stats); setState('done')
      })
      .catch(e => { setError(e.message); setState('error') })
  }, [open, clientId, year, month, channel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border overflow-hidden shadow-2xl modal-panel flex flex-col"
        style={{ backgroundColor: S.panel, borderColor: S.border, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 h-12 border-b shrink-0" style={{ borderColor: S.border }}>
          <h2 className="text-sm font-semibold text-white">📊 Análise do mês</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-[#555568] hover:text-white hover:bg-[#ffffff08]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {state === 'loading' && (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
                style={{ background: `conic-gradient(${brandColor}, transparent)`, maskImage: 'radial-gradient(circle, transparent 55%, #000 56%)', WebkitMaskImage: 'radial-gradient(circle, transparent 55%, #000 56%)' }} />
              <p className="text-sm text-white font-semibold mb-1">Analisando resultados…</p>
              <p className="text-xs" style={{ color: S.muted }}>Cruzando entradas, performances e contexto da marca.</p>
            </div>
          )}

          {state === 'error' && (
            <div className="px-3 py-4 rounded-lg text-sm text-center"
              style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#f87171' }}>
              {error}
            </div>
          )}

          {state === 'done' && analysis && (
            <div className="space-y-5">
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatPill value={stats.total}       label="disparos"       />
                  <StatPill value={stats.withResults} label="com resultados" />
                  <StatPill value={`R$ ${(stats.receita||0).toLocaleString('pt-BR')}`} label="receita"  accent={brandColor} />
                  <StatPill value={stats.pedidos || 0} label="pedidos"       />
                </div>
              )}

              {/* Resumo */}
              <Section title="Resumo executivo" icon="📋">
                <p className="text-sm text-white leading-relaxed">{analysis.resumo}</p>
              </Section>

              {/* Destaques */}
              {analysis.destaques?.length > 0 && (
                <Section title="Destaques" icon="✨" accent="#10b981">
                  <ul className="space-y-1.5">
                    {analysis.destaques.map((d, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[#c4c4d0]">
                        <span className="text-[#10b981] shrink-0">●</span><span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Problemas */}
              {analysis.problemas?.length > 0 && (
                <Section title="Pontos de atenção" icon="⚠" accent="#f59e0b">
                  <ul className="space-y-1.5">
                    {analysis.problemas.map((d, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[#c4c4d0]">
                        <span className="text-[#f59e0b] shrink-0">●</span><span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Recomendações */}
              {analysis.recomendacoes?.length > 0 && (
                <Section title="Recomendações para o próximo mês" icon="🎯" accent={brandColor}>
                  <ol className="space-y-2">
                    {analysis.recomendacoes.map((r, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: brandColor }}>{i + 1}</span>
                        <span className="text-white leading-relaxed">{r}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}

              {/* Cadência e segmentações */}
              {(analysis.cadencia_sugerida || analysis.segmentacoes_priorizar?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.cadencia_sugerida && (
                    <div className="rounded-xl border p-3" style={{ backgroundColor: S.input, borderColor: S.border }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.faint }}>Cadência sugerida</p>
                      <p className="text-lg font-bold text-white">{analysis.cadencia_sugerida}× / semana</p>
                    </div>
                  )}
                  {analysis.segmentacoes_priorizar?.length > 0 && (
                    <div className="rounded-xl border p-3" style={{ backgroundColor: S.input, borderColor: S.border }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.faint }}>Priorizar segmentos</p>
                      <p className="text-xs text-white">{analysis.segmentacoes_priorizar.join(' · ')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Evitar */}
              {analysis.evitar?.length > 0 && (
                <Section title="Evitar no próximo mês" icon="🚫" accent="#ef4444">
                  <ul className="space-y-1">
                    {analysis.evitar.map((d, i) => (
                      <li key={i} className="text-sm text-[#c4c4d0]">— {d}</li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatPill({ value, label, accent }) {
  return (
    <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: S.input, borderColor: S.border }}>
      <p className="text-base font-bold" style={{ color: accent || '#fff' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: S.muted }}>{label}</p>
    </div>
  )
}

function Section({ title, icon, accent, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: accent || '#8b8ba0' }}>{title}</h3>
      </div>
      <div className="rounded-xl border p-4" style={{ backgroundColor: S.input, borderColor: S.border }}>
        {children}
      </div>
    </div>
  )
}
