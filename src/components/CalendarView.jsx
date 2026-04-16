import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import GenerateMonthModal from './GenerateMonthModal'
import CalendarActionsMenu from './CalendarActionsMenu'
import PlaybookModal from './PlaybookModal'
import PostMortemModal from './PostMortemModal'
import RecurringModal from './RecurringModal'
import ImportCSVModal from './ImportCSVModal'
import {
  cloneFromPreviousMonth, exportToICal, exportToCSV,
  qualityCheck, balanceCheck, bulkUpdate, bulkDelete,
} from '../lib/calendarHelpers'

const CHANNELS = [
  { key: 'email',    label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'vip',      label: 'Grupo VIP' },
]

const WEEKDAYS    = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_CONFIG = {
  pendente:  { label: 'Pendente',  color: '#a0aec0' },
  agendado:  { label: 'Agendado',  color: '#8b5cf6' },
  criado:    { label: 'Criado',    color: '#4299e1' },
  enviado:   { label: 'Enviado',   color: '#48bb78' },
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
  { key: 'horario',           label: 'Horário' },
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
  horario: '',
}

const EMPTY_RESULT = {
  res_receita: '', res_pedidos: '', res_ticket_medio: '',
  res_taxa_conversao: '', res_entregabilidade: '',
  res_base_utilizada: '', res_qtd_envios: '',
  res_print_url: '', res_notas: '',
}

const RESULT_FIELDS = [
  { key: 'res_receita',        label: 'Receita',           type: 'brl',  placeholder: '0,00' },
  { key: 'res_pedidos',        label: 'Pedidos',           type: 'int',  placeholder: '0' },
  { key: 'res_ticket_medio',   label: 'Ticket Médio',      type: 'brl',  placeholder: '0,00' },
  { key: 'res_taxa_conversao', label: 'Taxa de Conversão', type: 'pct',  placeholder: '0.0' },
  { key: 'res_entregabilidade',label: 'Entregabilidade',   type: 'pct',  placeholder: '0.0' },
  { key: 'res_base_utilizada', label: 'Base Utilizada',    type: 'int',  placeholder: '0' },
  { key: 'res_qtd_envios',     label: 'Qtd. Envios',       type: 'int',  placeholder: '0' },
]

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
  return MENSURACAO_OPTIONS.find(o => o.value === value)?.label || value || ''
}

function getOutsideDays(year, month) {
  const firstDow = getDow(year, month, 1)
  const prevY = month === 0 ? year - 1 : year
  const prevM = month === 0 ? 11 : month - 1
  const prevTotal = getDaysInMonth(prevY, prevM)
  const total = getDaysInMonth(year, month)
  const lastDow = getDow(year, month, total)
  const nextM = month === 11 ? 0 : month + 1

  const prev = {}
  for (let i = 0; i < firstDow; i++) {
    prev[i] = { day: prevTotal - firstDow + 1 + i, m: prevM }
  }
  const next = {}
  let nd = 1
  for (let i = lastDow + 1; i < 7; i++) {
    next[i] = { day: nd++, m: nextM }
  }
  return { prev, next }
}

// ─── Brazilian Holidays ───────────────────────────────────────────────────────

const FIXED_HOLIDAYS = [
  { month: 1,  day: 1,  name: 'Confraternização Universal' },
  { month: 4,  day: 21, name: 'Tiradentes' },
  { month: 5,  day: 1,  name: 'Dia do Trabalho' },
  { month: 6,  day: 12, name: 'Dia dos Namorados' },
  { month: 9,  day: 7,  name: 'Independência do Brasil' },
  { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
  { month: 11, day: 2,  name: 'Finados' },
  { month: 11, day: 15, name: 'Proclamação da República' },
  { month: 11, day: 20, name: 'Consciência Negra' },
  { month: 11, day: 25, name: 'Black Friday' },
  { month: 12, day: 25, name: 'Natal' },
]

const COMMERCE_DATES = [
  { month: 3,  day: 8,  name: "Dia da Mulher" },
  { month: 5,  day: 11, name: 'Dia das Mães' },   // 2nd Sunday May — approximate
  { month: 8,  day: 10, name: 'Dia dos Pais' },   // 2nd Sunday Aug — approximate
  { month: 10, day: 31, name: 'Halloween' },
  { month: 12, day: 20, name: 'Última semana Natal' },
]

function calcEaster(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function getBrazilianHolidays(year, month) {
  // month is 0-indexed
  const result = {}

  const add = (date, name, isCommerce = false) => {
    if (date.getFullYear() === year && date.getMonth() === month) {
      const d = date.getDate()
      if (!result[d]) result[d] = []
      result[d].push({ name, isCommerce })
    }
  }

  // Fixed
  FIXED_HOLIDAYS.forEach(h => add(new Date(year, h.month - 1, h.day), h.name))
  COMMERCE_DATES.forEach(h => add(new Date(year, h.month - 1, h.day), h.name, true))

  // Easter-based
  const easter = calcEaster(year)
  add(addDays(easter, -48), 'Carnaval (2ª)', true)
  add(addDays(easter, -47), 'Carnaval (3ª)', true)
  add(addDays(easter, -2),  'Sexta-feira Santa')
  add(easter,               'Páscoa', true)
  add(addDays(easter, 60),  'Corpus Christi')

  // Dia das Mães — 2nd Sunday of May
  if (month === 4) {
    let sundays = 0
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(year, 4, d)
      if (dt.getMonth() !== 4) break
      if (dt.getDay() === 0) { sundays++; if (sundays === 2) { add(dt, 'Dia das Mães', true); break } }
    }
  }
  // Dia dos Pais — 2nd Sunday of August
  if (month === 7) {
    let sundays = 0
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(year, 7, d)
      if (dt.getMonth() !== 7) break
      if (dt.getDay() === 0) { sundays++; if (sundays === 2) { add(dt, 'Dia dos Pais', true); break } }
    }
  }

  return result
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
  clientName = 'cliente',
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
  const [aiLoading, setAiLoading] = useState(false)
  const [modalTab, setModalTab]   = useState('planejado')
  const [result, setResult]       = useState(EMPTY_RESULT)
  const [resSaving, setResSaving] = useState(false)
  const [resSaved, setResSaved]   = useState(false)
  const [genOpen, setGenOpen]          = useState(false)
  const [genToast, setGenToast]        = useState('')
  const [playbookOpen, setPlaybookOpen] = useState(false)
  const [pmOpen, setPmOpen]            = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [importOpen, setImportOpen]    = useState(false)
  const [weekOpen, setWeekOpen]        = useState(false)
  const [bulkMode, setBulkMode]        = useState(false)
  const [bulkIds, setBulkIds]          = useState(() => new Set())
  const [bulkAction, setBulkAction]    = useState(null)
  const [variations, setVariations]    = useState(null)  // { loading, items, error }

  async function handleVariations() {
    setVariations({ loading: true, items: [], error: '' })
    try {
      const res = await fetch('/api/variations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          tema: form.tema, assunto: form.assunto, preheader: form.preheader,
          descricao: form.descricao, segmentacao: form.segmentacao,
          count: 3,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setVariations({ loading: false, items: [], error: data.error || 'Erro' }); return }
      setVariations({ loading: false, items: data.variations || [], error: '' })
    } catch (e) { setVariations({ loading: false, items: [], error: e.message }) }
  }

  function applyVariation(v) {
    setForm(f => ({ ...f, assunto: v.assunto || f.assunto, preheader: v.preheader || f.preheader }))
    setVariations(null)
  }

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

  /* Clear bulk selection when leaving month or bulk mode off */
  useEffect(() => { setBulkIds(new Set()) }, [month, year, channel, bulkMode])

  function showToast(msg) {
    setGenToast(msg)
    setTimeout(() => setGenToast(''), 3500)
  }

  async function handleAction(key) {
    if (key === 'gen_month')  return setGenOpen(true)
    if (key === 'gen_week')   return setWeekOpen(true)
    if (key === 'playbook')   return setPlaybookOpen(true)
    if (key === 'postmortem') return setPmOpen(true)
    if (key === 'recurring')  return setRecurringOpen(true)
    if (key === 'import_csv') return setImportOpen(true)
    if (key === 'bulk')       return setBulkMode(m => !m)

    if (key === 'clone_prev') {
      if (!window.confirm('Replicar entradas do mês anterior para este mês?')) return
      try {
        const { inserted, skipped } = await cloneFromPreviousMonth({ clientId, year, month, channel })
        await fetchEntries()
        showToast(`${inserted} entrada${inserted !== 1 ? 's' : ''} replicada${inserted !== 1 ? 's' : ''}${skipped ? ` · ${skipped} ignorada${skipped !== 1 ? 's' : ''} (já existia${skipped !== 1 ? 'm' : ''})` : ''}`)
      } catch (e) { showToast('Erro: ' + e.message) }
      return
    }

    if (key === 'export_csv') {
      exportToCSV({ entries, clientName, channel })
      showToast(`${entries.length} entrada${entries.length !== 1 ? 's' : ''} exportada${entries.length !== 1 ? 's' : ''} em CSV`)
      return
    }

    if (key === 'export_ical') {
      exportToICal({ entries, clientName, channel })
      showToast('Arquivo .ics baixado — importe no Google/Apple Calendar')
      return
    }
  }

  /* ── Bulk selection ── */
  function toggleBulk(entryId) {
    if (!entryId) return
    setBulkIds(prev => {
      const n = new Set(prev)
      if (n.has(entryId)) n.delete(entryId); else n.add(entryId)
      return n
    })
  }

  async function applyBulk(updates) {
    if (bulkIds.size === 0) return
    try {
      await bulkUpdate({ ids: [...bulkIds], updates })
      await fetchEntries()
      showToast(`${bulkIds.size} entrada${bulkIds.size !== 1 ? 's' : ''} atualizada${bulkIds.size !== 1 ? 's' : ''}`)
      setBulkIds(new Set())
      setBulkAction(null)
    } catch (e) { showToast('Erro: ' + e.message) }
  }

  async function deleteBulk() {
    if (bulkIds.size === 0) return
    if (!window.confirm(`Excluir ${bulkIds.size} entrada${bulkIds.size !== 1 ? 's' : ''}?`)) return
    try {
      await bulkDelete({ ids: [...bulkIds] })
      await fetchEntries()
      showToast(`${bulkIds.size} entrada${bulkIds.size !== 1 ? 's' : ''} excluída${bulkIds.size !== 1 ? 's' : ''}`)
      setBulkIds(new Set())
    } catch (e) { showToast('Erro: ' + e.message) }
  }

  /* ── Quality + balance checks (memo) ── */
  const qualityIssues = useMemo(() => qualityCheck(entries, channel), [entries, channel])
  const balanceInsights = useMemo(() => balanceCheck(entries, { month, year }), [entries, month, year])

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
    setModalTab('planejado')
    setResult(entry ? Object.fromEntries(
      Object.keys(EMPTY_RESULT).map(k => [k, entry[k] != null ? String(entry[k]) : ''])
    ) : { ...EMPTY_RESULT })
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
      horario:           entry.horario           || '',
    } : { ...EMPTY_ENTRY })
    setModalErr('')
  }

  function closeModal() { setModal(null); setModalErr(''); setResSaved(false) }

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

  async function handleAISuggest(mode = 'fill') {
    setAiLoading(true)
    setModalErr('')
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tema: form.tema,
          channel,
          date: modal?.date,
          acao_comercial: form.acao_comercial,
          client_id: clientId,
          /* Send current values so AI only fills what's empty (mode=fill) */
          segmentacao: form.segmentacao,
          descricao:   form.descricao,
          assunto:     form.assunto,
          preheader:   form.preheader,
          link_copy:   form.link_copy,
          observacoes: form.observacoes,
          horario:     form.horario,
          metodo_mensuracao: form.metodo_mensuracao,
          mode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setModalErr((data.error || 'Erro ao gerar sugestão') + (data.detail ? ': ' + data.detail : ''))
      } else {
        setForm(f => ({
          ...f,
          tema:        data.tema        || f.tema,
          segmentacao: data.segmentacao || f.segmentacao,
          descricao:   data.descricao   || f.descricao,
          assunto:     data.assunto     || f.assunto,
          preheader:   data.preheader   || f.preheader,
          observacoes: data.observacoes || f.observacoes,
          horario:     data.horario     || f.horario,
          metodo_mensuracao: data.metodo_mensuracao || f.metodo_mensuracao,
        }))
      }
    } catch (e) {
      setModalErr('Erro de conexão com a IA')
    }
    setAiLoading(false)
  }

  async function handleSaveResult() {
    if (!modal?.entry?.id) return
    setResSaving(true)
    const payload = Object.fromEntries(
      Object.keys(EMPTY_RESULT).map(k => [
        k,
        k === 'res_print_url' || k === 'res_notas'
          ? result[k] || null
          : result[k] !== '' ? parseFloat(result[k]) : null
      ])
    )
    await supabase.from('calendar_entries').update(payload).eq('id', modal.entry.id)
    await fetchEntries()
    setResSaving(false)
    setResSaved(true)
    setTimeout(() => setResSaved(false), 2500)
  }

  const today        = new Date()
  const isToday      = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const weeks        = getWeeks(year, month)
  const outsideDays  = getOutsideDays(year, month)
  const holidaysMap  = getBrazilianHolidays(year, month)
  const lastWeekIdx = weeks.length - 1

  // ── Monthly results BI ────────────────────────────────────────────────────
  const resultEntries = entries.filter(e => e.res_receita != null || e.res_pedidos != null)
  const biReceita   = resultEntries.reduce((s, e) => s + (parseFloat(e.res_receita) || 0), 0)
  const biPedidos   = resultEntries.reduce((s, e) => s + (parseFloat(e.res_pedidos) || 0), 0)
  const biEnvios    = resultEntries.reduce((s, e) => s + (parseFloat(e.res_qtd_envios) || 0), 0)
  const biConvArr   = resultEntries.filter(e => e.res_taxa_conversao != null).map(e => parseFloat(e.res_taxa_conversao))
  const biConv      = biConvArr.length ? biConvArr.reduce((s, v) => s + v, 0) / biConvArr.length : null
  const biEntArr    = resultEntries.filter(e => e.res_entregabilidade != null).map(e => parseFloat(e.res_entregabilidade))
  const biEnt       = biEntArr.length ? biEntArr.reduce((s, v) => s + v, 0) / biEntArr.length : null
  const biTicket    = biReceita > 0 && biPedidos > 0 ? biReceita / biPedidos : null
  const hasBiData   = resultEntries.length > 0
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

          {/* Ações (IA + utilitários) — admin only */}
          {isAdmin && (
            <CalendarActionsMenu brandColor={brandColor} onAction={handleAction} />
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

      {/* ── Bulk mode bar ── */}
      {isAdmin && bulkMode && (
        <div className="shrink-0 flex items-center justify-between flex-wrap gap-3 px-6 py-2.5 border-b"
          style={{ borderColor: isDark ? '#1f2937' : '#e5e7eb', backgroundColor: brandColor + '18' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: brandColor }}>
              ✓ Modo seleção
            </span>
            <span className="text-xs" style={{ color: isDark ? '#c4c4d0' : '#374151' }}>
              <span className="font-bold">{bulkIds.size}</span> selecionada{bulkIds.size !== 1 ? 's' : ''} · Clique nos dias para marcar
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {bulkIds.size > 0 && (
              <>
                <BulkBtn onClick={() => applyBulk({ status: 'agendado' })} isDark={isDark}>→ Agendado</BulkBtn>
                <BulkBtn onClick={() => applyBulk({ status: 'criado' })} isDark={isDark}>→ Criado</BulkBtn>
                <BulkBtn onClick={() => applyBulk({ status: 'enviado' })} isDark={isDark}>→ Enviado</BulkBtn>
                <BulkBtn onClick={() => {
                  const seg = window.prompt('Nova segmentação para todas:')
                  if (seg != null) applyBulk({ segmentacao: seg })
                }} isDark={isDark}>Segmentação…</BulkBtn>
                {channel === 'email' && (
                  <BulkBtn onClick={() => {
                    const h = window.prompt('Novo horário (HH:MM):')
                    if (h) applyBulk({ horario: h })
                  }} isDark={isDark}>Horário…</BulkBtn>
                )}
                <BulkBtn onClick={deleteBulk} isDark={isDark} danger>Excluir</BulkBtn>
              </>
            )}
            <BulkBtn onClick={() => { setBulkIds(new Set()); setBulkMode(false) }} isDark={isDark}>✕ Sair</BulkBtn>
          </div>
        </div>
      )}

      {/* ── Quality & balance insights ── */}
      {isAdmin && !bulkMode && (qualityIssues.length > 0 || balanceInsights.length > 0) && (
        <div className="shrink-0 flex items-center gap-2 flex-wrap px-6 py-2 border-b"
          style={{ borderColor: isDark ? '#1f2937' : '#e5e7eb', backgroundColor: isDark ? '#0e0e18' : '#fcfaf5' }}>
          <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: '#555568' }}>
            ⚡ Insights
          </span>
          {qualityIssues.length > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}>
              ⚠ {qualityIssues.length} entrada{qualityIssues.length !== 1 ? 's' : ''} com campos faltando
            </span>
          )}
          {balanceInsights.map((b, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium"
              style={b.type === 'warn'
                ? { backgroundColor: '#f59e0b15', color: '#f59e0b' }
                : { backgroundColor: '#6366f115', color: '#818cf8' }}>
              {b.text}
            </span>
          ))}
        </div>
      )}

      {/* ── Results BI Strip ── */}
      {hasBiData && (
        <div
          className="shrink-0 flex items-center gap-6 flex-wrap px-6 py-3 border-b"
          style={{
            borderColor: isDark ? '#1f2937' : '#e5e7eb',
            backgroundColor: isDark ? '#0a0f1a' : '#fafaf9',
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#555568' }}>
            Resultados do mês
          </span>
          {[
            { label: 'Receita', value: biReceita > 0 ? formatBRL(biReceita) : null },
            { label: 'Pedidos', value: biPedidos > 0 ? biPedidos.toLocaleString('pt-BR') : null },
            { label: 'Ticket Médio', value: biTicket ? formatBRL(biTicket) : null },
            { label: 'Conversão', value: biConv != null ? `${biConv.toFixed(1)}%` : null },
            { label: 'Entregab.', value: biEnt != null ? `${biEnt.toFixed(1)}%` : null },
            { label: 'Envios', value: biEnvios > 0 ? biEnvios.toLocaleString('pt-BR') : null },
          ].filter(m => m.value).map(m => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: isDark ? '#555568' : '#78716c' }}>{m.label}</span>
              <span className="text-xs font-bold" style={{ color: brandColor }}>{m.value}</span>
            </div>
          ))}
          <span className="text-[10px]" style={{ color: isDark ? '#333340' : '#bfbfbf' }}>
            {resultEntries.length} {resultEntries.length === 1 ? 'campanha' : 'campanhas'} com dados
          </span>
        </div>
      )}

      {/* ── Holidays strip ── */}
      {Object.keys(holidaysMap).length > 0 && (
        <div
          className="shrink-0 flex items-center gap-2 flex-wrap px-6 py-2.5 border-b"
          style={{
            borderColor: isDark ? '#1f2937' : '#e5e7eb',
            backgroundColor: isDark ? '#0c0f1a' : '#faf9f7',
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: '#555568' }}>
            📅 Datas
          </span>
          {Object.entries(holidaysMap)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([day, holidays]) =>
              holidays.map((h, i) => (
                <span
                  key={`${day}-${i}`}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap"
                  style={h.isCommerce
                    ? { backgroundColor: brandColor + '22', color: brandColor }
                    : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  {day}/{String(month + 1).padStart(2, '0')} · {h.name}
                </span>
              ))
            )}
        </div>
      )}

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
                            {day ? (
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
                                {holidaysMap[day]?.map((h, hi) => (
                                  <span
                                    key={hi}
                                    className="mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold leading-tight text-center max-w-[100px] truncate"
                                    style={h.isCommerce
                                      ? { backgroundColor: brandColor + '25', color: brandColor }
                                      : { backgroundColor: isDark ? '#1e2d3d' : '#e0f2fe', color: isDark ? '#7dd3fc' : '#0369a1' }}
                                    title={h.name}
                                  >
                                    {h.name}
                                  </span>
                                ))}
                              </div>
                            ) : (() => {
                              const od = wi === 0 ? outsideDays.prev[ci] : wi === lastWeekIdx ? outsideDays.next[ci] : null
                              return od ? (
                                <div className="flex flex-col items-center gap-0.5" style={{ opacity: 0.18 }}>
                                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isDark ? '#9ca3af' : '#78716c' }}>
                                    {WEEKDAYS[ci]}
                                  </span>
                                  <span className="text-sm font-bold" style={{ color: isDark ? '#9ca3af' : '#78716c' }}>
                                    {od.day}/{String(od.m + 1).padStart(2, '0')}
                                  </span>
                                </div>
                              ) : null
                            })()}
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
                          const isSelected = bulkMode && entry && bulkIds.has(entry.id)
                          const targetIso = day ? formatDate(year, month, day) : null

                          /* Drag & drop handlers — admin, not in bulk mode */
                          const dragProps = (isAdmin && !bulkMode && day) ? {
                            draggable: !!entry?.id,
                            onDragStart: (e) => {
                              if (!entry?.id) return
                              e.dataTransfer.setData('text/plain', String(entry.id))
                              e.dataTransfer.effectAllowed = 'move'
                            },
                            onDragOver: (e) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${brandColor}`
                            },
                            onDragLeave: (e) => { e.currentTarget.style.boxShadow = '' },
                            onDrop: async (e) => {
                              e.preventDefault()
                              e.currentTarget.style.boxShadow = ''
                              const draggedId = Number(e.dataTransfer.getData('text/plain'))
                              if (!draggedId || !targetIso) return
                              const dragged = entries.find(x => x.id === draggedId)
                              if (!dragged || dragged.date === targetIso) return
                              /* If target already has entry, swap dates via a safe temp date */
                              if (entry?.id && entry.id !== draggedId) {
                                const temp = '1900-01-01'
                                await supabase.from('calendar_entries').update({ date: temp }).eq('id', entry.id)
                                await supabase.from('calendar_entries').update({ date: targetIso }).eq('id', draggedId)
                                await supabase.from('calendar_entries').update({ date: dragged.date }).eq('id', entry.id)
                                showToast('Entradas trocadas de dia')
                              } else {
                                await supabase.from('calendar_entries').update({ date: targetIso }).eq('id', draggedId)
                                showToast('Entrada remarcada')
                              }
                              await fetchEntries()
                            },
                          } : {}

                          return (
                            <td
                              key={ci}
                              {...dragProps}
                              onClick={() => {
                                if (!day) return
                                if (bulkMode) { if (entry?.id) toggleBulk(entry.id) }
                                else { openModal(day) }
                              }}
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
                                ...(isSelected ? {
                                  outline: `2px solid ${brandColor}`,
                                  outlineOffset: '-2px',
                                  backgroundColor: brandColor + '25',
                                } : {}),
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

      {/* ── Modais (admin only) ── */}
      {isAdmin && (
        <>
          <GenerateMonthModal
            open={genOpen}  onClose={() => setGenOpen(false)}
            clientId={clientId} channel={channel} year={year} month={month}
            brandColor={brandColor}
            onDone={(count) => { fetchEntries(); showToast(`${count} entrada${count !== 1 ? 's' : ''} criada${count !== 1 ? 's' : ''}`) }}
          />
          <GenerateMonthModal
            open={weekOpen} onClose={() => setWeekOpen(false)}
            clientId={clientId} channel={channel} year={year} month={month}
            brandColor={brandColor}
            scope="week"
            onDone={(count) => { fetchEntries(); showToast(`${count} entrada${count !== 1 ? 's' : ''} criada${count !== 1 ? 's' : ''}`) }}
          />
          <PlaybookModal
            open={playbookOpen} onClose={() => setPlaybookOpen(false)}
            clientId={clientId} channel={channel} year={year} month={month}
            brandColor={brandColor}
            onDone={(count) => { fetchEntries(); showToast(`Playbook aplicado · ${count} entrada${count !== 1 ? 's' : ''}`) }}
          />
          <PostMortemModal
            open={pmOpen} onClose={() => setPmOpen(false)}
            clientId={clientId} channel={channel} year={year} month={month}
            brandColor={brandColor}
          />
          <RecurringModal
            open={recurringOpen} onClose={() => setRecurringOpen(false)}
            clientId={clientId} channel={channel} year={year} month={month}
            brandColor={brandColor}
            onDone={(count) => { fetchEntries(); showToast(`${count} recorrente${count !== 1 ? 's' : ''} criada${count !== 1 ? 's' : ''}`) }}
          />
          <ImportCSVModal
            open={importOpen} onClose={() => setImportOpen(false)}
            clientId={clientId} channel={channel}
            brandColor={brandColor}
            onDone={(count) => { fetchEntries(); showToast(`${count} entrada${count !== 1 ? 's' : ''} importada${count !== 1 ? 's' : ''}`) }}
          />
        </>
      )}

      {/* Inline success toast after generation */}
      {genToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[120] px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2.5 slide-up"
          style={{ backgroundColor: '#13131d', borderColor: '#2a2a38' }}>
          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white"
            style={{ backgroundColor: '#10b981' }}>✓</span>
          <span className="text-sm text-white font-medium">{genToast}</span>
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className={`modal-panel ${t.modalBg} border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}
            style={{
              ...fontStyle,
              boxShadow: isDark
                ? '0 25px 60px rgba(0,0,0,0.6)'
                : '0 25px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div className={`flex flex-col border-b ${t.border}`}>
              <div className={`flex items-center justify-between px-6 py-4`}>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest ${t.textFaint}`}>
                    {chLabel} · {modal.date}
                  </p>
                  <p className={`font-bold text-base mt-0.5 ${t.text}`}>
                    {modal.entry ? 'Editar entrada' : 'Nova entrada'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                {/* AI Suggest button */}
                {isAdmin && (
                  <button
                    onClick={handleAISuggest}
                    disabled={aiLoading}
                    title="Gerar sugestão com IA"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50"
                    style={{
                      borderColor: '#6366f1',
                      color: '#6366f1',
                      backgroundColor: isDark ? 'transparent' : '#eef2ff',
                    }}
                  >
                    {aiLoading ? '⏳ Gerando…' : '✨ Sugerir'}
                  </button>
                )}

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

            {/* Tab bar — only for existing entries */}
            {modal.entry && isAdmin && (
              <div className="flex px-6" style={{ borderTop: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}` }}>
                {[
                  { key: 'planejado',  label: '📋 Planejado' },
                  { key: 'resultados', label: '📊 Resultados' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setModalTab(tab.key)}
                    className="px-4 py-2.5 text-xs font-semibold transition-all border-b-2"
                    style={modalTab === tab.key
                      ? { borderBottomColor: brandColor, color: brandColor }
                      : { borderBottomColor: 'transparent', color: isDark ? '#555568' : '#9ca3af' }
                    }>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

            {/* ── PLANEJADO TAB ── */}
            {(!modal.entry || !isAdmin || modalTab === 'planejado') && (
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
                    {isAdmin && modal?.entry?.id && (
                      <button type="button" onClick={handleVariations}
                        disabled={variations?.loading}
                        className="mt-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ color: brandColor }}>
                        {variations?.loading ? '✨ Gerando variações…' : '✨ Gerar 3 variações A/B'}
                      </button>
                    )}
                    {variations?.error && (
                      <p className="mt-1.5 text-[11px]" style={{ color: '#ef4444' }}>{variations.error}</p>
                    )}
                    {variations && !variations.loading && variations.items.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#555568' }}>
                          Clique para aplicar
                        </p>
                        {variations.items.map((v, i) => (
                          <button key={i} type="button" onClick={() => applyVariation(v)}
                            className="w-full text-left rounded-lg border p-2.5 hover:opacity-90 transition-all"
                            style={{
                              backgroundColor: isDark ? '#0c0c10' : '#f9fafb',
                              borderColor: isDark ? '#1e1e2a' : '#d6d3cc',
                            }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                                style={{ backgroundColor: brandColor + '22', color: brandColor }}>
                                {v.angulo || 'variação'}
                              </span>
                              <span className="text-[10px]" style={{ color: '#555568' }}>#{i + 1}</span>
                            </div>
                            <p className="text-xs font-semibold" style={{ color: isDark ? '#fff' : '#111' }}>
                              {v.assunto}
                            </p>
                            {v.preheader && (
                              <p className="text-[11px] mt-0.5" style={{ color: '#8b8ba0' }}>
                                {v.preheader}
                              </p>
                            )}
                          </button>
                        ))}
                        <button type="button" onClick={() => setVariations(null)}
                          className="text-[10px]" style={{ color: '#555568' }}>
                          Fechar variações
                        </button>
                      </div>
                    )}
                  </MField>
                  <MField label="Preheader" t={t}>
                    <MInput isAdmin={isAdmin} value={form.preheader} placeholder="Texto de preview"
                      onChange={v => setForm(f => ({ ...f, preheader: v }))} t={t} brandColor={brandColor} />
                  </MField>
                  <MField label="Horário de Envio" t={t}>
                    <MInput isAdmin={isAdmin} value={form.horario} placeholder="Ex: 09:00, 14:30"
                      onChange={v => setForm(f => ({ ...f, horario: v }))} t={t} brandColor={brandColor} />
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
                      <p className={`text-sm ${t.text} capitalize`}>{form.tipo_template || ''}</p>
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
                    <span className={`text-sm ${t.text}`}>{STATUS_CONFIG[form.status]?.label || ''}</span>
                  </div>
                )}
              </MField>
            </div>
            )} {/* end PLANEJADO tab */}

            {/* ── RESULTADOS TAB ── */}
            {modal.entry && isAdmin && modalTab === 'resultados' && (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="rounded-xl p-4 border" style={{ backgroundColor: isDark ? '#0a0f1a' : '#f9fafb', borderColor: isDark ? '#1f2937' : '#e5e7eb' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#555568' }}>Campanha</p>
                  <p className="text-white text-sm font-semibold">{modal.entry.tema || modal.entry.descricao || modal.date}</p>
                  {modal.entry.segmentacao && <p className="text-[11px] mt-0.5" style={{ color: '#555568' }}>{modal.entry.segmentacao}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {RESULT_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: isDark ? '#444455' : '#9ca3af' }}>
                        {f.label}
                        {f.type === 'pct' && ' (%)'}
                        {f.type === 'brl' && ' (R$)'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={result[f.key]}
                        onChange={e => setResult(r => ({ ...r, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all ${t.inputCls}`}
                        onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25` }}
                        onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: isDark ? '#444455' : '#9ca3af' }}>
                    Print / Print URL
                  </label>
                  <input
                    type="text"
                    value={result.res_print_url}
                    onChange={e => setResult(r => ({ ...r, res_print_url: e.target.value }))}
                    placeholder="https://… (URL do print de resultados)"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all ${t.inputCls}`}
                    onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25` }}
                    onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
                  />
                  {result.res_print_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                      <img src={result.res_print_url} alt="Print" className="w-full object-contain max-h-48"
                        onError={e => { e.target.style.display = 'none' }} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: isDark ? '#444455' : '#9ca3af' }}>
                    Observações
                  </label>
                  <textarea
                    value={result.res_notas}
                    onChange={e => setResult(r => ({ ...r, res_notas: e.target.value }))}
                    rows={2} placeholder="Notas sobre os resultados…"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all resize-none ${t.inputCls}`}
                    onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}25` }}
                    onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
                  />
                </div>
              </div>
            )}

            {/* ── FOOTER ── */}
            {isAdmin ? (
              <div className={`flex items-center justify-between px-6 py-4 border-t ${t.border}`}>
                {modalTab === 'planejado' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div>
                      {resSaved && <span className="text-xs text-emerald-500 font-semibold">✓ Resultados salvos!</span>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={closeModal}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${t.btnSecondary}`}>
                        Fechar
                      </button>
                      <button onClick={handleSaveResult} disabled={resSaving}
                        className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: brandColor }}>
                        {resSaving ? 'Salvando…' : 'Salvar Resultados'}
                      </button>
                    </div>
                  </>
                )}
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

// ─── BulkBtn ─────────────────────────────────────────────────────────────────

function BulkBtn({ onClick, isDark, danger, children }) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors"
      style={{
        backgroundColor: danger ? '#ef444418' : isDark ? '#1f2937' : '#ffffff',
        borderColor: danger ? '#ef444455' : isDark ? '#374151' : '#d6d3cc',
        color: danger ? '#f87171' : isDark ? '#e5e7eb' : '#374151',
      }}>
      {children}
    </button>
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
    case 'horario':       value = channel === 'email' ? entry.horario   : null; break
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
    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${t.text}`}>{value || ''}</p>
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
    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${t.text}`}>{value || ''}</p>
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
