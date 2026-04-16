import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const S = {
  panel:   '#13131d',
  bg:      '#0c0c10',
  border:  '#2a2a38',
  ib:      '#1e1e2a',
  muted:   '#555568',
  faint:   '#333340',
  input:   '#0a0a0f',
}

const CHANNEL_LABELS = { email: 'Email Marketing', whatsapp: 'WhatsApp', vip: 'Grupo VIP' }

/* Presets comuns de segmentação para chips clicáveis */
const SEG_PRESETS = [
  'Toda a base',
  'Ativos 90d',
  'Ativos 30d',
  'Reengajamento 90-180d',
  'Reengajamento 180-365d',
  'VIPs',
  'Carrinho abandonado',
  'Novos leads (30d)',
]

function startOfThisWeek() {
  const d = new Date()
  const dow = d.getDay() // 0=sun
  const diff = dow === 0 ? -6 : 1 - dow // monday
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function GenerateMonthModal({
  open,
  onClose,
  clientId,
  channel,
  year,
  month, /* 0-indexed */
  brandColor = '#E8642A',
  onDone,
  scope = 'month', /* 'month' | 'week' */
}) {
  const [step, setStep] = useState('form') // form | loading | preview | saving
  const [error, setError] = useState('')

  /* Inputs */
  const [cadence, setCadence]   = useState(3)
  const [focus, setFocus]       = useState('')
  const [tom, setTom]           = useState('')
  const [segs, setSegs]         = useState(['Toda a base', 'Ativos 90d', 'Reengajamento 90-180d', 'VIPs'])
  const [customSeg, setCustomSeg] = useState('')
  const [includePilares, setIncludePilares] = useState(true)
  const [startFromToday, setStartFromToday] = useState(false)
  const [overwrite, setOverwrite] = useState(false)

  /* Generated preview */
  const [generated, setGenerated] = useState([])
  const [selected, setSelected]   = useState(() => new Set()) // datas a salvar

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setStep('form'); setError(''); setGenerated([]); setSelected(new Set())
    }
  }, [open])

  if (!open) return null

  function toggleSeg(s) {
    setSegs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function addCustomSeg() {
    const v = customSeg.trim()
    if (!v) return
    if (!segs.includes(v)) setSegs([...segs, v])
    setCustomSeg('')
  }

  async function handleGenerate() {
    setStep('loading')
    setError('')
    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          year, month, channel,
          cadence,
          segmentations: segs,
          tom,
          focus,
          includePilares,
          startFromToday,
          scope,
          ...(scope === 'week' ? { weekStartIso: startOfThisWeek() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error + (data.detail ? `: ${data.detail.slice(0, 200)}` : ''))
        setStep('form')
        return
      }
      const entries = data.entries || []
      if (entries.length === 0) {
        setError('A IA não gerou nenhuma entrada. Tente ajustar os inputs.')
        setStep('form')
        return
      }
      setGenerated(entries)
      setSelected(new Set(entries.map(e => e.date)))
      setStep('preview')
    } catch (e) {
      setError('Erro de conexão com a IA: ' + e.message)
      setStep('form')
    }
  }

  function toggleEntry(date) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date); else next.add(date)
      return next
    })
  }

  async function handleSave() {
    setStep('saving')
    setError('')

    const toInsert = generated
      .filter(e => selected.has(e.date))
      .map(e => ({ client_id: clientId, ...e }))

    try {
      if (overwrite) {
        /* Delete existing entries in the selected dates/channel */
        const dates = toInsert.map(e => e.date)
        await supabase.from('calendar_entries')
          .delete()
          .eq('client_id', clientId)
          .eq('channel', channel)
          .in('date', dates)
      }

      const { error } = await supabase.from('calendar_entries').insert(toInsert)
      if (error) {
        setError('Erro ao salvar: ' + error.message)
        setStep('preview')
        return
      }
      onDone?.(toInsert.length)
      onClose()
    } catch (e) {
      setError('Erro inesperado: ' + e.message)
      setStep('preview')
    }
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  const title = scope === 'week'
    ? `Gerar semana · ${CHANNEL_LABELS[channel] || channel}`
    : `Gerar ${MONTH_NAMES[month]}/${year} · ${CHANNEL_LABELS[channel] || channel}`

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => step !== 'loading' && step !== 'saving' && onClose()}>

      <div className="w-full max-w-2xl rounded-2xl border overflow-hidden shadow-2xl modal-panel flex flex-col"
        style={{ backgroundColor: S.panel, borderColor: S.border, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 h-12 border-b shrink-0" style={{ borderColor: S.border }}>
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          </div>
          <button onClick={onClose} disabled={step === 'loading' || step === 'saving'}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555568] hover:text-white hover:bg-[#ffffff08] transition-colors disabled:opacity-30">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'form' && (
            <FormBody
              brandColor={brandColor}
              cadence={cadence} setCadence={setCadence}
              focus={focus} setFocus={setFocus}
              tom={tom} setTom={setTom}
              segs={segs} toggleSeg={toggleSeg} addCustomSeg={addCustomSeg}
              customSeg={customSeg} setCustomSeg={setCustomSeg}
              includePilares={includePilares} setIncludePilares={setIncludePilares}
              startFromToday={startFromToday} setStartFromToday={setStartFromToday}
              overwrite={overwrite} setOverwrite={setOverwrite}
              error={error}
            />
          )}

          {step === 'loading' && <LoadingBody brandColor={brandColor} />}

          {(step === 'preview' || step === 'saving') && (
            <PreviewBody
              generated={generated}
              selected={selected}
              toggleEntry={toggleEntry}
              channel={channel}
              brandColor={brandColor}
              saving={step === 'saving'}
              error={error}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t shrink-0"
          style={{ borderColor: S.border, backgroundColor: '#0f0f17' }}>
          {step === 'form' && (
            <>
              <span className="text-[11px]" style={{ color: S.muted }}>
                IA gerará ~{scope === 'week' ? cadence : Math.round(cadence * 4.3)} entradas com todos os campos preenchidos
              </span>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="px-4 py-1.5 rounded-lg text-sm border transition-colors"
                  style={{ borderColor: S.border, color: S.muted }}>
                  Cancelar
                </button>
                <button onClick={handleGenerate}
                  className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: brandColor }}>
                  ✨ Gerar com IA
                </button>
              </div>
            </>
          )}
          {step === 'loading' && (
            <span className="text-xs" style={{ color: S.muted }}>Aguarde… a IA está analisando o Cérebro e montando o calendário…</span>
          )}
          {step === 'preview' && (
            <>
              <span className="text-[11px]" style={{ color: S.muted }}>
                <span className="text-white font-semibold">{selected.size}</span> de {generated.length} selecionadas
              </span>
              <div className="flex gap-2">
                <button onClick={() => setStep('form')}
                  className="px-4 py-1.5 rounded-lg text-sm border transition-colors"
                  style={{ borderColor: S.border, color: S.muted }}>
                  ← Voltar
                </button>
                <button onClick={handleSave} disabled={selected.size === 0}
                  className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: brandColor }}>
                  Salvar {selected.size} entrada{selected.size !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
          {step === 'saving' && (
            <span className="text-xs" style={{ color: S.muted }}>Salvando no calendário…</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Form step ──────────────────────────────────────────────────────── */
function FormBody({
  brandColor, cadence, setCadence, focus, setFocus, tom, setTom,
  segs, toggleSeg, addCustomSeg, customSeg, setCustomSeg,
  includePilares, setIncludePilares, startFromToday, setStartFromToday,
  overwrite, setOverwrite, error,
}) {
  return (
    <div className="p-5 space-y-5">
      <p className="text-xs" style={{ color: S.muted }}>
        A IA usará o <span className="text-white font-semibold">Cérebro IA</span> do cliente + feriados comerciais
        brasileiros para gerar entradas completas com tema, segmentação, assunto, preheader, copy, horário e mais.
      </p>

      {/* Cadência */}
      <div>
        <Label>Cadência (posts por semana)</Label>
        <div className="flex gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setCadence(n)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={cadence === n
                ? { backgroundColor: brandColor + '22', borderColor: brandColor + '80', color: '#fff' }
                : { backgroundColor: S.input, borderColor: S.border, color: S.muted }}>
              {n}×/semana
            </button>
          ))}
        </div>
      </div>

      {/* Foco do mês */}
      <div>
        <Label>Foco / tema principal do mês (opcional)</Label>
        <Input value={focus} onChange={setFocus} placeholder="Ex: Lançamento do kit verão, Aniversário da marca, Liquidação de inverno…" />
      </div>

      {/* Tom */}
      <div>
        <Label>Tom de voz / ajustes (opcional)</Label>
        <Input value={tom} onChange={setTom} placeholder="Ex: mais urgente, tom científico, evitar humor…" />
      </div>

      {/* Segmentações */}
      <div>
        <Label>Segmentações a rotacionar</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SEG_PRESETS.map(s => {
            const on = segs.includes(s)
            return (
              <button key={s} type="button" onClick={() => toggleSeg(s)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all"
                style={on
                  ? { backgroundColor: brandColor + '22', borderColor: brandColor + '80', color: '#fff' }
                  : { backgroundColor: 'transparent', borderColor: S.border, color: S.muted }}>
                {on ? '✓ ' : ''}{s}
              </button>
            )
          })}
        </div>
        {segs.filter(s => !SEG_PRESETS.includes(s)).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {segs.filter(s => !SEG_PRESETS.includes(s)).map(s => (
              <span key={s} className="px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1"
                style={{ backgroundColor: brandColor + '22', borderColor: brandColor + '80', color: '#fff' }}>
                ✓ {s}
                <button type="button" onClick={() => toggleSeg(s)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input type="text" value={customSeg} onChange={e => setCustomSeg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSeg() } }}
            placeholder="+ Adicionar segmentação customizada"
            className="flex-1 text-xs rounded-lg px-3 py-2 focus:outline-none"
            style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff' }} />
          <button type="button" onClick={addCustomSeg}
            className="px-3 py-2 rounded-lg text-xs border transition-colors"
            style={{ borderColor: S.border, color: S.muted }}>
            Adicionar
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 pt-1">
        <Check checked={includePilares} onChange={setIncludePilares}
          label="Marcar pilares automaticamente em datas comerciais (Black Friday, Dia das Mães, etc.)" />
        <Check checked={startFromToday} onChange={setStartFromToday}
          label="Gerar apenas a partir de hoje (ignorar datas passadas)" />
        <Check checked={overwrite} onChange={setOverwrite} danger
          label="Sobrescrever entradas já existentes nas datas geradas" />
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-xs"
          style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#f87171' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function Label({ children }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: S.faint }}>
      {children}
    </label>
  )
}

function Input({ value, onChange, placeholder }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none transition-all"
      style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff' }}
      onFocus={e => { e.target.style.borderColor = '#3a3a48' }}
      onBlur={e => { e.target.style.borderColor = S.border }} />
  )
}

function Check({ checked, onChange, label, danger }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <span className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
        style={checked
          ? { backgroundColor: danger ? '#ef4444' : '#6366f1', borderColor: danger ? '#ef4444' : '#6366f1' }
          : { backgroundColor: S.input, borderColor: S.border }}>
        {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
      <span className={`text-xs ${danger ? 'text-[#f87171]' : 'text-[#c4c4d0]'} group-hover:text-white transition-colors`}>
        {label}
      </span>
    </label>
  )
}

/* ── Loading step ───────────────────────────────────────────────────── */
function LoadingBody({ brandColor }) {
  return (
    <div className="p-10 text-center">
      <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
        style={{
          background: `conic-gradient(${brandColor}, transparent)`,
          maskImage: 'radial-gradient(circle, transparent 55%, #000 56%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 55%, #000 56%)',
        }} />
      <p className="text-sm text-white font-semibold mb-1">Gerando calendário com IA…</p>
      <p className="text-xs" style={{ color: S.muted }}>
        Analisando Cérebro, cruzando feriados e distribuindo ao longo do mês. Isso pode levar 15-40s.
      </p>
    </div>
  )
}

/* ── Preview step ───────────────────────────────────────────────────── */
function PreviewBody({ generated, selected, toggleEntry, channel, brandColor, saving, error }) {
  const sorted = [...generated].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="p-5 space-y-3">
      <p className="text-xs" style={{ color: S.muted }}>
        Revise e desmarque qualquer entrada que não quer salvar. Depois de salvar, você pode editar cada uma clicando no dia do calendário.
      </p>

      {error && (
        <div className="px-3 py-2 rounded-lg text-xs"
          style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#f87171' }}>
          {error}
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(e => {
          const on = selected.has(e.date)
          return (
            <div key={e.date}
              onClick={() => !saving && toggleEntry(e.date)}
              className="rounded-xl border p-3 cursor-pointer transition-all"
              style={{
                backgroundColor: on ? '#17171f' : S.input,
                borderColor:     on ? brandColor + '50' : S.border,
                opacity:         on ? 1 : 0.4,
              }}>
              <div className="flex items-start gap-3">
                {/* Checkbox + date */}
                <div className="shrink-0 pt-0.5">
                  <span className="w-4 h-4 rounded border flex items-center justify-center"
                    style={on
                      ? { backgroundColor: brandColor, borderColor: brandColor }
                      : { backgroundColor: 'transparent', borderColor: S.border }}>
                    {on && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header line */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-white font-mono">
                      {formatDateBR(e.date)}
                    </span>
                    {e.acao_comercial && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: brandColor + '30', color: brandColor }}>
                        ★ Pilar
                      </span>
                    )}
                    {channel === 'email' && e.horario && (
                      <span className="text-[10px] font-mono" style={{ color: S.muted }}>{e.horario}</span>
                    )}
                    {e.segmentacao && (
                      <span className="text-[10px]" style={{ color: S.muted }}>· {e.segmentacao}</span>
                    )}
                  </div>

                  {/* Tema */}
                  <p className="text-sm font-semibold text-white leading-snug mb-1 truncate">
                    {e.tema || '(sem tema)'}
                  </p>

                  {/* Email fields */}
                  {channel === 'email' && (e.assunto || e.preheader) && (
                    <div className="text-[11px] mb-1" style={{ color: '#8b8ba0' }}>
                      {e.assunto && <p className="truncate"><span style={{ color: S.muted }}>Assunto:</span> {e.assunto}</p>}
                      {e.preheader && <p className="truncate"><span style={{ color: S.muted }}>Preheader:</span> {e.preheader}</p>}
                    </div>
                  )}

                  {/* Descrição */}
                  {e.descricao && (
                    <p className="text-[11px] leading-relaxed" style={{ color: '#8b8ba0' }}>
                      {e.descricao}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDateBR(iso) {
  const [y, m, d] = iso.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const wd = ['dom','seg','ter','qua','qui','sex','sáb'][date.getDay()]
  return `${d}/${m} · ${wd}`
}
