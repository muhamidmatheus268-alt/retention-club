import { useState } from 'react'
import { useClient } from '../contexts/ClientContext'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const S = {
  bg: '#0c0c10', card: '#111118', panel: '#13131f',
  border: '#1e1e2a', ib: '#2a2a38',
  input: '#080810', muted: '#555568', faint: '#444455',
}

/* ── formatters ── */
function fmtBRL(v)  { if (!v && v !== 0) return ''; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtBRLs(v) { if (!v && v !== 0) return ''; if (v >= 1000000) return `R$${(v/1000000).toFixed(1)}M`; if (v >= 1000) return `R$${(v/1000).toFixed(1)}k`; return fmtBRL(v) }
function fmtInt(v)  { if (!v && v !== 0) return ''; return Number(v).toLocaleString('pt-BR') }
function fmtPct(v)  { if (!v && v !== 0) return ''; return `${Number(v).toFixed(1)}%` }
function n(v)       { return parseFloat(v) || 0 }

/* ── calculators ── */
function calcEmail(f) {
  const base = n(f.base_total)
  const abertura = n(f.taxa_abertura) / 100
  const cliques  = n(f.taxa_cliques)  / 100
  const conv     = n(f.taxa_conversao) / 100
  const ticket   = n(f.ticket_medio)
  const abertos     = Math.round(base * abertura)
  const clicados    = Math.round(abertos * cliques)
  const convertidos = Math.round(base * conv)
  return { base, abertos, clicados, convertidos, receita: convertidos * ticket }
}
function calcWpp(f) {
  const base     = n(f.base_total)
  const resposta = n(f.taxa_resposta)  / 100
  const conv     = n(f.taxa_conversao) / 100
  const ticket   = n(f.ticket_medio)
  const convertidos = Math.round(base * conv)
  const receita     = convertidos * ticket
  const custoEnvio  = base * (f.tipo_template === 'utilidade' ? 0.06 : 0.35) * 1.1215
  return { base, responderam: Math.round(base * resposta), convertidos, receita, custoEnvio, roi: custoEnvio > 0 ? ((receita / custoEnvio) - 1) * 100 : null }
}
function calcSMS(f) {
  const base    = n(f.base_total)
  const cl      = n(f.taxa_cliques)   / 100
  const conv    = n(f.taxa_conversao) / 100
  const ticket  = n(f.ticket_medio)
  const convertidos = Math.round(base * conv)
  return { base, clicaram: Math.round(base * cl), convertidos, receita: convertidos * ticket }
}
function calcCashback(f) {
  const base       = n(f.base)
  const elegivel   = Math.round(base * (n(f.pct_elegivel) / 100))
  const resgataram = Math.round(elegivel * (n(f.taxa_resgate) / 100))
  const custo      = resgataram * n(f.valor_cashback)
  const receita    = resgataram * n(f.ticket_medio)
  return { base, elegivel, resgataram, custoTotal: custo, receita, roi: custo > 0 ? ((receita - custo) / custo) * 100 : null }
}

/* ── scenario multiplier helper ── */
function applyMultiplier(form, mult, fields) {
  const out = { ...form }
  fields.forEach(k => { out[k] = String(Math.round(n(form[k]) * mult * 10) / 10) })
  return out
}

const EMPTY_EMAIL    = { base_total: '', taxa_abertura: '', taxa_cliques: '', taxa_conversao: '', ticket_medio: '' }
const EMPTY_WPP      = { base_total: '', tipo_template: 'marketing', taxa_resposta: '', taxa_conversao: '', ticket_medio: '' }
const EMPTY_SMS      = { base_total: '', taxa_cliques: '', taxa_conversao: '', ticket_medio: '' }
const EMPTY_CASHBACK = { base: '', pct_elegivel: '', valor_cashback: '', taxa_resgate: '', ticket_medio: '' }

/* ═══════════════════════════════════════════════ VISUAL FUNNEL ═══ */
function VisualFunnel({ steps, brandColor }) {
  return (
    <div className="space-y-0 py-2">
      {steps.map((step, i) => {
        const fill = Math.max(step.widthPct || 0, 0)
        const hex2 = Math.round(40 + fill * 1.4).toString(16).padStart(2, '0')
        return (
          <div key={i}>
            <div className="relative h-12 rounded-xl overflow-hidden cursor-default"
              style={{ backgroundColor: '#0d0d14' }}>
              {/* Background fill bar */}
              <div className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                style={{ width: `${fill}%`, backgroundColor: brandColor + hex2 }} />
              {/* Left accent line */}
              <div className="absolute inset-y-0 left-0 w-0.5 transition-all duration-700"
                style={{ backgroundColor: fill > 0 ? brandColor : 'transparent', opacity: 0.6 }} />
              {/* Content */}
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black"
                    style={{ backgroundColor: brandColor + '25', color: brandColor }}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white leading-none">{step.label}</p>
                    {step.rate && <p className="text-[10px] mt-0.5" style={{ color: brandColor + 'aa' }}>{step.rate}</p>}
                  </div>
                </div>
                <span className="text-base font-bold text-white tabular-nums">
                  {step.value || <span style={{ color: S.faint }}>—</span>}
                </span>
              </div>
            </div>
            {/* Arrow connector */}
            {i < steps.length - 1 && (
              <div className="flex justify-center my-px">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M5 6L0 0h10L5 6z" fill={fill > 0 ? brandColor + '40' : '#1e1e2a'} />
                </svg>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════ SCENARIO CARD ═══ */
function ScenarioCard({ label, emoji, color, receita, roi, steps, brandColor }) {
  return (
    <div className="rounded-2xl border flex flex-col"
      style={{ backgroundColor: S.card, borderColor: S.border, borderTop: `2px solid ${color}` }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: S.border }}>
        <div className="flex items-center gap-2 mb-1">
          <span>{emoji}</span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
        </div>
        <p className="text-2xl font-bold text-white leading-none">{fmtBRLs(receita)}</p>
        {roi != null && (
          <p className="text-xs mt-1 font-semibold" style={{ color: roi > 0 ? '#10b981' : '#ef4444' }}>
            ROI {roi.toFixed(0)}%
          </p>
        )}
      </div>
      <div className="px-4 py-3 flex-1 space-y-1.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: S.muted }}>{s.label}</span>
            <span className="text-[11px] font-semibold text-white">{s.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════ FORM FIELD ═══ */
function ProjField({ label, value, onChange, placeholder, brandColor, type = 'number' }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all"
        style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
        onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}15` }}
        onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════ MAIN ═══ */
function ProjContent() {
  const { client, brandColor } = useClient()
  const now = new Date()
  const [tab, setTab]     = useState('calc')  // 'calc' | 'cenarios'
  const [canal, setCanal] = useState('email')
  const [mes, setMes]     = useState(now.getMonth() + 1)
  const [ano, setAno]     = useState(now.getFullYear())
  const [emailForm, setEmailForm]   = useState(EMPTY_EMAIL)
  const [wppForm, setWppForm]       = useState(EMPTY_WPP)
  const [smsForm, setSmsForm]       = useState(EMPTY_SMS)
  const [cbForm, setCbForm]         = useState(EMPTY_CASHBACK)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState('')
  const [aiToast, setAiToast]       = useState('')

  async function handleAutoFill(scenario = 'realista') {
    if (!client) return
    setAiLoading(true); setAiError('')
    try {
      const res = await fetch('/api/forecast-autofill', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, months: 3 }),
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error || 'Erro'); setAiLoading(false); return }
      const src = data.scenarios?.[scenario] || data.averages || {}
      const s = v => v != null ? String(v) : ''

      if (canal === 'email') {
        setEmailForm(f => ({
          ...f,
          base_total:     s(src.base_total),
          taxa_abertura:  s(src.taxa_abertura),
          taxa_cliques:   s(src.taxa_cliques),
          taxa_conversao: s(src.taxa_conversao),
          ticket_medio:   s(src.ticket_medio),
        }))
      } else if (canal === 'whatsapp') {
        setWppForm(f => ({
          ...f,
          base_total:     s(src.base_total),
          taxa_resposta:  s(src.taxa_resposta),
          taxa_conversao: s(src.taxa_conversao),
          ticket_medio:   s(src.ticket_medio),
        }))
      } else if (canal === 'sms') {
        setSmsForm(f => ({
          ...f,
          base_total:     s(src.base_total),
          taxa_cliques:   s(src.taxa_cliques),
          taxa_conversao: s(src.taxa_conversao),
          ticket_medio:   s(src.ticket_medio),
        }))
      } else if (canal === 'cashback') {
        setCbForm(f => ({
          ...f,
          base:          s(src.base_ativa || src.base_total),
          taxa_resgate:  s(src.taxa_recompra),
          ticket_medio:  s(src.ticket_medio),
        }))
      }
      setAiToast(`Campos preenchidos com base em ${data.based_on} mês(es) · cenário ${scenario}`)
      setTimeout(() => setAiToast(''), 3500)
    } catch (e) { setAiError(e.message) }
    setAiLoading(false)
  }

  const emailRes = calcEmail(emailForm)
  const wppRes   = calcWpp(wppForm)
  const smsRes   = calcSMS(smsForm)
  const cbRes    = calcCashback(cbForm)

  const CANAIS = [
    { key: 'email',    label: '✉ Email'     },
    { key: 'whatsapp', label: '📱 WhatsApp' },
    { key: 'sms',      label: '💬 SMS'      },
    { key: 'cashback', label: '💰 Cashback' },
  ]

  /* ── email funnel steps ── */
  const emailSteps = [
    { label: 'Base total',    value: fmtInt(emailRes.base),        rate: '',                                                                widthPct: 100 },
    { label: 'Abriram',       value: fmtInt(emailRes.abertos),     rate: emailForm.taxa_abertura  ? fmtPct(emailForm.taxa_abertura)  : '', widthPct: n(emailForm.taxa_abertura) * 2.5 },
    { label: 'Clicaram',      value: fmtInt(emailRes.clicados),    rate: emailForm.taxa_cliques   ? fmtPct(emailForm.taxa_cliques)   : '', widthPct: n(emailForm.taxa_cliques)  * 5 },
    { label: 'Converteram',   value: fmtInt(emailRes.convertidos), rate: emailForm.taxa_conversao ? fmtPct(emailForm.taxa_conversao) : '', widthPct: n(emailForm.taxa_conversao) * 15 },
  ]

  /* ── wpp funnel steps ── */
  const wppSteps = [
    { label: 'Enviados',    value: fmtInt(wppRes.base),         rate: '',                                                              widthPct: 100 },
    { label: 'Responderam', value: fmtInt(wppRes.responderam),  rate: wppForm.taxa_resposta  ? fmtPct(wppForm.taxa_resposta)  : '',   widthPct: n(wppForm.taxa_resposta) * 3 },
    { label: 'Converteram', value: fmtInt(wppRes.convertidos),  rate: wppForm.taxa_conversao ? fmtPct(wppForm.taxa_conversao) : '',   widthPct: n(wppForm.taxa_conversao) * 15 },
  ]

  /* ── sms funnel steps ── */
  const smsSteps = [
    { label: 'Enviados',    value: fmtInt(smsRes.base),         rate: '',                                                              widthPct: 100 },
    { label: 'Clicaram',    value: fmtInt(smsRes.clicaram),     rate: smsForm.taxa_cliques   ? fmtPct(smsForm.taxa_cliques)   : '',   widthPct: n(smsForm.taxa_cliques) * 5 },
    { label: 'Converteram', value: fmtInt(smsRes.convertidos),  rate: smsForm.taxa_conversao ? fmtPct(smsForm.taxa_conversao) : '',   widthPct: n(smsForm.taxa_conversao) * 15 },
  ]

  /* ── cashback funnel steps ── */
  const cbSteps = [
    { label: 'Base total',   value: fmtInt(n(cbForm.base)),      rate: '',                                                              widthPct: 100 },
    { label: 'Elegíveis',    value: fmtInt(cbRes.elegivel),       rate: cbForm.pct_elegivel   ? fmtPct(cbForm.pct_elegivel)   : '',    widthPct: n(cbForm.pct_elegivel) },
    { label: 'Resgataram',   value: fmtInt(cbRes.resgataram),     rate: cbForm.taxa_resgate   ? fmtPct(cbForm.taxa_resgate)   : '',    widthPct: n(cbForm.pct_elegivel) * n(cbForm.taxa_resgate) / 100 },
  ]

  /* ── scenarios (email-only for now) ── */
  const SCENARIO_MULT = [
    { label: 'Pessimista', emoji: '🔴', color: '#ef4444', mult: 0.65 },
    { label: 'Realista',   emoji: '🟡', color: '#f59e0b', mult: 1.0  },
    { label: 'Otimista',   emoji: '🟢', color: '#10b981', mult: 1.40 },
  ]

  function buildEmailScenario(mult) {
    const f = applyMultiplier(emailForm, mult, ['taxa_abertura', 'taxa_cliques', 'taxa_conversao'])
    const r = calcEmail(f)
    return { receita: r.receita, roi: null, steps: [
      { label: 'Abertos',     value: fmtInt(r.abertos)     },
      { label: 'Clicados',    value: fmtInt(r.clicados)    },
      { label: 'Convertidos', value: fmtInt(r.convertidos) },
      { label: 'Ticket Médio',value: fmtBRL(n(emailForm.ticket_medio)) },
    ]}
  }
  function buildWppScenario(mult) {
    const f = applyMultiplier(wppForm, mult, ['taxa_resposta', 'taxa_conversao'])
    const r = calcWpp(f)
    return { receita: r.receita, roi: r.roi, steps: [
      { label: 'Responderam', value: fmtInt(r.responderam) },
      { label: 'Convertidos', value: fmtInt(r.convertidos) },
      { label: 'Custo envio', value: fmtBRL(r.custoEnvio)  },
      { label: 'Ticket Médio',value: fmtBRL(n(wppForm.ticket_medio)) },
    ]}
  }
  function buildCbScenario(mult) {
    const f = applyMultiplier(cbForm, mult, ['taxa_resgate'])
    const r = calcCashback(f)
    return { receita: r.receita - r.custoTotal, roi: r.roi, steps: [
      { label: 'Resgataram',  value: fmtInt(r.resgataram)   },
      { label: 'Custo',       value: fmtBRL(r.custoTotal)   },
      { label: 'Receita',     value: fmtBRL(r.receita)      },
      { label: 'Lucro',       value: fmtBRL(r.receita - r.custoTotal) },
    ]}
  }

  function buildScenario(mult) {
    if (canal === 'email')    return buildEmailScenario(mult)
    if (canal === 'whatsapp') return buildWppScenario(mult)
    if (canal === 'cashback') return buildCbScenario(mult)
    return buildEmailScenario(mult) // sms fallback → email calc
  }

  /* ── totals for multi-canal summary ── */
  const filledCanais = [
    n(emailForm.base_total) > 0 ? { label: 'Email',     receita: emailRes.receita } : null,
    n(wppForm.base_total)   > 0 ? { label: 'WhatsApp',  receita: wppRes.receita   } : null,
    n(smsForm.base_total)   > 0 ? { label: 'SMS',       receita: smsRes.receita   } : null,
    n(cbForm.base)          > 0 ? { label: 'Cashback',  receita: cbRes.receita    } : null,
  ].filter(Boolean)
  const totalReceita = filledCanais.reduce((s, c) => s + c.receita, 0)

  /* ── active funnel + form + result ── */
  let activeFunnel, activeReceita, activeROI = null, activeCusto = null
  let activeForm, setActiveForm

  if (canal === 'email') {
    activeFunnel  = emailSteps
    activeReceita = emailRes.receita
    activeForm    = emailForm
    setActiveForm = setEmailForm
  } else if (canal === 'whatsapp') {
    activeFunnel  = wppSteps
    activeReceita = wppRes.receita
    activeROI     = wppRes.roi
    activeCusto   = wppRes.custoEnvio
    activeForm    = wppForm
    setActiveForm = setWppForm
  } else if (canal === 'sms') {
    activeFunnel  = smsSteps
    activeReceita = smsRes.receita
    activeForm    = smsForm
    setActiveForm = setSmsForm
  } else {
    activeFunnel  = cbSteps
    activeReceita = cbRes.receita
    activeROI     = cbRes.roi
    activeCusto   = cbRes.custoTotal
    activeForm    = cbForm
    setActiveForm = setCbForm
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Funil de Projeção</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Calcule o potencial de receita por canal</p>
        </div>
        <div className="flex items-center gap-2">
          <Sel value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MONTH_NAMES.map((nm, i) => <option key={i} value={i + 1}>{nm}</option>)}
          </Sel>
          <Sel value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Sel>
        </div>
      </div>

      {/* Multi-canal total strip (only if 2+ canals filled) */}
      {filledCanais.length >= 2 && (
        <div className="rounded-2xl border p-4 mb-6 flex items-center gap-6 flex-wrap"
          style={{ backgroundColor: S.card, borderColor: S.border, borderLeft: `3px solid ${brandColor}` }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: S.faint }}>Total Multi-canal</p>
            <p className="text-3xl font-bold text-white">{fmtBRLs(totalReceita)}</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            {filledCanais.map(c => (
              <div key={c.label} className="flex flex-col">
                <span className="text-[10px]" style={{ color: S.muted }}>{c.label}</span>
                <span className="text-sm font-semibold text-white">{fmtBRLs(c.receita)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
        {[
          { key: 'calc',    label: '⚡ Calculadora' },
          { key: 'cenarios', label: '📊 Cenários'    },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-5 py-2 rounded-lg text-xs font-bold transition-all"
            style={tab === t.key ? { backgroundColor: brandColor, color: '#fff' } : { color: S.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* AI Auto-fill strip */}
      <div className="rounded-xl border p-3 mb-4 flex items-center gap-3 flex-wrap"
        style={{ background: `linear-gradient(135deg, ${brandColor}10, transparent)`, borderColor: brandColor + '40' }}>
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs font-semibold text-white">✨ Auto-preencher com dados reais do cliente</p>
          <p className="text-[11px]" style={{ color: S.muted }}>
            {aiToast || 'Média dos últimos 3 meses do Diagnóstico'}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => handleAutoFill('pessimista')} disabled={aiLoading}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-50"
            style={{ borderColor: '#ef444440', color: '#f87171' }}>
            🔴 Pessimista
          </button>
          <button onClick={() => handleAutoFill('realista')} disabled={aiLoading}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-50"
            style={{ borderColor: brandColor + '60', color: brandColor, backgroundColor: brandColor + '15' }}>
            {aiLoading ? '⏳' : '🟡'} Realista
          </button>
          <button onClick={() => handleAutoFill('otimista')} disabled={aiLoading}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-50"
            style={{ borderColor: '#10b98140', color: '#34d399' }}>
            🟢 Otimista
          </button>
        </div>
        {aiError && <p className="text-xs text-red-400 w-full">{aiError}</p>}
      </div>

      {/* Canal selector */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {CANAIS.map(c => (
          <button key={c.key} onClick={() => setCanal(c.key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
            style={canal === c.key
              ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' }
              : { backgroundColor: S.card, borderColor: S.border, color: S.muted }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ CALCULADORA TAB ══════════════════ */}
      {tab === 'calc' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Form — 2 cols */}
          <div className="lg:col-span-2 rounded-2xl border p-5 space-y-4"
            style={{ backgroundColor: S.card, borderColor: S.border }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: S.faint }}>Parâmetros</p>

            {canal === 'email' && <>
              <ProjField label="Base Total"            value={emailForm.base_total}    onChange={v => setEmailForm(f => ({...f, base_total: v}))}    placeholder="10000"  brandColor={brandColor} />
              <ProjField label="Taxa de Abertura (%)"  value={emailForm.taxa_abertura} onChange={v => setEmailForm(f => ({...f, taxa_abertura: v}))} placeholder="25"     brandColor={brandColor} />
              <ProjField label="Taxa de Cliques (%)"   value={emailForm.taxa_cliques}  onChange={v => setEmailForm(f => ({...f, taxa_cliques: v}))}  placeholder="3"      brandColor={brandColor} />
              <ProjField label="Taxa de Conversão (%)" value={emailForm.taxa_conversao}onChange={v => setEmailForm(f => ({...f, taxa_conversao: v}))}placeholder="1.5"   brandColor={brandColor} />
              <ProjField label="Ticket Médio (R$)"     value={emailForm.ticket_medio}  onChange={v => setEmailForm(f => ({...f, ticket_medio: v}))}  placeholder="150"    brandColor={brandColor} />
            </>}

            {canal === 'whatsapp' && <>
              <ProjField label="Base Total"            value={wppForm.base_total}    onChange={v => setWppForm(f => ({...f, base_total: v}))}    placeholder="5000"  brandColor={brandColor} />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>Tipo de Template</label>
                <div className="flex gap-2">
                  {[{ v: 'marketing', l: '📢 Marketing · R$0,35' }, { v: 'utilidade', l: '🔔 Utilidade · R$0,06' }].map(opt => (
                    <button key={opt.v} onClick={() => setWppForm(f => ({...f, tipo_template: opt.v}))}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
                      style={wppForm.tipo_template === opt.v
                        ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' }
                        : { borderColor: S.ib, color: S.muted }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <ProjField label="Taxa de Resposta (%)"   value={wppForm.taxa_resposta}  onChange={v => setWppForm(f => ({...f, taxa_resposta: v}))}  placeholder="15"  brandColor={brandColor} />
              <ProjField label="Taxa de Conversão (%)"  value={wppForm.taxa_conversao} onChange={v => setWppForm(f => ({...f, taxa_conversao: v}))} placeholder="2"   brandColor={brandColor} />
              <ProjField label="Ticket Médio (R$)"      value={wppForm.ticket_medio}   onChange={v => setWppForm(f => ({...f, ticket_medio: v}))}   placeholder="180" brandColor={brandColor} />
            </>}

            {canal === 'sms' && <>
              <ProjField label="Base Total"            value={smsForm.base_total}    onChange={v => setSmsForm(f => ({...f, base_total: v}))}    placeholder="8000" brandColor={brandColor} />
              <ProjField label="Taxa de Cliques (%)"   value={smsForm.taxa_cliques}  onChange={v => setSmsForm(f => ({...f, taxa_cliques: v}))}  placeholder="8"    brandColor={brandColor} />
              <ProjField label="Taxa de Conversão (%)" value={smsForm.taxa_conversao}onChange={v => setSmsForm(f => ({...f, taxa_conversao: v}))}placeholder="2"    brandColor={brandColor} />
              <ProjField label="Ticket Médio (R$)"     value={smsForm.ticket_medio}  onChange={v => setSmsForm(f => ({...f, ticket_medio: v}))}  placeholder="130"  brandColor={brandColor} />
            </>}

            {canal === 'cashback' && <>
              <ProjField label="Tamanho da base"            value={cbForm.base}           onChange={v => setCbForm(f => ({...f, base: v}))}           placeholder="10000" brandColor={brandColor} />
              <ProjField label="% elegível para cashback"   value={cbForm.pct_elegivel}   onChange={v => setCbForm(f => ({...f, pct_elegivel: v}))}   placeholder="30"    brandColor={brandColor} />
              <ProjField label="Valor do cashback (R$)"     value={cbForm.valor_cashback} onChange={v => setCbForm(f => ({...f, valor_cashback: v}))} placeholder="20"    brandColor={brandColor} />
              <ProjField label="Taxa de resgate (%)"        value={cbForm.taxa_resgate}   onChange={v => setCbForm(f => ({...f, taxa_resgate: v}))}   placeholder="40"    brandColor={brandColor} />
              <ProjField label="Ticket médio (R$)"          value={cbForm.ticket_medio}   onChange={v => setCbForm(f => ({...f, ticket_medio: v}))}   placeholder="150"   brandColor={brandColor} />
            </>}
          </div>

          {/* Funnel — 3 cols */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* Visual funnel */}
            <div className="rounded-2xl border p-5 flex-1"
              style={{ backgroundColor: S.card, borderColor: S.border }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: S.faint }}>Funil de Conversão</p>
              <VisualFunnel steps={activeFunnel} brandColor={brandColor} />
            </div>

            {/* Result cards */}
            <div className={`grid gap-3 ${activeCusto != null ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {activeCusto != null && (
                <div className="rounded-2xl border px-5 py-4"
                  style={{ backgroundColor: S.card, borderColor: S.border }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>
                    {canal === 'whatsapp' ? 'Custo de Envio' : 'Custo Cashback'}
                  </p>
                  <p className="text-xl font-bold text-white">{fmtBRL(activeCusto)}</p>
                </div>
              )}
              <div className="rounded-2xl border px-5 py-4 flex flex-col justify-between"
                style={{ backgroundColor: S.card, borderColor: S.border, borderLeft: `3px solid ${brandColor}` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.muted }}>
                  {canal === 'cashback' ? 'Receita Gerada' : 'Receita Projetada'}
                </p>
                <div>
                  <p className="text-3xl font-bold text-white mt-1">{fmtBRLs(activeReceita)}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: S.muted }}>{MONTH_NAMES[mes - 1]}/{ano}</span>
                    {activeROI != null && (
                      <span className="text-xs font-bold" style={{ color: activeROI > 0 ? '#10b981' : '#ef4444' }}>
                        ROI {activeROI.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ CENÁRIOS TAB ══════════════════ */}
      {tab === 'cenarios' && (
        <div>
          {/* Check if form has base data */}
          {(canal === 'email'    && !n(emailForm.base_total)) ||
           (canal === 'whatsapp' && !n(wppForm.base_total))   ||
           (canal === 'sms'      && !n(smsForm.base_total))   ||
           (canal === 'cashback' && !n(cbForm.base)) ? (
            <div className="text-center py-20 rounded-2xl border" style={{ borderColor: S.border }}>
              <p className="text-4xl mb-3">📊</p>
              <p className="text-white font-semibold mb-1">Preencha a Calculadora primeiro</p>
              <p className="text-sm" style={{ color: S.muted }}>
                Acesse a aba <strong className="text-white">Calculadora</strong>, preencha os parâmetros e volte aqui.
              </p>
              <button onClick={() => setTab('calc')}
                className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: brandColor }}>
                Ir para Calculadora →
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: S.faint }}>
                Projeção de cenários · {CANAIS.find(c => c.key === canal)?.label} · {MONTH_NAMES[mes - 1]}/{ano}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SCENARIO_MULT.map(sc => {
                  const data = buildScenario(sc.mult)
                  return (
                    <ScenarioCard
                      key={sc.label}
                      label={sc.label}
                      emoji={sc.emoji}
                      color={sc.color}
                      receita={data.receita}
                      roi={data.roi}
                      steps={data.steps}
                      brandColor={brandColor}
                    />
                  )
                })}
              </div>

              {/* Multiplier legend */}
              <div className="mt-4 rounded-xl border p-4 flex flex-wrap gap-4"
                style={{ backgroundColor: S.card, borderColor: S.border }}>
                <p className="text-[10px] font-bold uppercase tracking-widest w-full" style={{ color: S.faint }}>
                  Multiplicadores aplicados sobre as taxas base
                </p>
                {SCENARIO_MULT.map(sc => (
                  <div key={sc.label} className="flex items-center gap-2">
                    <span className="text-sm">{sc.emoji}</span>
                    <span className="text-xs font-semibold" style={{ color: sc.color }}>{sc.label}</span>
                    <span className="text-xs" style={{ color: S.muted }}>×{sc.mult.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
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

export default function Projecao() {
  return <ProjContent />
}
