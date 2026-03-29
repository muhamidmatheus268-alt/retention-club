import { useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const S = { bg: '#13131f', border: '#1e1e2a', input: '#0c0c10', ib: '#2a2a38', muted: '#555568', faint: '#444455' }

function fmtBRL(v) { if (!v && v !== 0) return '—'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtInt(v) { if (!v && v !== 0) return '—'; return Number(v).toLocaleString('pt-BR') }
function fmtPct(v) { if (!v && v !== 0) return '—'; return `${Number(v).toFixed(1)}%` }

const EMPTY_EMAIL    = { base_total: '', taxa_abertura: '', taxa_cliques: '', taxa_conversao: '', ticket_medio: '' }
const EMPTY_WPP      = { base_total: '', tipo_template: 'marketing', taxa_resposta: '', taxa_conversao: '', ticket_medio: '' }
const EMPTY_SMS      = { base_total: '', taxa_cliques: '', taxa_conversao: '', ticket_medio: '' }
const CASHBACK_STEPS = [
  { key: 'base',          label: 'Tamanho da base',              placeholder: '10000' },
  { key: 'pct_elegivel',  label: '% elegível para cashback',     placeholder: '30' },
  { key: 'valor_cashback',label: 'Valor do cashback (R$)',        placeholder: '20' },
  { key: 'taxa_resgate',  label: 'Taxa de resgate esperada (%)',  placeholder: '40' },
  { key: 'ticket_medio',  label: 'Ticket médio (R$)',             placeholder: '150' },
]

function calcEmail(f) {
  const base = parseFloat(f.base_total) || 0
  const abertura = (parseFloat(f.taxa_abertura) || 0) / 100
  const cliques  = (parseFloat(f.taxa_cliques)  || 0) / 100
  const conv     = (parseFloat(f.taxa_conversao) || 0) / 100
  const ticket   = parseFloat(f.ticket_medio) || 0
  return { base, abertos: Math.round(base * abertura), clicados: Math.round(base * abertura * cliques), convertidos: Math.round(base * conv), receita: Math.round(base * conv) * ticket }
}
function calcWpp(f) {
  const base     = parseFloat(f.base_total) || 0
  const resposta = (parseFloat(f.taxa_resposta) || 0) / 100
  const conv     = (parseFloat(f.taxa_conversao) || 0) / 100
  const ticket   = parseFloat(f.ticket_medio) || 0
  const receita  = Math.round(base * conv) * ticket
  const custoEnvio = base * (f.tipo_template === 'utilidade' ? 0.06 : 0.35) * 1.1215
  return { base, responderam: Math.round(base * resposta), convertidos: Math.round(base * conv), receita, custoEnvio, roi: custoEnvio > 0 ? ((receita / custoEnvio) - 1) * 100 : null }
}
function calcSMS(f) {
  const base  = parseFloat(f.base_total) || 0
  const cl    = (parseFloat(f.taxa_cliques) || 0) / 100
  const conv  = (parseFloat(f.taxa_conversao) || 0) / 100
  const ticket = parseFloat(f.ticket_medio) || 0
  return { base, clicaram: Math.round(base * cl), convertidos: Math.round(base * conv), receita: Math.round(base * conv) * ticket }
}
function calcCashback(f) {
  const base       = parseFloat(f.base) || 0
  const elegivel   = Math.round(base * ((parseFloat(f.pct_elegivel) || 0) / 100))
  const resgataram = Math.round(elegivel * ((parseFloat(f.taxa_resgate) || 0) / 100))
  const custo      = resgataram * (parseFloat(f.valor_cashback) || 0)
  const receita    = resgataram * (parseFloat(f.ticket_medio) || 0)
  return { elegivel, resgataram, custoTotal: custo, receita, roi: custo > 0 ? ((receita - custo) / custo) * 100 : null }
}

function ProjContent() {
  const { brandColor } = useClient()
  const now = new Date()
  const [canal, setCanal]     = useState('email')
  const [mes, setMes]         = useState(now.getMonth() + 1)
  const [ano, setAno]         = useState(now.getFullYear())
  const [emailForm, setEmailForm]     = useState(EMPTY_EMAIL)
  const [wppForm, setWppForm]         = useState(EMPTY_WPP)
  const [smsForm, setSmsForm]         = useState(EMPTY_SMS)
  const [cashbackForm, setCashbackForm] = useState(Object.fromEntries(CASHBACK_STEPS.map(s => [s.key, ''])))

  const emailResult    = calcEmail(emailForm)
  const wppResult      = calcWpp(wppForm)
  const smsResult      = calcSMS(smsForm)
  const cashbackResult = calcCashback(cashbackForm)

  const CANAIS = [
    { key: 'email',    label: 'Email' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'sms',      label: 'SMS' },
    { key: 'cashback', label: 'Cashback' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Funil de Projeção</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Calcule o potencial de receita por canal</p>
        </div>
        <div className="flex gap-2">
          <Sel value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MONTH_NAMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
          </Sel>
          <Sel value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Sel>
        </div>
      </div>

      {/* Canal tabs */}
      <div className="flex gap-1.5 mb-8 flex-wrap">
        {CANAIS.map(c => (
          <button key={c.key} onClick={() => setCanal(c.key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={canal === c.key ? { backgroundColor: brandColor, color: '#fff' } : { backgroundColor: '#17171f', color: '#6b6b80', border: '1px solid #2a2a38' }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Email */}
      {canal === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjPanel title="Parâmetros" brandColor={brandColor}>
            <ProjField label="Base Total"           value={emailForm.base_total}    onChange={v => setEmailForm(f => ({ ...f, base_total: v }))}    placeholder="10000" brandColor={brandColor} />
            <ProjField label="Taxa de Abertura (%)" value={emailForm.taxa_abertura} onChange={v => setEmailForm(f => ({ ...f, taxa_abertura: v }))} placeholder="25"    brandColor={brandColor} />
            <ProjField label="Taxa de Cliques (%)"  value={emailForm.taxa_cliques}  onChange={v => setEmailForm(f => ({ ...f, taxa_cliques: v }))}  placeholder="3"     brandColor={brandColor} />
            <ProjField label="Taxa de Conversão (%)"value={emailForm.taxa_conversao}onChange={v => setEmailForm(f => ({ ...f, taxa_conversao: v }))}placeholder="1.5"  brandColor={brandColor} />
            <ProjField label="Ticket Médio (R$)"    value={emailForm.ticket_medio}  onChange={v => setEmailForm(f => ({ ...f, ticket_medio: v }))}  placeholder="150"   brandColor={brandColor} />
          </ProjPanel>
          <div className="space-y-3">
            <FunnelCard label="Base"        value={fmtInt(emailResult.base)}        sub=""                                                    color={brandColor} width={100} />
            <FunnelCard label="Abriram"     value={fmtInt(emailResult.abertos)}     sub={emailForm.taxa_abertura ? fmtPct(emailForm.taxa_abertura) : ''} color={brandColor} width={70} />
            <FunnelCard label="Clicaram"    value={fmtInt(emailResult.clicados)}    sub={emailForm.taxa_cliques  ? fmtPct(emailForm.taxa_cliques)  : ''} color={brandColor} width={45} />
            <FunnelCard label="Converteram" value={fmtInt(emailResult.convertidos)} sub={emailForm.taxa_conversao? fmtPct(emailForm.taxa_conversao): ''} color={brandColor} width={25} />
            <ReceitaCard receita={emailResult.receita} mes={mes} ano={ano} brandColor={brandColor} />
          </div>
        </div>
      )}

      {/* WhatsApp */}
      {canal === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjPanel title="Parâmetros" brandColor={brandColor}>
            <ProjField label="Base Total" value={wppForm.base_total} onChange={v => setWppForm(f => ({ ...f, base_total: v }))} placeholder="5000" brandColor={brandColor} />
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>Tipo de Template</label>
              <div className="flex gap-2">
                {[{ v: 'marketing', label: 'Marketing · R$0,35' }, { v: 'utilidade', label: 'Utilidade · R$0,06' }].map(opt => (
                  <button key={opt.v} onClick={() => setWppForm(f => ({ ...f, tipo_template: opt.v }))}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
                    style={wppForm.tipo_template === opt.v ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' } : { borderColor: S.ib, color: '#6b6b80' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <ProjField label="Taxa de Resposta (%)"   value={wppForm.taxa_resposta}  onChange={v => setWppForm(f => ({ ...f, taxa_resposta: v }))}  placeholder="15" brandColor={brandColor} />
            <ProjField label="Taxa de Conversão (%)"  value={wppForm.taxa_conversao} onChange={v => setWppForm(f => ({ ...f, taxa_conversao: v }))} placeholder="2"  brandColor={brandColor} />
            <ProjField label="Ticket Médio (R$)"      value={wppForm.ticket_medio}   onChange={v => setWppForm(f => ({ ...f, ticket_medio: v }))}   placeholder="180" brandColor={brandColor} />
          </ProjPanel>
          <div className="space-y-3">
            <FunnelCard label="Enviados"    value={fmtInt(wppResult.base)}        sub="" color={brandColor} width={100} />
            <FunnelCard label="Responderam" value={fmtInt(wppResult.responderam)} sub={wppForm.taxa_resposta ? fmtPct(wppForm.taxa_resposta) : ''} color={brandColor} width={60} />
            <FunnelCard label="Converteram" value={fmtInt(wppResult.convertidos)} sub={wppForm.taxa_conversao ? fmtPct(wppForm.taxa_conversao) : ''} color={brandColor} width={30} />
            <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: S.bg, borderColor: S.border }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>Custo de Envio</p>
              <p className="text-white font-bold">{fmtBRL(wppResult.custoEnvio)}</p>
            </div>
            <ReceitaCard receita={wppResult.receita} mes={mes} ano={ano} brandColor={brandColor} roi={wppResult.roi} />
          </div>
        </div>
      )}

      {/* SMS */}
      {canal === 'sms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjPanel title="Parâmetros" brandColor={brandColor}>
            <ProjField label="Base Total"            value={smsForm.base_total}    onChange={v => setSmsForm(f => ({ ...f, base_total: v }))}    placeholder="8000" brandColor={brandColor} />
            <ProjField label="Taxa de Cliques (%)"   value={smsForm.taxa_cliques}  onChange={v => setSmsForm(f => ({ ...f, taxa_cliques: v }))}  placeholder="8"    brandColor={brandColor} />
            <ProjField label="Taxa de Conversão (%)" value={smsForm.taxa_conversao}onChange={v => setSmsForm(f => ({ ...f, taxa_conversao: v }))}placeholder="2"    brandColor={brandColor} />
            <ProjField label="Ticket Médio (R$)"     value={smsForm.ticket_medio}  onChange={v => setSmsForm(f => ({ ...f, ticket_medio: v }))}  placeholder="130"  brandColor={brandColor} />
          </ProjPanel>
          <div className="space-y-3">
            <FunnelCard label="Enviados"    value={fmtInt(smsResult.base)}        sub="" color={brandColor} width={100} />
            <FunnelCard label="Clicaram"    value={fmtInt(smsResult.clicaram)}    sub={smsForm.taxa_cliques   ? fmtPct(smsForm.taxa_cliques)   : ''} color={brandColor} width={55} />
            <FunnelCard label="Converteram" value={fmtInt(smsResult.convertidos)} sub={smsForm.taxa_conversao ? fmtPct(smsForm.taxa_conversao) : ''} color={brandColor} width={25} />
            <ReceitaCard receita={smsResult.receita} mes={mes} ano={ano} brandColor={brandColor} />
          </div>
        </div>
      )}

      {/* Cashback */}
      {canal === 'cashback' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjPanel title="Parâmetros do Cashback" brandColor={brandColor}>
            {CASHBACK_STEPS.map(s => (
              <ProjField key={s.key} label={s.label} value={cashbackForm[s.key]}
                onChange={v => setCashbackForm(f => ({ ...f, [s.key]: v }))}
                placeholder={s.placeholder} brandColor={brandColor} />
            ))}
          </ProjPanel>
          <div className="space-y-3">
            <FunnelCard label="Base Total"  value={fmtInt(cashbackForm.base)}         sub="" color={brandColor} width={100} />
            <FunnelCard label="Elegíveis"   value={fmtInt(cashbackResult.elegivel)}   sub={cashbackForm.pct_elegivel ? fmtPct(cashbackForm.pct_elegivel) : ''} color={brandColor} width={70} />
            <FunnelCard label="Resgataram"  value={fmtInt(cashbackResult.resgataram)} sub={cashbackForm.taxa_resgate ? fmtPct(cashbackForm.taxa_resgate) : ''} color={brandColor} width={40} />
            <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: S.bg, borderColor: S.border }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>Custo do Cashback</p>
              <p className="text-white font-bold">{fmtBRL(cashbackResult.custoTotal)}</p>
            </div>
            <ReceitaCard receita={cashbackResult.receita} mes={mes} ano={ano} brandColor={brandColor} roi={cashbackResult.roi} label="Receita Gerada" />
          </div>
        </div>
      )}
    </div>
  )
}

function ProjPanel({ title, children, brandColor }) {
  return (
    <div className="rounded-xl border p-6" style={{ backgroundColor: S.bg, borderColor: S.border }}>
      <p className="text-sm font-semibold text-white mb-5">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function ProjField({ label, value, onChange, placeholder, brandColor }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none transition-all"
        style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
        onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
        onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }}
      />
    </div>
  )
}

function FunnelCard({ label, value, sub, color, width }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: S.bg, borderColor: S.border }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.muted }}>{label}</span>
        {sub && <span className="text-xs" style={{ color: S.muted }}>{sub}</span>}
      </div>
      <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: '#1e1e2a' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <p className="text-white font-bold text-sm">{value}</p>
    </div>
  )
}

function ReceitaCard({ receita, mes, ano, brandColor, roi, label = 'Receita Projetada' }) {
  return (
    <div className="rounded-xl border px-5 py-4" style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${brandColor}` }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>{label}</p>
      <p className="text-2xl font-bold text-white">{fmtBRL(receita)}</p>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs" style={{ color: S.muted }}>{MONTH_NAMES[mes - 1]}/{ano}</span>
        {roi != null && <span className="text-xs font-semibold" style={{ color: roi > 0 ? '#48bb78' : '#fc8181' }}>ROI {roi.toFixed(0)}%</span>}
      </div>
    </div>
  )
}

function Sel({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange} className="text-sm rounded-lg px-3 py-1.5 focus:outline-none"
      style={{ backgroundColor: '#17171f', border: '1px solid #2a2a38', color: '#fff' }}>
      {children}
    </select>
  )
}

export default function Projecao() {
  return <AppLayout module="projecao"><ProjContent /></AppLayout>
}
