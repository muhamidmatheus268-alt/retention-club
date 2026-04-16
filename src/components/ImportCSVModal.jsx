import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseCSV, mapCsvRowToEntry } from '../lib/calendarHelpers'

const S = { panel: '#13131d', border: '#2a2a38', muted: '#555568', faint: '#333340', input: '#0a0a0f' }

const SAMPLE = `Data,Tema,Segmentação,Assunto,Preheader,Horário,Pilar,Descrição
2026-04-02,"Kit detox de outono","Ativos 90d","Seu corpo agradece","Detox em 30 dias",10:00,Não,"Lançamento do novo kit detox"
2026-04-09,"Dia das Mães - teaser","Toda base","Algo especial vem aí","Prepare o coração",09:00,Não,"Começo da campanha"
2026-04-14,"Dia das Mães - pilar","Toda base","10% OFF exclusivo","Só hoje para presentear",10:00,Sim,"Pilar da campanha"`

export default function ImportCSVModal({ open, onClose, clientId, channel, brandColor = '#E8642A', onDone }) {
  const [step, setStep] = useState('paste') // paste | preview | saving
  const [text, setText] = useState('')
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [error, setError] = useState('')

  if (!open) return null

  function parse() {
    try {
      const parsed = parseCSV(text)
      if (parsed.length === 0) { setError('Nenhuma linha detectada.'); return }
      const mapped = parsed.map(mapCsvRowToEntry).filter(r => r.date)
      if (mapped.length === 0) { setError('Nenhuma linha tem coluna "Data" válida.'); return }
      setRows(mapped)
      setSelected(new Set(mapped.map((_, i) => i)))
      setStep('preview')
      setError('')
    } catch (e) {
      setError('Erro ao parsear: ' + e.message)
    }
  }

  function toggle(i) {
    setSelected(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  async function save() {
    setStep('saving')
    const toInsert = rows.filter((_, i) => selected.has(i)).map(r => ({
      client_id: clientId, channel,
      date: r.date, tema: r.tema, segmentacao: r.segmentacao,
      assunto: r.assunto, preheader: r.preheader, horario: r.horario,
      descricao: r.descricao, observacoes: r.observacoes, link_copy: r.link_copy,
      status: r.status, acao_comercial: r.acao_comercial,
      tipo_template: 'marketing', email_thumbnail: '', metodo_mensuracao: '', tamanho_base: null,
    }))
    const { error: err } = await supabase.from('calendar_entries').insert(toInsert)
    if (err) { setError(err.message); setStep('preview'); return }
    onDone?.(toInsert.length); onClose()
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => step !== 'saving' && onClose()}>
      <div className="w-full max-w-2xl rounded-2xl border overflow-hidden shadow-2xl modal-panel flex flex-col"
        style={{ backgroundColor: S.panel, borderColor: S.border, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 h-12 border-b shrink-0" style={{ borderColor: S.border }}>
          <h2 className="text-sm font-semibold text-white">📥 Importar CSV</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-[#555568] hover:text-white hover:bg-[#ffffff08]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {step === 'paste' && (
            <>
              <p className="text-xs" style={{ color: S.muted }}>
                Cole uma planilha em formato CSV. Colunas aceitas: <span className="text-white font-mono text-[10px]">Data, Tema, Segmentação, Assunto, Preheader, Horário, Pilar, Descrição, Observações, Link</span>.
              </p>
              <div className="flex items-center gap-2">
                <input type="file" accept=".csv,text/csv"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    f.text().then(setText)
                  }}
                  className="text-xs text-[#8b8ba0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1e1e2a] file:text-white file:px-3 file:py-1.5 file:text-xs file:cursor-pointer" />
                <button onClick={() => setText(SAMPLE)}
                  className="text-[11px] underline" style={{ color: S.muted }}>
                  usar exemplo
                </button>
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)}
                rows={12} placeholder="Cole aqui o CSV…"
                className="w-full text-xs font-mono rounded-lg px-3 py-2 focus:outline-none"
                style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff' }} />
              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}

          {(step === 'preview' || step === 'saving') && (
            <>
              <p className="text-xs" style={{ color: S.muted }}>
                {rows.length} linha{rows.length !== 1 ? 's' : ''} detectada{rows.length !== 1 ? 's' : ''}. Desmarque as que não quiser importar.
              </p>
              {rows.map((r, i) => {
                const on = selected.has(i)
                return (
                  <div key={i} onClick={() => toggle(i)}
                    className="rounded-xl border p-3 cursor-pointer transition-all"
                    style={{ backgroundColor: on ? '#17171f' : S.input, borderColor: on ? brandColor + '50' : S.border, opacity: on ? 1 : 0.5 }}>
                    <div className="flex items-start gap-3">
                      <span className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
                        style={on ? { backgroundColor: brandColor, borderColor: brandColor } : { borderColor: S.border }}>
                        {on && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-white font-mono">{r.date}</span>
                          {r.acao_comercial && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: brandColor + '30', color: brandColor }}>★</span>}
                          {r.segmentacao && <span className="text-[10px]" style={{ color: S.muted }}>{r.segmentacao}</span>}
                        </div>
                        <p className="text-sm text-white truncate">{r.tema || '(sem tema)'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t shrink-0" style={{ borderColor: S.border, backgroundColor: '#0f0f17' }}>
          {step === 'paste' && (
            <>
              <span className="text-[11px]" style={{ color: S.muted }}>CSV com cabeçalho na primeira linha</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm border" style={{ borderColor: S.border, color: S.muted }}>Cancelar</button>
                <button onClick={parse} disabled={!text.trim()} className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: brandColor }}>Parsear →</button>
              </div>
            </>
          )}
          {step === 'preview' && (
            <>
              <span className="text-[11px]" style={{ color: S.muted }}>{selected.size}/{rows.length} selecionadas</span>
              <div className="flex gap-2">
                <button onClick={() => setStep('paste')} className="px-4 py-1.5 rounded-lg text-sm border" style={{ borderColor: S.border, color: S.muted }}>← Voltar</button>
                <button onClick={save} disabled={!selected.size} className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: brandColor }}>Importar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
