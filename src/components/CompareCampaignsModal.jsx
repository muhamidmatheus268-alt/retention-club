import { useState, useEffect } from 'react'

const S = { panel: '#13131d', border: '#2a2a38', muted: '#555568', faint: '#333340', input: '#0a0a0f' }

function brl(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }
function pct(v) { return v == null ? '—' : `${Number(v).toFixed(1)}%` }

export default function CompareCampaignsModal({ open, onClose, clientId, entryIds, brandColor = '#E8642A' }) {
  const [state, setState] = useState('loading')
  const [data, setData]   = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !entryIds?.length) return
    setState('loading'); setError(''); setData(null)
    fetch('/api/compare-campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, entry_ids: entryIds }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setError(d.error + (d.detail ? ': ' + d.detail : '')); setState('error'); return }
        setData(d); setState('done')
      })
      .catch(e => { setError(e.message); setState('error') })
  }, [open, clientId, entryIds])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl border overflow-hidden shadow-2xl modal-panel flex flex-col"
        style={{ backgroundColor: S.panel, borderColor: S.border, maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 h-12 border-b shrink-0" style={{ borderColor: S.border }}>
          <h2 className="text-sm font-semibold text-white">
            ⚖ Comparação de {entryIds?.length || 0} campanhas
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-[#555568] hover:text-white hover:bg-[#ffffff08]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {state === 'loading' && (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
                style={{ background: `conic-gradient(${brandColor}, transparent)`, maskImage: 'radial-gradient(circle, transparent 55%, #000 56%)', WebkitMaskImage: 'radial-gradient(circle, transparent 55%, #000 56%)' }} />
              <p className="text-sm text-white font-semibold">IA comparando campanhas…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#f87171' }}>
              {error}
            </div>
          )}

          {state === 'done' && data && (
            <div className="space-y-5">
              {/* Ranking */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>
                  Ranking por receita
                </p>
                <div className="space-y-2">
                  {data.campaigns.map(c => {
                    const isWin = data.analysis.vencedora?.id === c.id
                    const isLose = data.analysis.perdedora?.id === c.id
                    const color = isWin ? '#10b981' : isLose ? '#ef4444' : brandColor
                    return (
                      <div key={c.id} className="rounded-xl border p-3"
                        style={{ backgroundColor: S.input, borderColor: S.border, borderLeft: `3px solid ${color}` }}>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: color }}>#{c.rank}</span>
                          <span className="text-sm font-semibold text-white">{c.tema || '—'}</span>
                          {c.pilar && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}>★ Pilar</span>}
                          {isWin  && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: '#10b98122', color: '#10b981' }}>🏆 vencedora</span>}
                          {isLose && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: '#ef444422', color: '#ef4444' }}>pior</span>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                          <Stat label="Receita" value={brl(c.receita)} />
                          <Stat label="Pedidos" value={c.pedidos || '—'} />
                          <Stat label="Conversão" value={pct(c.taxa_conversao)} />
                          <Stat label="Data" value={c.data} />
                        </div>
                        {(c.assunto || c.segmentacao) && (
                          <div className="mt-2 pt-2 border-t text-[11px]" style={{ borderColor: S.border, color: '#8b8ba0' }}>
                            {c.assunto && <p><span style={{ color: S.muted }}>Assunto:</span> {c.assunto}</p>}
                            {c.segmentacao && <p><span style={{ color: S.muted }}>Seg:</span> {c.segmentacao}</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Vencedora / Perdedora */}
              <div className="grid sm:grid-cols-2 gap-3">
                {data.analysis.vencedora && (
                  <InsightBox title="🏆 Por que venceu" color="#10b981" text={data.analysis.vencedora.por_que} />
                )}
                {data.analysis.perdedora && (
                  <InsightBox title="⚠ Por que falhou" color="#ef4444" text={data.analysis.perdedora.por_que} />
                )}
              </div>

              {/* Padrões identificados */}
              {data.analysis.insights?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6366f1' }}>
                    📊 Padrões identificados
                  </p>
                  <div className="rounded-xl border p-3 space-y-2" style={{ backgroundColor: S.input, borderColor: S.border }}>
                    {data.analysis.insights.map((it, i) => (
                      <div key={i} className="text-xs">
                        <p className="text-white font-semibold">● {it.padrao}</p>
                        <p className="mt-0.5 pl-3" style={{ color: '#8b8ba0' }}>Evidência: {it.evidencia}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendações */}
              {data.analysis.recomendacoes?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: brandColor }}>
                    🎯 Replicar o que funcionou
                  </p>
                  <ol className="rounded-xl border p-3 space-y-1.5" style={{ backgroundColor: S.input, borderColor: S.border }}>
                    {data.analysis.recomendacoes.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: brandColor }}>{i + 1}</span>
                        <span style={{ color: '#c4c4d0' }}>{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px]" style={{ color: S.muted }}>{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function InsightBox({ title, color, text }) {
  return (
    <div className="rounded-xl border p-3"
      style={{ backgroundColor: S.input, borderColor: color + '40', borderLeft: `3px solid ${color}` }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color }}>
        {title}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: '#c4c4d0' }}>{text}</p>
    </div>
  )
}
