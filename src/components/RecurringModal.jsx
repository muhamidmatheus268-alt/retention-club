import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { expandRecurring } from '../lib/calendarHelpers'

const S = { panel: '#13131d', border: '#2a2a38', muted: '#555568', faint: '#333340', input: '#0a0a0f' }
const WEEKDAYS = [
  { v: 1, l: 'Seg' }, { v: 2, l: 'Ter' }, { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' }, { v: 5, l: 'Sex' }, { v: 6, l: 'Sáb' }, { v: 0, l: 'Dom' },
]

export default function RecurringModal({ open, onClose, clientId, channel, year, month, brandColor = '#E8642A', onDone }) {
  const [pattern, setPattern]  = useState('weekly')   // weekly | biweekly | daily
  const [weekdays, setWeekdays] = useState([2])       // Ter por padrão
  const [tema, setTema]         = useState('')
  const [segmentacao, setSegmentacao] = useState('')
  const [horario, setHorario]   = useState('10:00')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  if (!open) return null

  function toggleWd(v) {
    setWeekdays(ws => ws.includes(v) ? ws.filter(w => w !== v) : [...ws, v])
  }

  async function save() {
    setError(''); setSaving(true)
    const dates = expandRecurring({ year, month, pattern, weekdays })
    if (dates.length === 0) { setError('Nenhuma data gerada. Verifique o padrão.'); setSaving(false); return }

    /* Evitar duplicatas */
    const { data: existing } = await supabase.from('calendar_entries')
      .select('date').eq('client_id', clientId).eq('channel', channel).in('date', dates)
    const existingSet = new Set((existing || []).map(x => x.date))
    const toInsert = dates.filter(d => !existingSet.has(d)).map(date => ({
      client_id: clientId,
      date, channel, tema, segmentacao, horario,
      status: 'pendente', acao_comercial: false, tipo_template: 'marketing',
      descricao: '', assunto: '', preheader: '', link_copy: '', observacoes: '',
      metodo_mensuracao: '', email_thumbnail: '', tamanho_base: null,
    }))

    if (toInsert.length === 0) { setError('Todas as datas já existem no calendário.'); setSaving(false); return }

    const { error: err } = await supabase.from('calendar_entries').insert(toInsert)
    if (err) { setError(err.message); setSaving(false); return }
    onDone?.(toInsert.length); onClose()
  }

  const preview = expandRecurring({ year, month, pattern, weekdays })

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl modal-panel flex flex-col"
        style={{ backgroundColor: S.panel, borderColor: S.border, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 h-12 border-b shrink-0" style={{ borderColor: S.border }}>
          <h2 className="text-sm font-semibold text-white">🔂 Criar recorrente</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-[#555568] hover:text-white hover:bg-[#ffffff08]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-xs" style={{ color: S.muted }}>
            Cria entradas repetidas no mês. Você pode editar cada uma depois no calendário.
          </p>

          <div>
            <Label>Padrão</Label>
            <div className="flex gap-1.5">
              {[{k:'weekly',l:'Semanal'},{k:'biweekly',l:'Quinzenal'},{k:'daily',l:'Diária'}].map(p => (
                <button key={p.k} onClick={() => setPattern(p.k)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={pattern === p.k
                    ? { backgroundColor: brandColor + '22', borderColor: brandColor + '80', color: '#fff' }
                    : { backgroundColor: S.input, borderColor: S.border, color: S.muted }}>
                  {p.l}
                </button>
              ))}
            </div>
          </div>

          {pattern !== 'daily' && (
            <div>
              <Label>Dias da semana</Label>
              <div className="flex gap-1 flex-wrap">
                {WEEKDAYS.map(d => (
                  <button key={d.v} onClick={() => toggleWd(d.v)}
                    className="w-10 h-9 rounded-lg text-xs font-medium border"
                    style={weekdays.includes(d.v)
                      ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' }
                      : { backgroundColor: S.input, borderColor: S.border, color: S.muted }}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Tema padrão</Label>
            <input type="text" value={tema} onChange={e => setTema(e.target.value)}
              placeholder="Ex: Newsletter semanal"
              className="w-full text-sm rounded-lg px-3 py-2" style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Segmentação</Label>
              <input type="text" value={segmentacao} onChange={e => setSegmentacao(e.target.value)}
                placeholder="Ex: Toda base"
                className="w-full text-sm rounded-lg px-3 py-2" style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff' }} />
            </div>
            {channel === 'email' && (
              <div>
                <Label>Horário</Label>
                <input type="time" value={horario} onChange={e => setHorario(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2" style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff' }} />
              </div>
            )}
          </div>

          <div className="rounded-lg px-3 py-2 text-[11px]"
            style={{ backgroundColor: '#0c0c10', border: `1px solid ${S.border}`, color: S.muted }}>
            <span className="text-white font-semibold">{preview.length}</span> entrada{preview.length !== 1 ? 's' : ''} {preview.length > 0 && `— ${preview.slice(0, 5).join(', ')}${preview.length > 5 ? '…' : ''}`}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t shrink-0" style={{ borderColor: S.border, backgroundColor: '#0f0f17' }}>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm border" style={{ borderColor: S.border, color: S.muted }}>Cancelar</button>
          <button onClick={save} disabled={saving || preview.length === 0}
            className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: brandColor }}>
            {saving ? 'Salvando…' : `Criar ${preview.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>{children}</label>
}
