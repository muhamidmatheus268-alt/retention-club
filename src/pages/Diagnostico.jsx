import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const S = {
  bg: '#0c0c10', card: '#111118', panel: '#13131f',
  border: '#1e1e2a', ib: '#2a2a38',
  input: '#080810', muted: '#555568', faint: '#444455',
}

/* ── Email / volume metrics ── */
const METRICS_EMAIL = [
  { key: 'base_total',        label: 'Base Total',        type: 'int', tip: '' },
  { key: 'base_ativa',        label: 'Base Ativa',        type: 'int', tip: '90d' },
  { key: 'emails_enviados',   label: 'Enviados',          type: 'int', tip: '' },
  { key: 'emails_agendados',  label: 'Agendados',         type: 'int', tip: '' },
  { key: 'taxa_entrega',      label: 'Entrega %',         type: 'pct', tip: '' },
  { key: 'taxa_abertura',     label: 'Abertura %',        type: 'pct', tip: '' },
  { key: 'taxa_cliques',      label: 'Cliques %',         type: 'pct', tip: '' },
  { key: 'taxa_conversao',    label: 'Conversão %',       type: 'pct', tip: '' },
  { key: 'receita',           label: 'Receita',           type: 'brl', tip: '' },
  { key: 'meta_receita',      label: 'Meta de Receita',   type: 'brl', tip: '' },
  { key: 'ticket_medio',      label: 'Ticket Médio',      type: 'brl', tip: '' },
  { key: 'rpa',               label: 'RPA',               type: 'brl', tip: 'Receita/automação' },
  { key: 'rpe',               label: 'RPE',               type: 'brl', tip: 'Receita/envio' },
]

/* ── Retenção / aquisição metrics ── */
const METRICS_RETENCAO = [
  { key: 'novos_clientes',      label: 'Novos Clientes',      type: 'int', tip: 'Mês' },
  { key: 'clientes_recorrentes',label: 'Recorrentes',          type: 'int', tip: 'Mês' },
  { key: 'clientes_total',      label: 'Total Clientes',       type: 'int', tip: 'Mês' },
  { key: 'taxa_recompra',       label: 'Taxa de Recompra',     type: 'pct', tip: '' },
  { key: 'cac',                 label: 'CAC',                  type: 'brl', tip: 'Custo aquisição' },
  { key: 'ltv_projetado',       label: 'LTV Projetado',        type: 'brl', tip: '12 meses' },
]

/* ── RFM segments — layout row/col in 3×3 grid ── */
const RFM_CELLS = [
  // row 0 = High Recency  (comprou recente)
  { key: 'rfm_new_customers', label: 'Novos',       color: '#22d3ee', row: 0, col: 0, desc: 'Alta R · Baixa F' },
  { key: 'rfm_potential',     label: 'Potencial',   color: '#6366f1', row: 0, col: 1, desc: 'Alta R · Média F' },
  { key: 'rfm_champions',     label: 'Champions',   color: '#10b981', row: 0, col: 2, desc: 'Alta R · Alta F'  },
  // row 1 = Med Recency
  { key: 'rfm_promising',     label: 'Promissor',   color: '#84cc16', row: 1, col: 0, desc: 'Média R · Baixa F' },
  { key: 'rfm_needs_attention',label: 'Atenção',    color: '#f59e0b', row: 1, col: 1, desc: 'Média R · Média F' },
  { key: 'rfm_loyal',         label: 'Leal',        color: '#3b82f6', row: 1, col: 2, desc: 'Média R · Alta F'  },
  // row 2 = Low Recency  (inativo / perdido)
  { key: 'rfm_lost',          label: 'Perdido',     color: '#6b7280', row: 2, col: 0, desc: 'Baixa R · Baixa F' },
  { key: 'rfm_at_risk',       label: 'Em Risco',    color: '#ef4444', row: 2, col: 1, desc: 'Baixa R · Média F' },
  { key: 'rfm_about_to_sleep',label: 'Dormindo',    color: '#f97316', row: 2, col: 2, desc: 'Baixa R · Alta F'  },
]

const RFM_KEYS = RFM_CELLS.map(c => c.key)

const ALL_METRICS = [...METRICS_EMAIL, ...METRICS_RETENCAO]
const EMPTY = Object.fromEntries([...ALL_METRICS.map(m => [m.key, '']), ...RFM_KEYS.map(k => [k, ''])])

/* ── formatters ── */
function fmtBRL(v)  { if (v == null || v === '') return ''; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtBRLs(v) { if (v == null || v === '' || v === 0) return ''; const n = Number(v); if (n >= 1000000) return `R$${(n/1000000).toFixed(1)}M`; if (n >= 1000) return `R$${(n/1000).toFixed(1)}k`; return `R$${n.toFixed(0)}` }
function fmtPct(v)  { if (v == null || v === '') return ''; return `${Number(v).toFixed(1)}%` }
function fmtInt(v)  { if (v == null || v === '') return ''; return Number(v).toLocaleString('pt-BR') }
function fmt(m, v)  { return m.type === 'brl' ? fmtBRL(v) : m.type === 'pct' ? fmtPct(v) : fmtInt(v) }
function n(v)       { return parseFloat(v) || 0 }

function delta(now, prev) {
  if (!now || !prev || prev === 0) return null
  const d = ((now - prev) / prev) * 100
  return { pct: d.toFixed(1), up: d >= 0 }
}

function ChartTip({ active, payload, label, type }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs border" style={{ backgroundColor: '#17171f', borderColor: '#2a2a38', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
      <p className="font-bold text-white mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {type === 'brl' ? fmtBRL(p.value) : type === 'pct' ? fmtPct(p.value) : fmtInt(p.value)}
        </p>
      ))}
    </div>
  )
}

/* ══════════════════════════════ RFM MATRIX ══════════════════════════════ */
function RFMMatrix({ record, brandColor }) {
  const total = RFM_KEYS.reduce((s, k) => s + n(record?.[k]), 0)

  // Build 3×3 array
  const grid = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) =>
      RFM_CELLS.find(c => c.row === row && c.col === col)
    )
  )

  const hasData = total > 0

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-white">Matriz RFM</p>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>
          {hasData ? `${fmtInt(total)} clientes mapeados` : 'Preencha no Input'}
        </span>
      </div>
      <p className="text-[10px] mb-4" style={{ color: S.muted }}>Recency × Frequency — segmentação da base</p>

      {/* Axis labels */}
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex flex-col justify-around items-center mr-2" style={{ width: 60 }}>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: S.faint, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Recência ↑</span>
        </div>
        <div className="flex-1">
          {/* X-axis labels */}
          <div className="grid grid-cols-3 gap-1.5 mb-1">
            {['Baixa Freq', 'Média Freq', 'Alta Freq'].map(l => (
              <div key={l} className="text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: S.faint }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Row labels + cells */}
          {['Alta R', 'Média R', 'Baixa R'].map((rowLabel, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-1.5 mb-1.5">
              {grid[rowIdx].map((cell, colIdx) => {
                if (!cell) return <div key={colIdx} />
                const count = n(record?.[cell.key])
                const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : 0
                return (
                  <div key={cell.key}
                    className="rounded-xl border p-3 flex flex-col transition-all"
                    style={{
                      backgroundColor: hasData && count > 0 ? cell.color + '15' : '#0d0d14',
                      borderColor: hasData && count > 0 ? cell.color + '40' : S.border,
                    }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cell.color }} />
                      <span className="text-[10px] font-bold" style={{ color: cell.color }}>{cell.label}</span>
                    </div>
                    <p className="text-base font-bold text-white leading-none">{hasData ? fmtInt(count) || '0' : '—'}</p>
                    {hasData && count > 0 && (
                      <p className="text-[10px] mt-0.5" style={{ color: cell.color + '99' }}>{pct}%</p>
                    )}
                    <p className="text-[9px] mt-1 leading-tight" style={{ color: S.faint }}>{cell.desc}</p>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend strip */}
      {hasData && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-3" style={{ borderColor: S.border }}>
          {RFM_CELLS.filter(c => n(record?.[c.key]) > 0).sort((a, b) => n(record?.[b.key]) - n(record?.[a.key])).slice(0, 5).map(cell => (
            <div key={cell.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cell.color }} />
              <span className="text-xs" style={{ color: S.muted }}>{cell.label}</span>
              <span className="text-xs font-bold text-white">{fmtInt(n(record?.[cell.key]))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════ COHORT ══════════════════════════════ */
function CohortSection({ history, brandColor }) {
  // Use history to show month-over-month retenção
  const hasRetencao = history.some(h => h.clientes_recorrentes || h.taxa_recompra)

  if (!hasRetencao) return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <p className="text-sm font-bold text-white mb-1">Cohort de Retenção</p>
      <p className="text-[10px] mb-4" style={{ color: S.muted }}>Taxa de recompra mensal</p>
      <div className="h-32 flex items-center justify-center">
        <p className="text-sm" style={{ color: S.faint }}>Preencha Taxa de Recompra e Recorrentes no Input</p>
      </div>
    </div>
  )

  // Build cohort table: rows = cohorts (months), columns = M+0 through M+5
  // Use taxa_recompra field if available, otherwise compute from clientes_recorrentes/clientes_total
  const months = history.filter(h => h.mes) // only months with data
  const cohortData = months.map((h, i) => {
    const recompra = n(h.taxa_recompra)
    const auto = h.clientes_total > 0 ? (n(h.clientes_recorrentes) / n(h.clientes_total)) * 100 : 0
    return {
      mes: h.mes,
      retention: recompra || auto,
    }
  })

  function retColor(pct) {
    if (!pct) return '#1e1e2a'
    if (pct >= 40) return brandColor + 'dd'
    if (pct >= 25) return brandColor + '88'
    if (pct >= 15) return brandColor + '44'
    return '#ef444430'
  }
  function retTextColor(pct) {
    if (!pct) return S.faint
    if (pct >= 15) return '#fff'
    return '#ef4444'
  }

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <p className="text-sm font-bold text-white mb-1">Cohort de Retenção</p>
      <p className="text-[10px] mb-5" style={{ color: S.muted }}>Taxa de recompra / retenção por mês</p>

      {/* Heatmap table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 font-bold uppercase tracking-widest" style={{ color: S.faint, fontSize: 9 }}>Mês</th>
              <th className="text-center py-2 px-2 font-bold uppercase tracking-widest" style={{ color: S.faint, fontSize: 9 }}>Recorrentes</th>
              <th className="text-center py-2 px-2 font-bold uppercase tracking-widest" style={{ color: S.faint, fontSize: 9 }}>Novos</th>
              <th className="text-center py-2 px-2 font-bold uppercase tracking-widest" style={{ color: S.faint, fontSize: 9 }}>Total</th>
              <th className="text-center py-2 px-2 font-bold uppercase tracking-widest" style={{ color: S.faint, fontSize: 9 }}>% Retenção</th>
            </tr>
          </thead>
          <tbody>
            {history.filter(h => h.mes && (h.clientes_recorrentes || h.novos_clientes || h.taxa_recompra)).map((h, i) => {
              const ret = n(h.taxa_recompra) || (n(h.clientes_total) > 0 ? (n(h.clientes_recorrentes) / n(h.clientes_total)) * 100 : 0)
              return (
                <tr key={i} className="border-t" style={{ borderColor: S.border }}>
                  <td className="py-2.5 pr-4 font-semibold text-white">{h.mes}</td>
                  <td className="py-2.5 px-2 text-center" style={{ color: brandColor }}>{fmtInt(h.clientes_recorrentes) || '—'}</td>
                  <td className="py-2.5 px-2 text-center" style={{ color: S.muted }}>{fmtInt(h.novos_clientes) || '—'}</td>
                  <td className="py-2.5 px-2 text-center" style={{ color: S.muted }}>{fmtInt(h.clientes_total) || '—'}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] min-w-[52px] text-center"
                        style={{ backgroundColor: retColor(ret), color: retTextColor(ret) }}>
                        {ret > 0 ? `${ret.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Avg retention */}
      {cohortData.some(c => c.retention > 0) && (
        <div className="mt-4 pt-3 border-t flex items-center gap-3" style={{ borderColor: S.border }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Média:</span>
          <span className="text-base font-bold" style={{ color: brandColor }}>
            {(cohortData.reduce((s, c) => s + c.retention, 0) / cohortData.filter(c => c.retention > 0).length).toFixed(1)}%
          </span>
          <span className="text-[10px]" style={{ color: S.muted }}>retenção nos últimos {cohortData.filter(c => c.retention > 0).length} meses</span>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════ MAIN ══════════════════════════════ */
function DiagContent() {
  const { client, brandColor } = useClient()
  const now = new Date()
  const [tab,     setTab]     = useState('bi')
  const [inputTab,setInputTab]= useState('email')  // 'email' | 'retencao' | 'rfm'
  const [mes,     setMes]     = useState(now.getMonth() + 1)
  const [ano,     setAno]     = useState(now.getFullYear())
  const [form,    setForm]    = useState(EMPTY)
  const [record,  setRecord]  = useState(null)
  const [history, setHistory] = useState([])
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiModal, setAiModal] = useState(null)  // { loading, diagnosis, stats, error }

  async function runDiagnosis() {
    if (!client) return
    setAiModal({ loading: true, diagnosis: null, stats: null, error: '' })
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, mes, ano }),
      })
      const data = await res.json()
      if (!res.ok) { setAiModal({ loading: false, diagnosis: null, stats: null, error: data.error || 'Erro' }); return }
      setAiModal({ loading: false, diagnosis: data.diagnosis, stats: data.stats, error: '' })
    } catch (e) { setAiModal({ loading: false, diagnosis: null, stats: null, error: e.message }) }
  }

  const fetchData = useCallback(async () => {
    if (!client) return
    setLoading(true)

    const months = []
    let m = mes - 1, y = ano
    for (let i = 0; i < 6; i++) {
      months.push({ mes: m + 1, ano: y })
      m--; if (m < 0) { m = 11; y-- }
    }

    const { data } = await supabase
      .from('bi_email_metrics').select('*')
      .eq('client_id', client.id)
      .in('mes', months.map(x => x.mes))
      .gte('ano', Math.min(...months.map(x => x.ano)))

    const filtered = (data || []).filter(d => months.some(m => m.mes === d.mes && m.ano === d.ano))
    const current  = filtered.find(d => d.mes === mes && d.ano === ano) || null

    if (current) {
      setRecord(current)
      const allKeys = [...ALL_METRICS.map(m => m.key), ...RFM_KEYS]
      setForm(Object.fromEntries(allKeys.map(k => [k, current[k] != null ? String(current[k]) : ''])))
    } else {
      setRecord(null)
      setForm(EMPTY)
    }

    const sorted = [...months].reverse().map(({ mes: m, ano: a }) => {
      const r = filtered.find(d => d.mes === m && d.ano === a)
      return { mes: `${MONTH_NAMES[m - 1]}/${String(a).slice(2)}`, ...r }
    })
    setHistory(sorted)
    setLoading(false)
  }, [client, mes, ano])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!client) return
    setSaving(true)
    const allKeys = [...ALL_METRICS.map(m => m.key), ...RFM_KEYS]
    const payload = {
      client_id: client.id, mes, ano,
      ...Object.fromEntries(allKeys.map(k => [k, form[k] !== '' ? parseFloat(form[k]) : null]))
    }
    if (record?.id) { await supabase.from('bi_email_metrics').update(payload).eq('id', record.id) }
    else { const { data } = await supabase.from('bi_email_metrics').insert(payload).select().single(); if (data) setRecord(data) }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2200)
    await fetchData()
  }

  if (!client) return <div className="flex h-full items-center justify-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  const r = record || {}

  // Email funnel
  const enviados  = n(r.emails_enviados)
  const entregues = enviados * (n(r.taxa_entrega) || 100) / 100
  const abertos   = entregues * n(r.taxa_abertura) / 100
  const clicados  = abertos * n(r.taxa_cliques) / 100
  const funnelData = [
    { name: 'Enviados',  value: enviados  },
    { name: 'Entregues', value: entregues },
    { name: 'Abertos',   value: abertos   },
    { name: 'Clicados',  value: clicados  },
  ].filter(d => d.value > 0)
  const maxFunnel = funnelData[0]?.value || 1

  // Meta
  const receitaVal = n(r.receita)
  const metaVal    = n(r.meta_receita)
  const metaPct    = metaVal > 0 ? Math.min((receitaVal / metaVal) * 100, 100) : 0
  const baseTotal  = n(r.base_total)
  const baseAtiva  = n(r.base_ativa)
  const baseAtivaP = baseTotal > 0 ? (baseAtiva / baseTotal) * 100 : 0

  // Novos vs Recorrentes
  const novos      = n(r.novos_clientes)
  const recorrentes= n(r.clientes_recorrentes)
  const totalClients= n(r.clientes_total) || (novos + recorrentes)
  const pctNovos   = totalClients > 0 ? (novos / totalClients) * 100 : 0
  const pctRecorr  = totalClients > 0 ? (recorrentes / totalClients) * 100 : 0
  const hasRetencao= novos > 0 || recorrentes > 0

  const donutData  = hasRetencao ? [
    { name: 'Recorrentes', value: recorrentes, color: brandColor },
    { name: 'Novos',       value: novos,       color: '#2a2a38' },
  ] : []

  // Previous month for delta
  const prev = history[history.length - 2] || {}

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Diagnóstico</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Performance mensal · CRM</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
            {[{ k: 'bi', l: '📊 BI' }, { k: 'input', l: '✏️ Input' }].map(({ k, l }) => (
              <button key={k} onClick={() => setTab(k)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={tab === k ? { backgroundColor: brandColor, color: '#fff' } : { color: S.muted }}>
                {l}
              </button>
            ))}
          </div>
          <Sel value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MONTH_NAMES.map((nm, i) => <option key={i} value={i + 1}>{nm}</option>)}
          </Sel>
          <Sel value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Sel>
          {record && (
            <button onClick={runDiagnosis}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`, color: '#fff', boxShadow: `0 2px 8px ${brandColor}40` }}>
              ✨ Analisar com IA
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════ BI TAB ══════════════════ */}
      {tab === 'bi' && (
        loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm" style={{ color: S.muted }}>Carregando…</p>
          </div>
        ) : !record ? (
          <div className="text-center py-24 rounded-2xl border" style={{ borderColor: S.border }}>
            <p className="text-5xl mb-4">📊</p>
            <p className="text-white font-bold text-lg mb-1">Sem dados para {MONTH_NAMES[mes - 1]} / {ano}</p>
            <p className="text-sm mb-6" style={{ color: S.muted }}>Preencha os dados deste mês na aba Input.</p>
            <button onClick={() => setTab('input')}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: brandColor }}>
              ✏️ Preencher dados
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── KPI Row — Email ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Receita',      val: fmtBRL(r.receita),       raw: n(r.receita),       prev: n(prev.receita) },
                { label: 'Meta',         val: fmtBRL(r.meta_receita),   raw: null,               prev: null, sub: metaVal > 0 ? `${metaPct.toFixed(0)}% atingido` : null },
                { label: 'Abertura',     val: fmtPct(r.taxa_abertura),  raw: n(r.taxa_abertura), prev: n(prev.taxa_abertura) },
                { label: 'Cliques',      val: fmtPct(r.taxa_cliques),   raw: n(r.taxa_cliques),  prev: n(prev.taxa_cliques) },
                { label: 'Conversão',    val: fmtPct(r.taxa_conversao), raw: n(r.taxa_conversao),prev: n(prev.taxa_conversao) },
                { label: 'Ticket Médio', val: fmtBRL(r.ticket_medio),   raw: n(r.ticket_medio),  prev: n(prev.ticket_medio) },
              ].map(kpi => {
                const d = kpi.raw && kpi.prev ? delta(kpi.raw, kpi.prev) : null
                return (
                  <div key={kpi.label} className="rounded-2xl p-4 border"
                    style={{ backgroundColor: S.card, borderColor: S.border, borderLeft: `3px solid ${brandColor}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>{kpi.label}</p>
                    <p className="text-white font-bold text-lg leading-none">{kpi.val || '—'}</p>
                    {kpi.sub && <p className="text-[10px] mt-1" style={{ color: S.muted }}>{kpi.sub}</p>}
                    {d && <p className="text-[10px] font-semibold mt-1" style={{ color: d.up ? '#10b981' : '#ef4444' }}>{d.up ? '▲' : '▼'} {Math.abs(d.pct)}% vs ant.</p>}
                  </div>
                )
              })}
            </div>

            {/* ── Meta progress ── */}
            {metaVal > 0 && (
              <div className="rounded-2xl border px-5 py-4" style={{ backgroundColor: S.card, borderColor: S.border }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-white">Meta vs Realizado</span>
                  <span className="text-sm font-bold" style={{ color: metaPct >= 100 ? '#10b981' : brandColor }}>{metaPct.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: S.border }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(metaPct, 100)}%`, backgroundColor: metaPct >= 100 ? '#10b981' : brandColor }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs" style={{ color: S.muted }}>{fmtBRL(receitaVal)} realizado</span>
                  <span className="text-xs" style={{ color: S.faint }}>meta {fmtBRL(metaVal)}</span>
                </div>
              </div>
            )}

            {/* ── Aquisição e Retenção ── */}
            {hasRetencao && (
              <div className="rounded-2xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
                <p className="text-sm font-bold text-white mb-4">Aquisição & Retenção</p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {/* Donut novos vs recorrentes */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative" style={{ width: 140, height: 140 }}>
                      <PieChart width={140} height={140}>
                        <Pie data={donutData} cx={65} cy={65} innerRadius={44} outerRadius={64}
                          dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                          {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-xl font-bold text-white">{pctRecorr.toFixed(0)}%</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: S.muted }}>Retenção</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColor }} />
                        <span className="text-xs" style={{ color: S.muted }}>Recorrentes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2a2a38' }} />
                        <span className="text-xs" style={{ color: S.muted }}>Novos</span>
                      </div>
                    </div>
                  </div>

                  {/* KPI strip */}
                  <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Novos',       val: fmtInt(novos),          color: '#ffffff',  raw: novos,       prev: n(prev.novos_clientes) },
                      { label: 'Recorrentes', val: fmtInt(recorrentes),    color: brandColor, raw: recorrentes, prev: n(prev.clientes_recorrentes) },
                      { label: '% Recompra',  val: fmtPct(r.taxa_recompra) || (totalClients > 0 ? fmtPct(pctRecorr) : '—'), color: brandColor, raw: n(r.taxa_recompra), prev: n(prev.taxa_recompra) },
                      { label: 'CAC',         val: fmtBRL(r.cac),          color: '#f59e0b',  raw: n(r.cac),    prev: n(prev.cac) },
                      { label: 'LTV 12m',     val: fmtBRL(r.ltv_projetado),color: '#10b981',  raw: n(r.ltv_projetado), prev: n(prev.ltv_projetado) },
                      { label: 'Total Clientes', val: fmtInt(totalClients), color: '#8b8ba0', raw: totalClients, prev: n(prev.clientes_total) },
                    ].map(kpi => {
                      const d = kpi.raw && kpi.prev ? delta(kpi.raw, kpi.prev) : null
                      return (
                        <div key={kpi.label} className="rounded-xl p-3 border" style={{ backgroundColor: S.bg, borderColor: S.border }}>
                          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: S.faint }}>{kpi.label}</p>
                          <p className="text-base font-bold" style={{ color: kpi.val && kpi.val !== '—' ? kpi.color : S.faint }}>{kpi.val || '—'}</p>
                          {d && <p className="text-[9px] font-semibold mt-0.5" style={{ color: d.up ? '#10b981' : '#ef4444' }}>{d.up ? '▲' : '▼'} {Math.abs(d.pct)}%</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Receita trend */}
              <div className="rounded-2xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
                <p className="text-sm font-bold text-white mb-4">Receita · 6 meses</p>
                {history.some(h => h.receita) ? (
                  <ResponsiveContainer width="100%" height={170}>
                    <AreaChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={brandColor} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" />
                      <XAxis dataKey="mes" tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtBRLs} width={52} />
                      <Tooltip content={<ChartTip type="brl" />} />
                      <Area type="monotone" dataKey="receita" name="Receita" stroke={brandColor} fill="url(#recGrad)" strokeWidth={2} dot={{ fill: brandColor, r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyChart label="Sem dados de receita" />}
              </div>

              {/* Abertura & Conversão */}
              <div className="rounded-2xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
                <p className="text-sm font-bold text-white mb-4">Abertura & Conversão · 6 meses</p>
                {history.some(h => h.taxa_abertura || h.taxa_conversao) ? (
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" />
                      <XAxis dataKey="mes" tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: S.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
                      <Tooltip content={<ChartTip type="pct" />} />
                      <Bar dataKey="taxa_abertura"  name="Abertura"  fill={brandColor} radius={[3,3,0,0]} maxBarSize={24} />
                      <Bar dataKey="taxa_conversao" name="Conversão" fill="#6366f1"    radius={[3,3,0,0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart label="Sem dados de taxas" />}
              </div>
            </div>

            {/* ── RFM Matrix + Cohort ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RFMMatrix record={record} brandColor={brandColor} />
              <CohortSection history={history} brandColor={brandColor} />
            </div>

            {/* ── Email Funnel + Base ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
                <p className="text-sm font-bold text-white mb-4">Funil Email · {MONTH_NAMES[mes - 1]}/{ano}</p>
                {funnelData.length > 0 ? (
                  <div className="space-y-2.5">
                    {funnelData.map((f, i) => {
                      const pct = (f.value / maxFunnel) * 100
                      const opacities = ['ff', 'cc', '99', '66']
                      return (
                        <div key={f.name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: S.muted }}>{f.name}</span>
                            <span className="font-bold text-white">{fmtInt(f.value)}</span>
                          </div>
                          <div className="w-full h-6 rounded-xl overflow-hidden" style={{ backgroundColor: '#0d0d14' }}>
                            <div className="h-full rounded-xl transition-all duration-700 flex items-center px-3"
                              style={{ width: `${pct}%`, backgroundColor: brandColor + opacities[i] }}>
                              {pct > 12 && <span className="text-[10px] font-bold text-white">{pct.toFixed(0)}%</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <EmptyChart label="Preencha Enviados e Taxas no Input" />}
              </div>

              <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: S.card, borderColor: S.border }}>
                <p className="text-sm font-bold text-white">Saúde da Base & Métricas</p>
                {baseTotal > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: S.muted }}>Base Ativa (90d)</span>
                      <span className="font-bold text-white">{baseAtivaP.toFixed(1)}% · {fmtInt(baseAtiva)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: S.border }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${baseAtivaP}%`, backgroundColor: brandColor }} />
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: S.faint }}>{fmtInt(baseTotal)} total</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Entrega %', val: fmtPct(r.taxa_entrega),   color: '#10b981' },
                    { label: 'Cliques %', val: fmtPct(r.taxa_cliques),   color: '#3b82f6' },
                    { label: 'RPE',       val: fmtBRL(r.rpe),            color: brandColor },
                    { label: 'RPA',       val: fmtBRL(r.rpa),            color: '#8b5cf6' },
                    { label: 'Enviados',  val: fmtInt(r.emails_enviados), color: '#fff' },
                    { label: 'Agendados', val: fmtInt(r.emails_agendados),color: '#fff' },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl px-3 py-2.5 border" style={{ backgroundColor: S.bg, borderColor: S.border }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: S.faint }}>{m.label}</p>
                      <p className="text-sm font-bold" style={{ color: m.val ? m.color : S.faint }}>{m.val || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )
      )}

      {/* ══════════════════ INPUT TAB ══════════════════ */}
      {tab === 'input' && (
        <div className="space-y-4">
          {/* Input sub-tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
            {[
              { k: 'email',    l: '✉ Email'    },
              { k: 'retencao', l: '🔄 Retenção' },
              { k: 'rfm',      l: '🎯 RFM'      },
            ].map(({ k, l }) => (
              <button key={k} onClick={() => setInputTab(k)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={inputTab === k ? { backgroundColor: brandColor, color: '#fff' } : { color: S.muted }}>
                {l}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border p-6" style={{ backgroundColor: S.card, borderColor: S.border }}>
            <p className="text-sm font-semibold text-white mb-5">{MONTH_NAMES[mes - 1]} / {ano}</p>

            {inputTab === 'email' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {METRICS_EMAIL.map(m => (
                  <InputField key={m.key} m={m} form={form} setForm={setForm} brandColor={brandColor} />
                ))}
              </div>
            )}

            {inputTab === 'retencao' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {METRICS_RETENCAO.map(m => (
                  <InputField key={m.key} m={m} form={form} setForm={setForm} brandColor={brandColor} />
                ))}
              </div>
            )}

            {inputTab === 'rfm' && (
              <div>
                <p className="text-xs mb-4" style={{ color: S.muted }}>
                  Preencha o número de clientes em cada segmento RFM. Os valores alimentam a Matriz RFM no BI.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {RFM_CELLS.map(cell => (
                    <div key={cell.key}>
                      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cell.color }} />
                        <span style={{ color: cell.color }}>{cell.label}</span>
                      </label>
                      <p className="text-[9px] mb-1" style={{ color: S.faint }}>{cell.desc}</p>
                      <input type="number" value={form[cell.key]}
                        onChange={e => setForm(f => ({ ...f, [cell.key]: e.target.value }))}
                        placeholder="0"
                        className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all"
                        style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
                        onFocus={e => { e.target.style.borderColor = cell.color; e.target.style.boxShadow = `0 0 0 3px ${cell.color}15` }}
                        onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
              <p className="text-xs" style={{ color: S.faint }}>
                Dados alimentam automaticamente os gráficos na aba BI.
              </p>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: brandColor }}>
                {saving ? 'Salvando…' : saved ? '✓ Salvo!' : record ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Diagnosis Modal ── */}
      {aiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAiModal(null) }}>
          <div className="rounded-2xl border w-full max-w-2xl max-h-[92vh] flex flex-col modal-panel"
            style={{ backgroundColor: '#111118', borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: S.ib }}>
              <p className="text-white font-bold">🤖 Diagnóstico inteligente · {MONTH_NAMES[mes - 1]}/{ano}</p>
              <button onClick={() => setAiModal(null)} className="text-[#555568] hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {aiModal.loading && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin"
                    style={{ background: `conic-gradient(${brandColor}, transparent)`, maskImage: 'radial-gradient(circle, transparent 55%, #000 56%)', WebkitMaskImage: 'radial-gradient(circle, transparent 55%, #000 56%)' }} />
                  <p className="text-sm text-white font-semibold">IA analisando métricas…</p>
                </div>
              )}
              {aiModal.error && (
                <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#f87171' }}>
                  {aiModal.error}
                </div>
              )}
              {aiModal.diagnosis && (
                <>
                  {/* Headline */}
                  <div className="rounded-xl border p-4"
                    style={{
                      backgroundColor: aiModal.diagnosis.saude_geral === 'saudavel' ? '#10b98115'
                        : aiModal.diagnosis.saude_geral === 'critico' ? '#ef444415' : '#f59e0b15',
                      borderColor: aiModal.diagnosis.saude_geral === 'saudavel' ? '#10b98140'
                        : aiModal.diagnosis.saude_geral === 'critico' ? '#ef444440' : '#f59e0b40',
                    }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                      style={{ color: aiModal.diagnosis.saude_geral === 'saudavel' ? '#10b981'
                        : aiModal.diagnosis.saude_geral === 'critico' ? '#ef4444' : '#f59e0b' }}>
                      {aiModal.diagnosis.saude_geral === 'saudavel' ? '✓ Saudável'
                        : aiModal.diagnosis.saude_geral === 'critico' ? '⚠ Crítico' : '○ Atenção'}
                    </p>
                    <p className="text-sm text-white font-semibold leading-relaxed">
                      {aiModal.diagnosis.headline}
                    </p>
                  </div>

                  {/* Métricas críticas */}
                  {aiModal.diagnosis.metricas_criticas?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>
                        Métricas-chave
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {aiModal.diagnosis.metricas_criticas.map((m, i) => (
                          <div key={i} className="rounded-lg border px-3 py-2"
                            style={{
                              backgroundColor: S.input, borderColor: S.border,
                              borderLeft: `3px solid ${m.status === 'ok' ? '#10b981' : m.status === 'critico' ? '#ef4444' : '#f59e0b'}`,
                            }}>
                            <p className="text-[10px]" style={{ color: S.muted }}>{m.metrica}</p>
                            <p className="text-sm font-bold text-white">{m.valor}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: S.muted }}>{m.comentario}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiModal.diagnosis.pontos_fortes?.length > 0 && (
                    <InsightList title="Pontos fortes" emoji="✨" color="#10b981" items={aiModal.diagnosis.pontos_fortes} />
                  )}
                  {aiModal.diagnosis.alertas?.length > 0 && (
                    <InsightList title="Alertas" emoji="⚠" color="#ef4444" items={aiModal.diagnosis.alertas} />
                  )}
                  {aiModal.diagnosis.recomendacoes?.length > 0 && (
                    <InsightList title="Recomendações" emoji="🎯" color={brandColor} items={aiModal.diagnosis.recomendacoes} ordered />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InsightList({ title, emoji, color, items, ordered }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span>{emoji}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{title}</p>
      </div>
      <Tag className="rounded-lg border p-3 space-y-1.5" style={{ backgroundColor: S.input, borderColor: S.border }}>
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm" style={{ color: '#c4c4d0' }}>
            {ordered ? (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5" style={{ backgroundColor: color }}>{i + 1}</span>
            ) : (
              <span className="shrink-0" style={{ color }}>●</span>
            )}
            <span className="flex-1 leading-relaxed">{it}</span>
          </li>
        ))}
      </Tag>
    </div>
  )
}

function InputField({ m, form, setForm, brandColor }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>
        {m.label}{m.tip && <span className="font-normal normal-case ml-1" style={{ color: S.faint }}>· {m.tip}</span>}
      </label>
      <input type="number" value={form[m.key]}
        onChange={e => setForm(f => ({ ...f, [m.key]: e.target.value }))}
        placeholder=""
        className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all"
        style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
        onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}15` }}
        onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }} />
    </div>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="h-[170px] flex items-center justify-center">
      <p className="text-sm" style={{ color: S.faint }}>{label}</p>
    </div>
  )
}

function Sel({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange} className="text-sm rounded-xl px-3 py-2 focus:outline-none"
      style={{ backgroundColor: '#111118', border: '1px solid #2a2a38', color: '#fff' }}>
      {children}
    </select>
  )
}

export default function Diagnostico() {
  return <DiagContent />
}
