import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CHANNELS = [
  { key: 'email',    label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'vip',      label: 'Grupo VIP' },
]

const WEEKDAYS    = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: '#a0aec0' },
  criado:   { label: 'Criado',   color: '#4299e1' },
  enviado:  { label: 'Enviado',  color: '#48bb78' },
}

const MENSURACAO_OPTIONS = [
  { value: 'cupom_utm_tool',  label: 'Cupom + UTM + Tool Assignment' },
  { value: 'cupom',           label: 'Cupom' },
  { value: 'utm',             label: 'UTM' },
  { value: 'utm_tool',        label: 'UTM + Tool Assignment' },
  { value: 'cupom_tool',      label: 'Cupom + Tool Assignment' },
  { value: 'tool',            label: 'Apenas Tool Assignment' },
]

const EMAIL_ROWS = [
  { key: 'segmentacao',       label: 'Segmentação' },
  { key: 'tema',              label: 'Tema' },
  { key: 'descricao',         label: 'Descrição' },
  { key: 'assunto',           label: 'Assunto' },
  { key: 'preheader',         label: 'Preheader' },
  { key: 'link_copy',         label: 'Copy / Link' },
  { key: 'metodo_mensuracao', label: 'Mensuração' },
  { key: 'email_thumbnail',   label: 'Miniatura' },
  { key: 'observacoes',       label: 'Observações' },
  { key: 'status',            label: 'Status' },
]

const WHATSAPP_ROWS = [
  { key: 'segmentacao',       label: 'Segmentação' },
  { key: 'tema',              label: 'Tema' },
  { key: 'descricao',         label: 'Descrição' },
  { key: 'link_copy',         label: 'Copy / Link' },
  { key: 'tipo_template',     label: 'Tipo Template' },
  { key: 'tamanho_base',      label: 'Tamanho Base' },
  { key: 'investimento',      label: 'Investimento Est.' },
  { key: 'metodo_mensuracao', label: 'Mensuração' },
  { key: 'observacoes',       label: 'Observações' },
  { key: 'status',            label: 'Status' },
]

const VIP_ROWS = [
  { key: 'segmentacao',       label: 'Segmentação' },
  { key: 'tema',              label: 'Tema' },
  { key: 'descricao',         label: 'Descrição' },
  { key: 'link_copy',         label: 'Copy / Link' },
  { key: 'metodo_mensuracao', label: 'Mensuração' },
  { key: 'observacoes',       label: 'Observações' },
  { key: 'status',            label: 'Status' },
]

const EMPTY_ENTRY = {
  tema: '', descricao: '', assunto: '', preheader: '',
  link_copy: '', observacoes: '', status: 'pendente',
  segmentacao: '', metodo_mensuracao: '',
  acao_comercial: false,
  tipo_template: 'marketing', tamanho_base: '',
  email_thumbnail: '',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDow(year, month, day) {
  return new Date(year, month, day).getDay()
}

function getWeeks(year, month) {
  const total = getDaysInMonth(year, month)
  const weeks = []
  let week = Array(7).fill(null)
  for (let day = 1; day <= total; day++) {
    const dow = getDow(year, month, day)
    week[dow] = day
    if (dow === 6 || day === total) {
      weeks.push([...week])
      week = Array(7).fill(null)
    }
  }
  return weeks
}

function calcInvestimento(tipo, base) {
  if (!base || isNaN(parseFloat(base))) return null
  const rate = tipo === 'utilidade' ? 0.06 : 0.35
  return (parseFloat(base) * rate * 1.1215).toFixed(2)
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getMensuracaoLabel(value) {
  return MENSURACAO_OPTIONS.find(o => o.value === value)?.label || value || '—'
}

// ─── theme ────────────────────────────────────────────────────────────────────

const DARK = {
  root:         'bg-gray-950 text-white',
  surface:      'bg-gray-900',
  surfaceMid:   'bg-gray-800',
  border:       'border-gray-800',
  borderStrong: 'border-gray-700',
  text:         'text-white',
  textMuted:    'text-gray-400',
  textFaint:    'text-gray-600',
  cellBase:     'bg-gray-950',
  cellWeekend:  'bg-gray-900/60',
  cellEmpty:    'bg-gray-900/20',
  cellHover:    'hover:bg-gray-800/60',
  rowLabel:     'bg-gray-900',
  inputCls:     'bg-gray-800 border-gray-700 text-white placeholder-gray-600',
  modalBg:      'bg-gray-900 border-gray-700',
  btnSecondary: 'border-gray-700 text-gray-400 hover:text-white',
  tabInactive:  'text-gray-500 hover:text-gray-200',
  weekBand:     'bg-gray-900',
  weekBandText: 'text-gray-500',
  themeIcon:    '☀️',
  themeLabel:   'Modo claro',
  pilarRow:     'bg-gray-900',
  selectCls:    'bg-gray-800 border-gray-700 text-white',
}

const LIGHT = {
  root:         'text-stone-900',
  surface:      'bg-white',
  surfaceMid:   'bg-stone-100',
  border:       'border-stone-200',
  borderStrong: 'border-stone-300',
  text:         'text-stone-900',
  textMuted:    'text-stone-500',
  textFaint:    'text-stone-400',
  cellBase:     'bg-white',
  cellWeekend:  'bg-stone-50',
  cellEmpty:    'bg-stone-100/50',
  cellHover:    'hover:bg-amber-50/60',
  rowLabel:     'bg-stone-50',
  inputCls:     'bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400',
  modalBg:      'bg-white border-stone-200',
  btnSecondary: 'border-stone-200 text-stone-500 hover:text-stone-900',
  tabInactive:  'text-stone-500 hover:text-stone-800',
  weekBand:     'bg-stone-900',
  weekBandText: 'text-stone-400',
  themeIcon:    '🌙',
  themeLabel:   'Modo escuro',
  pilarRow:     'bg-stone-50',
  selectCls:    'bg-stone-50 border-stone-200 text-stone-900',
}

// ─── component ────────────────────────────────────────────────────────────────

export default function CalendarView({
  clientId,
  isAdmin    = false,
  brandColor = '#E8642A',
  brandFont  = null,
}) {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth())
  const [channel, setChannel] = useState('email')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark]   = useState(() => {
    try { return localStorage.getItem('rc_theme') !== 'light' } catch { return true }
  })

  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(EMPTY_ENTRY)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [modalError, setModalErr] = useState('')

  const t = isDark ? DARK : LIGHT
  const rows = channel === 'email' ? EMAIL_ROWS
    : channel === 'whatsapp' ? WHATSAPP_ROWS
    : VIP_ROWS

  // load brand font dynamically
  useEffect(() => {
    if (!brandFont) return
    const id = 'rc-brand-font'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id   = id
    link.rel  = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(brandFont)}:wght@400;500;600;700&display=swap`
    document.head.appendChild(link)
  }, [brandFont])

  function toggleTheme() {
    setIsDark(d => {
      try { localStorage.setItem('rc_theme', d ? 'light' : 'dark') } catch {}
      return !d
    })
  }

  // ── data ──────────────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('calendar_entries')
      .select('*')
      .eq('client_id', clientId)
      .eq('channel', channel)
      .gte('date', formatDate(year, month, 1))
      .lte('date', formatDate(year, month, getDaysInMonth(year, month)))
    if (!error) setEntries(data || [])
    setLoading(false)
  }, [clientId, year, month, channel])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  function getEntry(day) {
    return entries.find(e => e.date === formatDate(year, month, day)) || null
  }

  // ── nav ───────────────────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  // ── modal ─────────────────────────────────────────────────────────────────

  function openModal(day) {
    if (!isAdmin) return
    const entry = getEntry(day)
    setModal({ date: formatDate(year, month, day), entry })
    setForm(entry ? {
      tema:              entry.tema              || '',
      descricao:         entry.descricao         || '',
      assunto:           entry.assunto           || '',
      preheader:         entry.preheader         || '',
      link_copy:         entry.link_copy         || '',
      observacoes:       entry.observacoes       || '',
      status:            entry.status            || 'pendente',
      segmentacao:       entry.segmentacao       || '',
      metodo_mensuracao: entry.metodo_mensuracao || '',
      acao_comercial:    entry.acao_comercial    ?? false,
      tipo_template:     entry.tipo_template     || 'marketing',
      tamanho_base:      entry.tamanho_base      != null ? String(entry.tamanho_base) : '',
      email_thumbnail:   entry.email_thumbnail   || '',
    } : { ...EMPTY_ENTRY })
    setModalErr('')
  }

  function closeModal() { setModal(null); setModalErr('') }

  async function handleSave() {
    if (!modal) return
    setSaving(true); setModalErr('')
    const payload = {
      client_id: clientId,
      date: modal.date,
      channel,
      ...form,
      tamanho_base: form.tamanho_base !== '' ? parseInt(form.tamanho_base, 10) : null,
    }
    let error
    if (modal.entry?.id) {
      ;({ error } = await supabase.from('calendar_entries').update(payload).eq('id', modal.entry.id))
    } else {
      ;({ error } = await supabase.from('calendar_entries').insert(payload))
    }
    if (error) setModalErr(error.message)
    else { await fetchEntries(); closeModal() }
    setSaving(false)
  }

  async function handleDelete() {
    if (!modal?.entry?.id) return
    if (!window.confirm('Excluir esta entrada?')) return
    setDeleting(true)
    const { error } = await supabase.from('calendar_entries').delete().eq('id', modal.entry.id)
    if (!error) { await fetchEntries(); closeModal() }
    setDeleting(false)
  }

  const today    = new Date()
  const isToday  = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const weeks    = getWeeks(year, month)
  const chLabel  = CHANNELS.find(c => c.key === channel)?.label || channel
  const fontStyle = brandFont ? { fontFamily: `'${brandFont}', sans-serif` } : {}
  const rootBg = isDark ? '#030712' : '#f6f4f0'

  // count pilares in current month for legend
  const pilaresCount = entries.filter(e => e.acao_comercial).length

  return (
    <div
      className={`flex flex-col h-full transition-colors duration-200 ${t.root}`}
      style={{ ...fontStyle, backgroundColor: rootBg }}
    >
      {/* ── Controls ── */}
      <div
        className={`flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-b ${t.border} shrink-0`}
        style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}
      >
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <NavBtn onClick={prevMonth} isDark={isDark}>←</NavBtn>
          <span className={`font-semibold text-base min-w-[172px] text-center tracking-tight ${t.text}`}>
            {MONTH_NAMES[month]} {year}
          </span>
          <NavBtn onClick={nextMonth} isDark={isDark}>→</NavBtn>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Channel tabs */}
          <div
            className={`flex gap-1 p-1 rounded-xl ${t.surfaceMid}`}
            style={!isDark ? { backgroundColor: '#ede9e3' } : {}}
          >
            {CHANNELS.map((ch) => (
              <button
                key={ch.key}
                onClick={() => setChannel(ch.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  channel === ch.key ? 'text-white shadow-sm' : t.tabInactive
                }`}
                style={channel === ch.key ? { backgroundColor: brandColor } : {}}
              >
                {ch.label}
              </button>
            ))}
          </div>

          {/* Pilares badge */}
          {pilaresCount > 0 && (
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
              style={{ backgroundColor: brandColor + 'cc' }}
            >
              🏛 {pilaresCount} {pilaresCount === 1 ? 'pilar' : 'pilares'}
            </span>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={t.themeLabel}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border ${t.border} ${t.textMuted} transition-colors`}
            style={!isDark ? { backgroundColor: '#fff', borderColor: '#ddd8d0' } : {}}
          >
            {t.themeIcon}
          </button>
        </div>

        {loading && <span className={`text-xs ${t.textFaint}`}>Carregando…</span>}
      </div>

      {/* ── Weekly calendar ── */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: 900 }}>
          {weeks.map((week, wi) => {
            const valid    = week.filter(Boolean)
            const firstDay = valid[0]
            const lastDay  = valid[valid.length - 1]
            const range    = firstDay === lastDay
              ? `${firstDay} de ${MONTH_NAMES[month]}`
              : `${firstDay} a ${lastDay} de ${MONTH_NAMES[month]}`

            // check if any day in this week is a pilar
            const weekHasPilar = valid.some(day => getEntry(day)?.acao_comercial)

            return (
              <div key={wi} className={wi > 0 ? 'mt-4' : ''}>

                {/* ── Week band ── */}
                <div
                  className="flex items-center gap-3 px-5 py-2.5"
                  style={isDark ? { backgroundColor: '#111827' } : { backgroundColor: '#1c1917' }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    Semana {wi + 1}
                  </span>
                  <span className="text-xs text-stone-400">{range}</span>
                  {weekHasPilar && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: '#f59e0b' }}>
                      🏛 Ação Comercial
                    </span>
                  )}
                </div>

                {/* ── Week table ── */}
                <table className="border-collapse w-full">
                  <thead>
                    <tr>
                      <th
                        className={`sticky left-0 z-20 border-b border-r ${t.border}`}
                        style={{
                          minWidth: 130, width: 130,
                          padding: '10px 14px',
                          borderLeft: `3px solid ${brandColor}55`,
                          ...(isDark ? { backgroundColor: '#0f172a' } : { backgroundColor: '#f5f2ec' }),
                        }}
                      >
                        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${t.textFaint}`}>Campo</span>
                      </th>

                      {week.map((day, ci) => {
                        const isWknd   = ci === 0 || ci === 6
                        const td       = day && isToday(day)
                        const isPilar  = day && getEntry(day)?.acao_comercial

                        return (
                          <th
                            key={ci}
                            className={`border-b border-r ${t.border} px-2 py-3 text-center
                              ${!day ? t.cellEmpty : isWknd ? t.cellWeekend : t.cellBase}`}
                            style={{
                              minWidth: 120,
                              width: `${100 / 7}%`,
                              ...(!day && !isDark ? { backgroundColor: '#ece9e3' } : {}),
                              ...(isWknd && !isDark && day ? { backgroundColor: '#f5f2ed' } : {}),
                              ...(isPilar ? {
                                borderTop: `3px solid #f59e0b`,
                                backgroundColor: isDark ? '#1c1a0a' : '#fefce8',
                              } : {}),
                            }}
                          >
                            {day && (
                              <div className="flex flex-col items-center gap-0.5">
                                {isPilar && (
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500 mb-0.5">
                                    ★ Pilar
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${isWknd ? t.textFaint : t.textMuted}`}>
                                  {WEEKDAYS[ci]}
                                </span>
                                <span
                                  className={`text-sm font-bold px-1.5 rounded-lg ${isWknd ? t.textMuted : t.text}`}
                                  style={td ? { color: brandColor } : {}}
                                >
                                  {day}/{String(month + 1).padStart(2, '0')}
                                </span>
                              </div>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key}>
                        {/* Sticky row label */}
                        <td
                          className={`sticky left-0 z-10 border-b border-r ${t.borderStrong}`}
                          style={{
                            minWidth: 130, width: 130,
                            padding: '10px 14px',
                            borderLeft: `3px solid ${brandColor}55`,
                            ...(isDark
                              ? { backgroundColor: '#0f172a' }
                              : { backgroundColor: '#f5f2ec' }),
                          }}
                        >
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>
                            {row.label}
                          </span>
                        </td>

                        {week.map((day, ci) => {
                          const isWknd  = ci === 0 || ci === 6
                          const entry   = day ? getEntry(day) : null
                          const td      = day && isToday(day)
                          const isPilar = day && entry?.acao_comercial

                          return (
                            <td
                              key={ci}
                              onClick={() => day && openModal(day)}
                              className={`border-b border-r ${t.border} px-2 py-2 align-middle transition-colors
                                ${!day ? t.cellEmpty : isWknd ? t.cellWeekend : t.cellBase}
                                ${day && isAdmin ? `cursor-pointer ${t.cellHover}` : ''}
                              `}
                              style={{
                                minWidth: 120,
                                minHeight: 40,
                                textAlign: 'center',
                                ...(!day && !isDark ? { backgroundColor: '#ece9e3' } : {}),
                                ...(isWknd && !isDark && day ? { backgroundColor: '#f5f2ed' } : {}),
                                ...(td ? { outline: `2px solid ${brandColor}40`, outlineOffset: '-2px' } : {}),
                                ...(isPilar ? { backgroundColor: isDark ? '#1c1a0a' : '#fefce8' } : {}),
                              }}
                            >
                              {day && (
                                <Cell
                                  rowKey={row.key}
                                  entry={entry}
                                  channel={channel}
                                  isAdmin={isAdmin}
                                  brandColor={brandColor}
                                  t={t}
                                  isDark={isDark}
                                />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div
        className={`flex items-center gap-5 flex-wrap px-6 py-3 border-t ${t.border} shrink-0`}
        style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}
      >
        {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.color }} />
            <span className={`text-xs ${t.textFaint}`}>{conf.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className={`text-xs ${t.textFaint}`}>Pilar / Ação Comercial</span>
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className={`${t.modalBg} border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}
            style={{
              ...fontStyle,
              boxShadow: isDark
                ? '0 25px 60px rgba(0,0,0,0.6)'
                : '0 25px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${t.textFaint}`}>
                  {chLabel} — {modal.date}
                </p>
                <p className={`font-bold text-base mt-0.5 ${t.text}`}>
                  {modal.entry ? 'Editar entrada' : 'Nova entrada'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Pilar toggle */}
                {isAdmin && (
                  <button
                    onClick={() => setForm(f => ({ ...f, acao_comercial: !f.acao_comercial }))}
                    title="Marcar como Ação Comercial / Pilar"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      form.acao_comercial
                        ? 'border-amber-500 text-amber-500 bg-amber-50'
                        : `${t.border} ${t.textFaint}`
                    }`}
                  >
                    {form.acao_comercial ? '★ Pilar' : '☆ Pilar'}
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xl leading-none ${t.textMuted}`}
                >×</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {modalError && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">{modalError}</div>
              )}

              {/* Ação comercial banner */}
              {form.acao_comercial && (
                <div className="px-3 py-2 rounded-lg border border-amber-400 bg-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-2">
                  🏛 Este dia está marcado como <strong>Ação Comercial / Pilar</strong>
                </div>
              )}

              <MField label="Segmentação" t={t}>
                <MInput isAdmin={isAdmin} value={form.segmentacao} placeholder="Ex: Ativos 90d, Desengajados, Toda base…"
                  onChange={v => setForm(f => ({ ...f, segmentacao: v }))} t={t} brandColor={brandColor} />
              </MField>

              <MField label="Tema" t={t}>
                <MInput isAdmin={isAdmin} value={form.tema} placeholder="Ex: Black Friday — oferta relâmpago"
                  onChange={v => setForm(f => ({ ...f, tema: v }))} t={t} brandColor={brandColor} />
              </MField>

              <MField label="Descrição" t={t}>
                <MTextarea isAdmin={isAdmin} value={form.descricao} rows={3} placeholder="Descreva o conteúdo…"
                  onChange={v => setForm(f => ({ ...f, descricao: v }))} t={t} brandColor={brandColor} />
              </MField>

              {channel === 'email' && (
                <>
                  <MField label="Assunto" t={t}>
                    <MInput isAdmin={isAdmin} value={form.assunto} placeholder="Linha de assunto do e-mail"
                      onChange={v => setForm(f => ({ ...f, assunto: v }))} t={t} brandColor={brandColor} />
                  </MField>
                  <MField label="Preheader" t={t}>
                    <MInput isAdmin={isAdmin} value={form.preheader} placeholder="Texto de preview"
                      onChange={v => setForm(f => ({ ...f, preheader: v }))} t={t} brandColor={brandColor} />
                  </MField>
                </>
              )}

              <MField label="Copy / Link" t={t}>
                <MInput isAdmin={isAdmin} value={form.link_copy} placeholder="https://…"
                  onChange={v => setForm(f => ({ ...f, link_copy: v }))} t={t} brandColor={brandColor} />
              </MField>

              {/* WhatsApp-specific */}
              {channel === 'whatsapp' && (
                <>
                  <MField label="Tipo de Template" t={t}>
                    {isAdmin ? (
                      <div className="flex gap-2">
                        {[
                          { value: 'marketing', label: 'Marketing', color: '#8b5cf6' },
                          { value: 'utilidade', label: 'Utilidade', color: '#06b6d4' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setForm(f => ({ ...f, tipo_template: opt.value }))}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all`}
                            style={form.tipo_template === opt.value
                              ? { backgroundColor: opt.color, borderColor: opt.color, color: '#fff' }
                              : { borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#9ca3af' : '#6b7280' }
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm ${t.text} capitalize`}>{form.tipo_template || '—'}</p>
                    )}
                  </MField>

                  <MField label="Tamanho da Base" t={t}>
                    <MInput isAdmin={isAdmin} value={form.tamanho_base} placeholder="Ex: 5000"
                      onChange={v => setForm(f => ({ ...f, tamanho_base: v.replace(/\D/g, '') }))}
                      t={t} brandColor={brandColor} />
                  </MField>

                  {form.tamanho_base && (
                    <div
                      className="px-4 py-3 rounded-xl border text-sm"
                      style={{
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                      }}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${t.textFaint}`}>
                        Investimento Estimado
                      </p>
                      <p className={`font-bold text-base ${t.text}`}>
                        {formatBRL(calcInvestimento(form.tipo_template, form.tamanho_base))}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${t.textFaint}`}>
                        {form.tipo_template === 'utilidade'
                          ? `Base × R$0,06 + 12,15% impostos`
                          : `Base × R$0,35 + 12,15% impostos`
                        }
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Método de mensuração */}
              <MField label="Método de Mensuração" t={t}>
                {isAdmin ? (
                  <select
                    value={form.metodo_mensuracao}
                    onChange={e => setForm(f => ({ ...f, metodo_mensuracao: e.target.value }))}
                    onFocus={e => {
                      e.target.style.borderColor = brandColor
                      e.target.style.boxShadow   = `0 0 0 3px ${brandColor}25`
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = ''
                      e.target.style.boxShadow   = ''
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all ${t.inputCls}`}
                  >
                    <option value="">Selecionar método…</option>
                    {MENSURACAO_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className={`text-sm ${t.text}`}>{getMensuracaoLabel(form.metodo_mensuracao)}</p>
                )}
              </MField>

              {/* Email thumbnail */}
              {channel === 'email' && (
                <MField label="Miniatura do Email (URL)" t={t}>
                  <MInput isAdmin={isAdmin} value={form.email_thumbnail} placeholder="https://… (URL da imagem do email)"
                    onChange={v => setForm(f => ({ ...f, email_thumbnail: v }))} t={t} brandColor={brandColor} />
                  {form.email_thumbnail && (
                    <div className="mt-2 rounded-lg overflow-hidden border" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                      <img
                        src={form.email_thumbnail}
                        alt="Miniatura do email"
                        className="w-full object-cover max-h-48"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                </MField>
              )}

              <MField label="Observações" t={t}>
                <MTextarea isAdmin={isAdmin} value={form.observacoes} rows={2} placeholder="Notas adicionais…"
                  onChange={v => setForm(f => ({ ...f, observacoes: v }))} t={t} brandColor={brandColor} />
              </MField>

              <MField label="Status" t={t}>
                {isAdmin ? (
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                      <button key={key}
                        onClick={() => setForm(f => ({ ...f, status: key }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          form.status === key
                            ? 'border-transparent text-white'
                            : `${t.border} ${t.textMuted}`
                        }`}
                        style={form.status === key ? { backgroundColor: conf.color } : {}}
                      >
                        <span className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: form.status === key ? '#fff' : conf.color }} />
                        {conf.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[form.status]?.color }} />
                    <span className={`text-sm ${t.text}`}>{STATUS_CONFIG[form.status]?.label || '—'}</span>
                  </div>
                )}
              </MField>
            </div>

            {isAdmin ? (
              <div className={`flex items-center justify-between px-6 py-4 border-t ${t.border}`}>
                <div>
                  {modal.entry?.id && (
                    <button onClick={handleDelete} disabled={deleting}
                      className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors disabled:opacity-50">
                      {deleting ? 'Excluindo…' : 'Excluir'}
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={closeModal}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${t.btnSecondary}`}>
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: brandColor }}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`px-6 py-4 border-t ${t.border}`}>
                <button onClick={closeModal}
                  className={`w-full px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${t.btnSecondary}`}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NavBtn ───────────────────────────────────────────────────────────────────

function NavBtn({ onClick, isDark, children }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
      style={{
        border: `1px solid ${isDark ? '#374151' : '#ddd8d0'}`,
        color: isDark ? '#9ca3af' : '#78716c',
        backgroundColor: isDark ? 'transparent' : '#fff',
      }}
    >
      {children}
    </button>
  )
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

function Cell({ rowKey, entry, channel, isAdmin, brandColor, t, isDark }) {
  if (!entry) {
    return (
      <div className="min-h-[32px] flex items-center justify-center">
        {isAdmin && rowKey === 'tema' && (
          <span className={`text-[11px] ${t.textFaint} opacity-50`}>+</span>
        )}
      </div>
    )
  }

  if (rowKey === 'status') {
    const conf = STATUS_CONFIG[entry.status]
    if (!conf) return <div className="min-h-[32px]" />
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: conf.color + '22', color: conf.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: conf.color }} />
          {conf.label}
        </span>
      </div>
    )
  }

  if (rowKey === 'tipo_template') {
    if (!entry.tipo_template) return <div className="min-h-[32px]" />
    const isMarketing = entry.tipo_template === 'marketing'
    return (
      <div className="flex justify-center">
        <span
          className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold capitalize tracking-wide"
          style={{
            backgroundColor: isMarketing ? '#8b5cf622' : '#06b6d422',
            color: isMarketing ? '#8b5cf6' : '#06b6d4',
          }}
        >
          {entry.tipo_template}
        </span>
      </div>
    )
  }

  if (rowKey === 'tamanho_base') {
    if (!entry.tamanho_base) return <div className="min-h-[32px]" />
    return (
      <p className={`text-xs font-semibold text-center ${t.textMuted}`}>
        {Number(entry.tamanho_base).toLocaleString('pt-BR')}
      </p>
    )
  }

  if (rowKey === 'investimento') {
    if (!entry.tamanho_base) return <div className="min-h-[32px]" />
    const val = calcInvestimento(entry.tipo_template || 'marketing', entry.tamanho_base)
    return (
      <p className="text-xs font-bold text-center" style={{ color: brandColor }}>
        {formatBRL(val)}
      </p>
    )
  }

  if (rowKey === 'metodo_mensuracao') {
    if (!entry.metodo_mensuracao) return <div className="min-h-[32px]" />
    return (
      <div className="flex justify-center">
        <span className={`text-[9px] leading-snug text-center px-1.5 py-0.5 rounded ${t.textMuted}`}
          style={{ backgroundColor: isDark ? '#ffffff0d' : '#00000008' }}>
          {getMensuracaoLabel(entry.metodo_mensuracao)}
        </span>
      </div>
    )
  }

  if (rowKey === 'email_thumbnail') {
    if (!entry.email_thumbnail) return <div className="min-h-[32px]" />
    return (
      <div className="flex justify-center">
        <img
          src={entry.email_thumbnail}
          alt="Email"
          className="rounded object-cover max-h-16 w-full"
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>
    )
  }

  let value = null
  switch (rowKey) {
    case 'segmentacao':   value = entry.segmentacao;  break
    case 'tema':          value = entry.tema;          break
    case 'descricao':     value = entry.descricao;     break
    case 'assunto':       value = channel === 'email' ? entry.assunto   : null; break
    case 'preheader':     value = channel === 'email' ? entry.preheader : null; break
    case 'link_copy':     value = entry.link_copy;     break
    case 'observacoes':   value = entry.observacoes;   break
  }

  if (!value) return <div className="min-h-[32px]" />

  const isLink = rowKey === 'link_copy' && value.startsWith('http')
  return (
    <div className="min-h-[32px] flex items-center justify-center">
      {isLink ? (
        <a href={value} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-xs underline underline-offset-2 line-clamp-2 text-center hover:opacity-70 transition-opacity"
          style={{ color: brandColor }}>
          {value}
        </a>
      ) : (
        <p className={`text-xs leading-relaxed line-clamp-3 text-center whitespace-pre-wrap ${t.textMuted}`}>
          {value}
        </p>
      )}
    </div>
  )
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function MField({ label, children, t }) {
  return (
    <div>
      <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-1.5 ${t.textFaint}`}>
        {label}
      </label>
      {children}
    </div>
  )
}

function MInput({ isAdmin, value, onChange, placeholder, t, brandColor }) {
  if (!isAdmin) return (
    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${t.text}`}>{value || '—'}</p>
  )
  return (
    <input type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onFocus={e => {
        e.target.style.borderColor = brandColor
        e.target.style.boxShadow   = `0 0 0 3px ${brandColor}25`
      }}
      onBlur={e => {
        e.target.style.borderColor = ''
        e.target.style.boxShadow   = ''
      }}
      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all ${t.inputCls}`}
    />
  )
}

function MTextarea({ isAdmin, value, onChange, placeholder, rows, t, brandColor }) {
  if (!isAdmin) return (
    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${t.text}`}>{value || '—'}</p>
  )
  return (
    <textarea value={value} placeholder={placeholder} rows={rows}
      onChange={e => onChange(e.target.value)}
      onFocus={e => {
        e.target.style.borderColor = brandColor
        e.target.style.boxShadow   = `0 0 0 3px ${brandColor}25`
      }}
      onBlur={e => {
        e.target.style.borderColor = ''
        e.target.style.boxShadow   = ''
      }}
      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all resize-none ${t.inputCls}`}
    />
  )
}
