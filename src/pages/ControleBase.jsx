import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const S = { bg: '#13131f', border: '#1e1e2a', input: '#0c0c10', ib: '#2a2a38', muted: '#555568', faint: '#444455' }

function fmtInt(v) { if (v == null || v === '') return ''; return Number(v).toLocaleString('pt-BR') }
function fmtPct(v) { if (v == null || v === '') return ''; return `${Number(v).toFixed(1)}%` }

const METRICS = [
  { key: 'base_total',        label: 'Base Total',           tip: '' },
  { key: 'base_ativa',        label: 'Base Ativa (90d)',      tip: '' },
  { key: 'novos_contatos',    label: 'Novos Contatos',        tip: '' },
  { key: 'descadastros',      label: 'Descadastros',          tip: '' },
  { key: 'bounces',           label: 'Bounces',               tip: '' },
  { key: 'spam_reports',      label: 'Spam / Reclamações',    tip: '' },
  { key: 'inativos_90d',      label: 'Inativos +90d',         tip: '' },
  { key: 'reativados',        label: 'Reativados',            tip: '' },
  { key: 'taxa_crescimento',  label: 'Crescimento %',         tip: 'MoM' },
  { key: 'taxa_churn',        label: 'Churn %',               tip: '' },
  { key: 'taxa_reativacao',   label: 'Reativação %',          tip: '' },
]

const EMPTY = Object.fromEntries(METRICS.map(m => [m.key, '']))

function BaseContent() {
  const { client, brandColor } = useClient()
  const now = new Date()
  const [mes, setMes]   = useState(now.getMonth() + 1)
  const [ano, setAno]   = useState(now.getFullYear())
  const [form, setForm] = useState(EMPTY)
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const fetchRecord = useCallback(async () => {
    if (!client) return
    const { data } = await supabase.from('controle_base').select('*')
      .eq('client_id', client.id).eq('mes', mes).eq('ano', ano).single()
    if (data) { setRecord(data); setForm(Object.fromEntries(METRICS.map(m => [m.key, data[m.key] != null ? String(data[m.key]) : '']))) }
    else { setRecord(null); setForm(EMPTY) }
  }, [client, mes, ano])

  useEffect(() => { fetchRecord() }, [fetchRecord])

  async function handleSave() {
    if (!client) return
    setSaving(true)
    const payload = { client_id: client.id, mes, ano, ...Object.fromEntries(METRICS.map(m => [m.key, form[m.key] !== '' ? parseFloat(form[m.key]) : null])) }
    if (record?.id) { await supabase.from('controle_base').update(payload).eq('id', record.id) }
    else { const { data } = await supabase.from('controle_base').insert(payload).select().single(); if (data) setRecord(data) }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    await fetchRecord()
  }

  if (!client) return <div className="flex h-full items-center justify-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  const baseTotal  = parseFloat(form.base_total) || 0
  const baseAtiva  = parseFloat(form.base_ativa)  || 0
  const ativoPct   = baseTotal > 0 ? ((baseAtiva / baseTotal) * 100) : null
  const novos      = parseFloat(form.novos_contatos) || 0
  const inativos   = parseFloat(form.inativos_90d)   || 0
  const inativoPct = baseTotal > 0 ? ((inativos / baseTotal) * 100) : null

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Controle de Base</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Saúde e evolução da base de contatos</p>
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

      {/* KPI cards */}
      {record && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            ['Base Total',    fmtInt(record.base_total)],
            ['Base Ativa',    fmtInt(record.base_ativa)],
            ['Novos',         fmtInt(record.novos_contatos)],
            ['Churn %',       fmtPct(record.taxa_churn)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl p-4 border" style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${brandColor}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.muted }}>{l}</p>
              <p className="text-white font-bold text-xl">{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bars */}
      {ativoPct != null && <Bar label="Base Ativa" pct={ativoPct} left={`${ativoPct.toFixed(1)}% ativa`} right={`${fmtInt(baseAtiva)} de ${fmtInt(baseTotal)}`} brandColor={brandColor} />}
      {inativoPct != null && <Bar label="Inativos +90d" pct={inativoPct} left={`${inativoPct.toFixed(1)}% inativos`} right={fmtInt(inativos)} brandColor={S.muted} />}

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
                placeholder="" className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none transition-all"
                style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
                onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
                onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }}
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
              <p className="text-white font-bold">{fmtInt(record[m.key])}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Bar({ label, pct, left, right, brandColor }) {
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

export default function ControleBase() {
  return <BaseContent />
}
