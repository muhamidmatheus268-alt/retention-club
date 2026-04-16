/* Utilities for calendar operations: export/import, quality/balance checks,
   clone previous month, recurring entries, etc. */

import { supabase } from './supabase'

/* ───────────────────────── Date helpers ───────────────────────── */
export function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
export function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }

/* ───────────────────────── Replicar mês anterior ───────────────────────── */
export async function cloneFromPreviousMonth({ clientId, year, month, channel }) {
  const prevYear  = month === 0 ? year - 1 : year
  const prevMonth = month === 0 ? 11        : month - 1
  const prevStart = isoDate(prevYear, prevMonth, 1)
  const prevEnd   = isoDate(prevYear, prevMonth, getDaysInMonth(prevYear, prevMonth))

  const { data: prev, error } = await supabase
    .from('calendar_entries')
    .select('*')
    .eq('client_id', clientId)
    .eq('channel', channel)
    .gte('date', prevStart)
    .lte('date', prevEnd)

  if (error) throw error
  if (!prev || prev.length === 0) return { inserted: 0, skipped: 0 }

  const daysNow  = getDaysInMonth(year, month)
  const toInsert = []
  let skipped = 0

  for (const e of prev) {
    const oldDay = parseInt(e.date.slice(-2), 10)
    /* Se o dia existe no novo mês, mapeia direto; senão, coloca no último dia */
    const newDay = oldDay <= daysNow ? oldDay : daysNow
    const newDate = isoDate(year, month, newDay)
    /* Remove campos que não devem ser copiados: id, created_at, resultados */
    const { id, created_at, updated_at,
      res_receita, res_pedidos, res_taxa_conversao, res_entregabilidade, res_qtd_envios, res_print_url, res_notas,
      ...rest } = e
    toInsert.push({
      ...rest,
      date: newDate,
      status: 'pendente',
    })
  }

  /* Evitar duplicatas: checar datas que já existem neste mês */
  const newStart = isoDate(year, month, 1)
  const newEnd   = isoDate(year, month, daysNow)
  const { data: existing } = await supabase.from('calendar_entries')
    .select('date').eq('client_id', clientId).eq('channel', channel)
    .gte('date', newStart).lte('date', newEnd)

  const existingDates = new Set((existing || []).map(x => x.date))
  const finalInsert = toInsert.filter(e => {
    if (existingDates.has(e.date)) { skipped++; return false }
    return true
  })

  if (finalInsert.length > 0) {
    const { error: insErr } = await supabase.from('calendar_entries').insert(finalInsert)
    if (insErr) throw insErr
  }

  return { inserted: finalInsert.length, skipped }
}

/* ───────────────────────── Export iCal ───────────────────────── */
export function exportToICal({ entries, clientName, channel }) {
  const channelLabel = { email: 'Email', whatsapp: 'WhatsApp', vip: 'VIP' }[channel] || channel
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Retention Club//${esc(clientName)}//PT-BR`,
    'CALSCALE:GREGORIAN',
  ]

  for (const e of entries) {
    const dateStr = e.date.replace(/-/g, '')
    const dtStart = e.horario
      ? `${dateStr}T${e.horario.replace(':', '')}00`
      : dateStr
    const summary = `[${channelLabel}] ${e.tema || 'Disparo'}${e.acao_comercial ? ' ★' : ''}`
    const description = [
      e.segmentacao && `Segmentação: ${e.segmentacao}`,
      e.assunto     && `Assunto: ${e.assunto}`,
      e.preheader   && `Preheader: ${e.preheader}`,
      e.descricao   && `\nDescrição:\n${e.descricao}`,
      e.observacoes && `\nObs: ${e.observacoes}`,
      e.link_copy   && `\nLink: ${e.link_copy}`,
    ].filter(Boolean).join('\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id || dateStr + Math.random().toString(36).slice(2)}@retentionclub.com.br`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      e.horario ? `DTSTART:${dtStart}` : `DTSTART;VALUE=DATE:${dateStr}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(description)}`,
      `STATUS:${e.status === 'enviado' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  const content = lines.join('\r\n')
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calendario-${clientName.toLowerCase().replace(/\s+/g, '-')}-${channel}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

/* ───────────────────────── Export CSV ───────────────────────── */
export function exportToCSV({ entries, clientName, channel }) {
  const headers = ['Data','Tema','Segmentação','Assunto','Preheader','Horário','Status','Pilar','Descrição','Observações','Receita','Pedidos']
  const esc = (v) => {
    const s = String(v ?? '').replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const rows = [headers.join(',')]
  for (const e of entries) {
    rows.push([
      e.date, e.tema, e.segmentacao, e.assunto, e.preheader, e.horario,
      e.status, e.acao_comercial ? 'Sim' : 'Não',
      e.descricao, e.observacoes, e.res_receita, e.res_pedidos,
    ].map(esc).join(','))
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calendario-${clientName.toLowerCase().replace(/\s+/g, '-')}-${channel}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ───────────────────────── Import CSV (simple parser) ───────────────────────── */
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const parseLine = (line) => {
    const out = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
        else if (c === '"') inQ = false
        else cur += c
      } else {
        if (c === ',') { out.push(cur); cur = '' }
        else if (c === '"') inQ = true
        else cur += c
      }
    }
    out.push(cur)
    return out
  }
  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i])
    const row = {}
    headers.forEach((h, j) => { row[h] = cols[j] || '' })
    rows.push(row)
  }
  return rows
}

/* Mapeia cabeçalhos do CSV para campos do calendário (tolera PT/EN) */
export function mapCsvRowToEntry(row) {
  const pick = (...keys) => {
    for (const k of keys) if (row[k] != null && row[k] !== '') return row[k]
    return ''
  }
  return {
    date:          pick('data', 'date'),
    tema:          pick('tema', 'topic'),
    segmentacao:   pick('segmentação', 'segmentacao', 'segment'),
    assunto:       pick('assunto', 'subject'),
    preheader:     pick('preheader'),
    horario:       pick('horário', 'horario', 'time'),
    descricao:     pick('descrição', 'descricao', 'description'),
    observacoes:   pick('observações', 'observacoes', 'notes'),
    link_copy:     pick('link', 'url', 'copy'),
    status:        (pick('status') || 'pendente').toLowerCase(),
    acao_comercial: /sim|yes|true|1|pilar/i.test(pick('pilar', 'ação comercial', 'acao_comercial') || ''),
  }
}

/* ───────────────────────── Quality check ───────────────────────── */
export function qualityCheck(entries, channel) {
  const issues = []

  for (const e of entries) {
    const problems = []
    if (!e.tema || e.tema.trim() === '') problems.push('sem tema')
    if (!e.segmentacao || e.segmentacao.trim() === '') problems.push('sem segmentação')
    if (channel === 'email') {
      if (!e.assunto) problems.push('sem assunto')
      else if (e.assunto.length > 50) problems.push(`assunto muito longo (${e.assunto.length}c)`)
      if (!e.preheader) problems.push('sem preheader')
      else if (e.preheader.length > 90) problems.push(`preheader muito longo (${e.preheader.length}c)`)
      if (!e.horario) problems.push('sem horário')
    }
    if (problems.length > 0) issues.push({ date: e.date, tema: e.tema, problems })
  }

  return issues
}

/* ───────────────────────── Balance check (distribuição) ───────────────────────── */
export function balanceCheck(entries, { month, year }) {
  /* Analisa distribuição ao longo do mês e rotação de segmentações */
  const insights = []

  /* Distribuição por semana */
  const perWeek = [0, 0, 0, 0, 0, 0]
  for (const e of entries) {
    const d = new Date(e.date)
    const w = Math.floor((d.getDate() - 1) / 7)
    perWeek[w]++
  }
  const max = Math.max(...perWeek)
  const min = Math.min(...perWeek.filter((v, i) => i < 4))
  if (max - min > 3 && entries.length > 4) {
    insights.push({ type: 'warn', text: `Distribuição desigual: semana com ${max} posts vs outra com ${min}.` })
  }

  /* Segmentação repetida 3x seguidas */
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].segmentacao && sorted[i].segmentacao === sorted[i - 1].segmentacao) {
      streak++
      if (streak >= 3) {
        insights.push({ type: 'warn', text: `"${sorted[i].segmentacao}" aparece 3x+ seguidas (rotacione).` })
        break
      }
    } else { streak = 1 }
  }

  /* Pilares */
  const pilares = entries.filter(e => e.acao_comercial).length
  if (entries.length > 8 && pilares === 0) {
    insights.push({ type: 'info', text: 'Nenhum pilar marcado — considere destacar 1-2 datas estratégicas.' })
  }
  if (pilares > 6) {
    insights.push({ type: 'warn', text: `${pilares} pilares marcados — pilares demais diluem a importância.` })
  }

  return insights
}

/* ───────────────────────── Bulk update ───────────────────────── */
export async function bulkUpdate({ ids, updates }) {
  if (!ids?.length) return { updated: 0 }
  const { error } = await supabase.from('calendar_entries').update(updates).in('id', ids)
  if (error) throw error
  return { updated: ids.length }
}

/* ───────────────────────── Bulk delete ───────────────────────── */
export async function bulkDelete({ ids }) {
  if (!ids?.length) return { deleted: 0 }
  const { error } = await supabase.from('calendar_entries').delete().in('id', ids)
  if (error) throw error
  return { deleted: ids.length }
}

/* ───────────────────────── Recorrentes ───────────────────────── */
/**
 * Gera datas recorrentes a partir de uma semente.
 * pattern: 'weekly' | 'biweekly' | 'daily'
 * weekdays: array de 0-6 (0=dom, 6=sáb), usado com weekly/biweekly
 * Retorna array de ISO dates dentro do mês.
 */
export function expandRecurring({ year, month, pattern, weekdays = [], startDay = 1 }) {
  const days = getDaysInMonth(year, month)
  const out = []
  for (let d = startDay; d <= days; d++) {
    const date = new Date(year, month, d)
    const wd = date.getDay()
    if (pattern === 'daily') out.push(isoDate(year, month, d))
    else if (pattern === 'weekly' && weekdays.includes(wd)) out.push(isoDate(year, month, d))
    else if (pattern === 'biweekly' && weekdays.includes(wd)) {
      /* Só semanas ímpares desde o início do mês */
      const week = Math.floor((d - 1) / 7)
      if (week % 2 === 0) out.push(isoDate(year, month, d))
    }
  }
  return out
}
