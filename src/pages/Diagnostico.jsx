import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const METRICS = [
  { key: 'base_total',       label: 'Base Total',       type: 'int', tip: '' },
  { key: 'base_ativa',       label: 'Base Ativa',       type: 'int', tip: '90d' },
  { key: 'emails_enviados',  label: 'Enviados',         type: 'int', tip: '' },
  { key: 'emails_agendados', label: 'Agendados',        type: 'int', tip: '' },
  { key: 'taxa_entrega',     label: 'Entrega %',        type: 'pct', tip: '' },
  { key: 'taxa_abertura',    label: 'Abertura %',       type: 'pct', tip: '' },
  { key: 'taxa_cliques',     label: 'Cliques %',        type: 'pct', tip: '' },
  { key: 'taxa_conversao',   label: 'Conversão %',      type: 'pct', tip: '' },
  { key: 'receita',          label: 'Receita',          type: 'brl', tip: '' },
  { key: 'meta_receita',     label: 'Meta',             type: 'brl', tip: '' },
  { key: 'ticket_medio',     label: 'Ticket Médio',     type: 'brl', tip: '' },
  { key: 'rpa',              label: 'RPA',              type: 'brl', tip: 'Receita/automação' },
  { key: 'rpe',              label: 'RPE',              type: 'brl', tip: 'Receita/envio' },
]

const EMPTY = Object.fromEntries(METRICS.map(m => [m.key, '']))

function fmtBRL(v) { if (v == null || v === '') return '—'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtPct(v) { if (v == null || v === '') return '—'; return `${Number(v).toFixed(1)}%` }
function fmtInt(v) { if (v == null || v === '') return '—'; return Number(v).toLocaleString('pt-BR') }
function fmt(m, v) { return m.type === 'brl' ? fmtBRL(v) : m.type === 'pct' ? fmtPct(v) : fmtInt(v) }

function DiagContent() {
  const { client, brandColor } = useClient()
  const now = new Date()
  const [mes, setMes]     = useState(now.getMonth() + 1)
  const [ano, setAno]     = useState(now.getFullYear())
  const [form, setForm]   = useState(EMPTY)
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const fetchRecord = useCallback(async () => {
    if (!client) return
    const { data } = await supabase
      .from('bi_email_metrics').select('*')
      .eq('client_id', client.id).eq('mes', mes).eq('ano', ano).single()
    if (data) { setRecord(data); setForm(Object.fromEntries(METRICS.map(m => [m.key, data[m.key] != null ? String(data[m.key]) : '']))) }
    else { setRecord(null); setForm(EMPTY) }
  }, [client, mes, ano])

  useEffect(() => { fetchRecord() }, [fetchRecord])

  async function handleSave() {
    if (!client) return
    setSaving(true)
    const payload = { client_id: client.id, mes, ano, ...Object.fromEntries(METRICS.map(m => [m.key, form[m.key] !== '' ? parseFloat(form[m.key]) : null])) }
    if (record?.id) { await supabase.from('bi_email_metrics').update(payload).eq('id', record.id) }
    else { const { data } = await supabase.from('bi_email_metrics').insert(payload).select().single(); if (data) setRecord(data) }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    await fetchRecord()
  }

  if (!client) return <div className="flex h-full items-center justify-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  const receitaVal = parseFloat(form.receita) || 0
  const metaVal    = parseFloat(form.meta_receita) || 0
  const metaPct    = metaVal > 0 ? Math.min((receitaVal / metaVal) * 100, 100) : 0
  const baseRatio  = parseFloat(form.base_ativa) && parseFloat(form.base_total)
    ? ((parseFloat(form.base_ativa) / parseFloat(form.base_total)) * 100).toFixed(1) : null

  const S = { bg: '#13131f', border: '#1e1e2a', input: '#0c0c10', inputBorder: '#2a2a38', muted: '#555568', faint: '#444455' }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Diagnóstico</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Performance mensal · Email</p>
        </div>
        <div className="flex gap-2">
          <Sel value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MONTH_NAMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
          </Sel>
          <Sel value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </Sel>
        </div>
      </div>

      {/* KPI cards */}
      {record && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[['Receita', fmtBRL(record.receita)], ['Abertura', fmtPct(record.taxa_abertura)], ['Conversão', fmtPct(record.taxa_conversao)], ['Ticket Médio', fmtBRL(record.ticket_medio)]].map(([l, v]) => (
            <div key={l} className="rounded-xl p-4 border" style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${brandColor}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.muted }}>{l}</p>
              <p className="text-white font-bold text-xl">{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bars */}
      {metaVal > 0 && <ProgressBar label="Meta vs Realizado" pct={metaPct} left={fmtBRL(receitaVal)} right={`meta ${fmtBRL(metaVal)}`} brandColor={brandColor} S={S} />}
      {baseRatio && <ProgressBar label="Base Ativa" pct={Number(baseRatio)} left={`${baseRatio}%`} right="" brandColor={brandColor + 'aa'} S={S} />}

      {/* Form */}
      <div className="rounded-xl border p-6 mt-2" style={{ backgroundColor: S.bg, borderColor: S.border }}>
        <p className="text-sm font-semibold text-white mb-5">{MONTH_NAMES[mes - 1]} / {ano}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {METRICS.map(m => (
            <div key={m.key}>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>
                {m.label}{m.tip ? <span className="font-normal normal-case ml-1" style={{ color: S.faint }}>· {m.tip}</span> : ''}
              </label>
              <input type="number" value={form[m.key]} onChange={e => setForm(f => ({ ...f, [m.key]: e.target.value }))}
                placeholder="—" className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none transition-all"
                style={{ backgroundColor: S.input, border: `1px solid ${S.inputBorder}`, color: '#fff' }}
                onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
                onBlur={e => { e.target.style.borderColor = S.inputBorder; e.target.style.boxShadow = '' }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: brandColor }}>
            {saving ? 'Salvando…' : saved ? '✓ Salvo!' : record ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      {record && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {METRICS.filter(m => record[m.key] != null).map(m => (
            <div key={m.key} className="rounded-lg px-4 py-3 border" style={{ backgroundColor: S.bg, borderColor: S.border }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>{m.label}</p>
              <p className="text-white font-bold">{fmt(m, record[m.key])}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProgressBar({ label, pct, left, right, brandColor, S }) {
  return (
    <div className="rounded-xl border px-5 py-4 mb-3" style={{ backgroundColor: S.bg, borderColor: S.border }}>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-sm font-bold" style={{ color: brandColor }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#1e1e2a' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: brandColor }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs" style={{ color: S.muted }}>{left}</span>
        <span className="text-xs" style={{ color: S.faint }}>{right}</span>
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

export default function Diagnostico() {
  return <AppLayout module="diagnostico"><DiagContent /></AppLayout>
}

