import { useState } from 'react'
import { supabase } from '../lib/supabase'

const S = { panel: '#13131d', bg: '#0c0c10', border: '#2a2a38', muted: '#555568', faint: '#333340', input: '#0a0a0f' }

const PLAYBOOKS = [
  { key: 'black_friday', icon: '🛍',  label: 'Semana Black Friday',     desc: '5-7 disparos: teaser → revelação → pilar → extensão' },
  { key: 'maes',         icon: '💐',  label: 'Dia das Mães',             desc: '4-6 disparos em 2 semanas: emoção → ofertas → urgência' },
  { key: 'aniversario',  icon: '🎂',  label: 'Aniversário da marca',     desc: '5 disparos: storytelling → agradecimento → oferta → destaques → fechamento' },
  { key: 'liquidacao',   icon: '🔥',  label: 'Liquidação / Queima',      desc: '5-7 disparos com urgência progressiva' },
  { key: 'lancamento',   icon: '🚀',  label: 'Lançamento de produto',    desc: 'Teaser → educação → revelação → social proof → oferta' },
  { key: 'reengajamento',icon: '💌',  label: 'Reengajamento de base',    desc: '4 disparos para base inativa (90-180d)' },
]

export default function PlaybookModal({ open, onClose, clientId, channel, year, month, brandColor = '#E8642A', onDone }) {
  const [picked, setPicked] = useState(null)
  const [focus, setFocus]   = useState('')
  const [step, setStep]     = useState('pick')    // pick | loading | preview | saving
  const [generated, setGenerated] = useState([])
  const [selected, setSelected]   = useState(new Set())
  const [error, setError]         = useState('')

  if (!open) return null

  async function run() {
    if (!picked) return
    setStep('loading'); setError('')
    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId, year, month, channel,
          playbook: picked, focus, cadence: 5,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro'); setStep('pick'); return }
      setGenerated(data.entries || [])
      setSelected(new Set((data.entries || []).map(e => e.date)))
      setStep('preview')
    } catch (e) {
      setError('Erro de conexão: ' + e.message); setStep('pick')
    }
  }

  async function save() {
    setStep('saving')
    const toInsert = generated.filter(e => selected.has(e.date)).map(e => ({ client_id: clientId, ...e }))
    const { error } = await supabase.from('calendar_entries').insert(toInsert)
    if (error) { setError(error.message); setStep('preview'); return }
    onDone?.(toInsert.length); onClose()
  }

  function toggle(date) {
    setSelected(s => { const n = new Set(s); n.has(date) ? n.delete(date) : n.add(date); return n })
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => step !== 'loading' && step !== 'saving' && onClose()}>
      <div className="w-full max-w-xl rounded-2xl border overflow-hidden shadow-2xl modal-panel flex flex-col"
        style={{ backgroundColor: S.panel, borderColor: S.border, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 h-12 border-b shrink-0" style={{ borderColor: S.border }}>
          <h2 className="text-sm font-semibold text-white">🎨 Playbooks</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-[#555568] hover:text-white hover:bg-[#ffffff08]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'pick' && (
            <div className="p-5 space-y-3">
              <p className="text-xs" style={{ color: S.muted }}>
                Templates de campanhas sequenciais. A IA gera os disparos seguindo a narrativa do playbook + Cérebro da marca.
              </p>
              {PLAYBOOKS.map(p => (
                <button key={p.key} onClick={() => setPicked(p.key)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all"
                  style={picked === p.key
                    ? { backgroundColor: '#17171f', borderColor: brandColor + '80' }
                    : { backgroundColor: S.input, borderColor: S.border }}>
                  <span className="text-2xl shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{p.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: S.muted }}>{p.desc}</p>
                  </div>
                  {picked === p.key && <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: brandColor }} />}
                </button>
              ))}
              <div className="pt-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>
                  Foco específico (opcional)
                </label>
                <input type="text" value={focus} onChange={e => setFocus(e.target.value)}
                  placeholder="Ex: 40% off em toda loja, kit exclusivo aniversário 10 anos…"
                  className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                  style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff' }} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}

          {step === 'loading' && (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
                style={{ background: `conic-gradient(${brandColor}, transparent)`, maskImage: 'radial-gradient(circle, transparent 55%, #000 56%)', WebkitMaskImage: 'radial-gradient(circle, transparent 55%, #000 56%)' }} />
              <p className="text-sm text-white font-semibold">Montando o playbook…</p>
            </div>
          )}

          {(step === 'preview' || step === 'saving') && (
            <div className="p-5 space-y-2">
              <p className="text-xs" style={{ color: S.muted }}>
                Revise e desmarque o que não quiser manter.
              </p>
              {generated.sort((a,b) => a.date.localeCompare(b.date)).map(e => {
                const on = selected.has(e.date)
                return (
                  <div key={e.date} onClick={() => toggle(e.date)}
                    className="rounded-xl border p-3 cursor-pointer transition-all"
                    style={{ backgroundColor: on ? '#17171f' : S.input, borderColor: on ? brandColor + '50' : S.border, opacity: on ? 1 : 0.4 }}>
                    <div className="flex items-start gap-3">
                      <span className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
                        style={on ? { backgroundColor: brandColor, borderColor: brandColor } : { borderColor: S.border }}>
                        {on && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-white font-mono">{e.date}</span>
                          {e.acao_comercial && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ backgroundColor: brandColor + '30', color: brandColor }}>★ Pilar</span>}
                          {e.segmentacao && <span className="text-[10px]" style={{ color: S.muted }}>{e.segmentacao}</span>}
                        </div>
                        <p className="text-sm font-semibold text-white leading-snug truncate">{e.tema}</p>
                        {channel === 'email' && e.assunto && <p className="text-[11px] mt-0.5 truncate" style={{ color: '#8b8ba0' }}>{e.assunto}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t shrink-0" style={{ borderColor: S.border, backgroundColor: '#0f0f17' }}>
          {step === 'pick' && (
            <>
              <span className="text-[11px]" style={{ color: S.muted }}>Selecione um template</span>
              <button onClick={run} disabled={!picked}
                className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90"
                style={{ backgroundColor: brandColor }}>
                ✨ Gerar
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <span className="text-[11px]" style={{ color: S.muted }}>{selected.size}/{generated.length} selecionadas</span>
              <div className="flex gap-2">
                <button onClick={() => setStep('pick')} className="px-4 py-1.5 rounded-lg text-sm border" style={{ borderColor: S.border, color: S.muted }}>← Voltar</button>
                <button onClick={save} disabled={!selected.size} className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: brandColor }}>Salvar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
