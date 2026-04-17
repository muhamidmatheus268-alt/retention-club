import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'

const S = { bg: '#13131f', border: '#1e1e2a', input: '#0c0c10', ib: '#2a2a38', muted: '#555568', faint: '#444455' }

const TIPO_OPTS = [
  { key: 'nps',         label: 'NPS',              desc: 'Net Promoter Score' },
  { key: 'csat',        label: 'CSAT',             desc: 'Satisfação do cliente' },
  { key: 'ces',         label: 'CES',              desc: 'Esforço do cliente' },
  { key: 'pos_compra',  label: 'Pós-compra',       desc: 'Feedback após compra' },
  { key: 'produto',     label: 'Produto',          desc: 'Avaliação de produto' },
  { key: 'personalizada',label: 'Personalizada',   desc: 'Pesquisa livre' },
]

const STATUS_OPTS = [
  { key: 'planejada',   label: 'Planejada',  color: '#6b7280' },
  { key: 'ativa',       label: 'Ativa',      color: '#10b981' },
  { key: 'encerrada',   label: 'Encerrada',  color: '#f59e0b' },
  { key: 'arquivada',   label: 'Arquivada',  color: '#555568' },
]

const CANAL_OPTS = ['Email', 'WhatsApp', 'SMS', 'Pop-up', 'QR Code', 'Outro']

const EMPTY_FORM = { tipo: 'nps', titulo: '', canal: 'Email', status: 'planejada', url_formulario: '', respostas_total: '', nota_media: '', nps_score: '', notas: '', data_inicio: '', data_fim: '' }

function PesqContent() {
  const { client, brandColor } = useClient()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [filter, setFilter]   = useState('todos')
  const [expanded, setExpanded] = useState(null)
  const [aiState, setAiState] = useState(null) // { loading, questions, intro, error }

  async function generateSurveyAI() {
    setAiState({ loading: true, questions: null, error: '' })
    try {
      const res = await window.fetch('/api/generate-survey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id, tipo: form.tipo, canal: form.canal, contexto: form.notas,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAiState({ loading: false, error: data.error || 'Erro' }); return }
      setForm(f => ({
        ...f,
        titulo: data.titulo || f.titulo,
        notas:  [f.notas, data.introducao && `\n[Introdução] ${data.introducao}`, data.notas_internas && `\n[Notas internas] ${data.notas_internas}`].filter(Boolean).join(''),
      }))
      setAiState({ loading: false, data, error: '' })
    } catch (e) { setAiState({ loading: false, error: e.message }) }
  }

  const fetch = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase.from('pesquisas').select('*')
      .eq('client_id', client.id).order('created_at', { ascending: false })
    setList(data || []); setLoading(false)
  }, [client])

  useEffect(() => { fetch() }, [fetch])

  function openNew() {
    setForm({ ...EMPTY_FORM, data_inicio: new Date().toISOString().split('T')[0] })
    setModal('new')
  }
  function openEdit(r) {
    setForm({ tipo: r.tipo || 'nps', titulo: r.titulo || '', canal: r.canal || 'Email', status: r.status || 'planejada', url_formulario: r.url_formulario || '', respostas_total: r.respostas_total != null ? String(r.respostas_total) : '', nota_media: r.nota_media != null ? String(r.nota_media) : '', nps_score: r.nps_score != null ? String(r.nps_score) : '', notas: r.notas || '', data_inicio: r.data_inicio || '', data_fim: r.data_fim || '' })
    setModal(r)
  }

  async function save() {
    if (!client) return; setSaving(true)
    const p = {
      client_id: client.id, ...form,
      respostas_total: form.respostas_total !== '' ? parseInt(form.respostas_total) : null,
      nota_media:      form.nota_media !== ''      ? parseFloat(form.nota_media)    : null,
      nps_score:       form.nps_score !== ''       ? parseFloat(form.nps_score)     : null,
    }
    if (modal?.id) await supabase.from('pesquisas').update(p).eq('id', modal.id)
    else await supabase.from('pesquisas').insert(p)
    setSaving(false); setModal(null); await fetch()
  }

  async function del(id) { if (!window.confirm('Excluir pesquisa?')) return; await supabase.from('pesquisas').delete().eq('id', id); setModal(null); await fetch() }

  const filtered = filter === 'todos' ? list : list.filter(r => r.tipo === filter)

  if (!client) return <div className="flex h-full items-center justify-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Pesquisas</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>NPS, CSAT e pesquisas de satisfação</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90" style={{ backgroundColor: brandColor }}>+ Nova pesquisa</button>
      </div>

      {/* Stats */}
      {list.length > 0 && (() => {
        const ativas   = list.filter(r => r.status === 'ativa').length
        const respostas = list.reduce((a, r) => a + (r.respostas_total || 0), 0)
        const npsItems  = list.filter(r => r.nps_score != null)
        const npsAvg    = npsItems.length ? (npsItems.reduce((a, r) => a + r.nps_score, 0) / npsItems.length).toFixed(0) : null
        return (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border p-4" style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${brandColor}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>Ativas</p>
              <p className="text-2xl font-bold text-white">{ativas}</p>
            </div>
            <div className="rounded-xl border p-4" style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${brandColor}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>Respostas</p>
              <p className="text-2xl font-bold text-white">{respostas.toLocaleString('pt-BR')}</p>
            </div>
            {npsAvg && (
              <div className="rounded-xl border p-4" style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${Number(npsAvg) >= 50 ? '#10b981' : Number(npsAvg) >= 0 ? '#f59e0b' : '#ef4444'}` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>NPS Médio</p>
                <p className="text-2xl font-bold text-white">{npsAvg}</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Filter */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ backgroundColor: '#0c0c10', border: '1px solid #1e1e2a' }}>
        {['todos', ...TIPO_OPTS.map(t => t.key)].map(k => (
          <button key={k} onClick={() => setFilter(k)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={filter === k ? { backgroundColor: brandColor, color: '#fff' } : { color: '#555568' }}>
            {k === 'todos' ? 'Todas' : TIPO_OPTS.find(t => t.key === k)?.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <p className="text-center py-16 text-sm" style={{ color: S.muted }}>Carregando…</p>
        : filtered.length === 0 ? <div className="text-center py-20"><p className="text-3xl mb-3">📊</p><p className="text-sm" style={{ color: S.muted }}>Nenhuma pesquisa ainda.</p></div>
        : <div className="space-y-2">
            {filtered.map(r => {
              const tipo = TIPO_OPTS.find(t => t.key === r.tipo)
              const st   = STATUS_OPTS.find(s => s.key === r.status)
              const isExp = expanded === r.id
              return (
                <div key={r.id} className="rounded-xl border overflow-hidden" style={{ backgroundColor: S.bg, borderColor: S.border }}>
                  <div className="p-4 cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => setExpanded(isExp ? null : r.id)}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#17171f' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: brandColor + 'bb' }}>{tipo?.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: st?.color + '22', color: st?.color }}>{st?.label}</span>
                        {r.canal && <span className="text-[10px]" style={{ color: S.faint }}>{r.canal}</span>}
                      </div>
                      <p className="text-white font-semibold text-sm">{r.titulo || tipo?.desc}</p>
                      {!isExp && r.notas && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: S.muted }}>{r.notas}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.respostas_total != null && <span className="text-xs" style={{ color: S.faint }}>{r.respostas_total.toLocaleString('pt-BR')} respostas</span>}
                      {r.nps_score != null && (
                        <span className="text-xs font-bold" style={{ color: r.nps_score >= 50 ? '#10b981' : r.nps_score >= 0 ? '#f59e0b' : '#ef4444' }}>NPS {r.nps_score}</span>
                      )}
                      <button onClick={e => { e.stopPropagation(); openEdit(r) }} className="text-xs px-2 py-1 rounded transition-colors" style={{ color: S.muted }} onMouseEnter={e => { e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.color = S.muted }}>Editar</button>
                      <span style={{ color: S.faint }}>{isExp ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-5 pb-5 border-t pt-4 space-y-3" style={{ borderColor: S.border }}>
                      <div className="grid grid-cols-3 gap-3">
                        {r.respostas_total != null && <Metric label="Respostas" value={r.respostas_total.toLocaleString('pt-BR')} />}
                        {r.nota_media != null      && <Metric label="Nota Média" value={Number(r.nota_media).toFixed(1)} />}
                        {r.nps_score != null       && <Metric label="NPS Score"  value={r.nps_score} color={r.nps_score >= 50 ? '#10b981' : r.nps_score >= 0 ? '#f59e0b' : '#ef4444'} />}
                      </div>
                      {(r.data_inicio || r.data_fim) && (
                        <div className="flex gap-4">
                          {r.data_inicio && <p className="text-xs" style={{ color: S.muted }}>Início: {new Date(r.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                          {r.data_fim && <p className="text-xs" style={{ color: S.muted }}>Fim: {new Date(r.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                        </div>
                      )}
                      {r.notas && <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c8c8d8' }}>{r.notas}</p>}
                      {r.url_formulario && (
                        <a href={r.url_formulario} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors"
                          style={{ borderColor: brandColor + '44', color: brandColor }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = brandColor + '18' }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}>
                          Ver formulário ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
      }

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="rounded-2xl border w-full max-w-xl max-h-[90vh] flex flex-col modal-panel" style={{ backgroundColor: '#17171f', borderColor: '#2a2a38', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a38' }}>
              <p className="text-white font-bold">{modal?.id ? 'Editar pesquisa' : 'Nova pesquisa'}</p>
              <button onClick={() => setModal(null)} className="text-[#555568] hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* AI Generate */}
              <div className="rounded-xl border p-3 flex items-center justify-between gap-3"
                style={{ background: `linear-gradient(135deg, ${brandColor}10, transparent)`, borderColor: brandColor + '40' }}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">✨ Gerar pesquisa com IA</p>
                  <p className="text-[11px]" style={{ color: '#555568' }}>
                    Cria título + perguntas estruturadas com base no tipo e no Cérebro do cliente
                  </p>
                </div>
                <button onClick={generateSurveyAI} disabled={aiState?.loading}
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 shrink-0"
                  style={{ backgroundColor: brandColor }}>
                  {aiState?.loading ? '⏳' : '✨ Gerar'}
                </button>
              </div>
              {aiState?.error && <p className="text-xs text-red-400">{aiState.error}</p>}
              {aiState?.data?.perguntas?.length > 0 && (
                <div className="rounded-xl border p-3 space-y-2" style={{ backgroundColor: '#0c0c10', borderColor: brandColor + '30' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brandColor }}>
                    Perguntas sugeridas ({aiState.data.perguntas.length})
                  </p>
                  {aiState.data.perguntas.map((q, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="font-bold text-white shrink-0">{q.ordem || i + 1}.</span>
                      <div className="flex-1">
                        <p className="text-white">{q.pergunta}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#555568' }}>
                          {q.tipo}{q.opcoes?.length ? ` · ${q.opcoes.join(' / ')}` : ''}{q.obrigatoria ? ' · obrigatória' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] mt-2" style={{ color: '#555568' }}>
                    → Copie estas perguntas para sua ferramenta (Typeform, Google Forms, etc.)
                  </p>
                </div>
              )}
              <FL label="Tipo">
                <div className="grid grid-cols-3 gap-2">
                  {TIPO_OPTS.map(t => (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, tipo: t.key }))}
                      className="py-2 px-3 rounded-lg text-xs font-semibold border text-left transition-all"
                      style={form.tipo === t.key ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' } : { borderColor: '#2a2a38', color: '#6b6b80' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </FL>
              <FL label="Título"><FInp value={form.titulo} onChange={v => setForm(f => ({ ...f, titulo: v }))} placeholder="Ex: NPS Q1 2025" brandColor={brandColor} /></FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Canal">
                  <select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value }))}
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}>
                    {CANAL_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FL>
                <FL label="Status">
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}>
                    {STATUS_OPTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </FL>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Data Início">
                  <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
                    onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} />
                </FL>
                <FL label="Data Fim">
                  <input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
                    onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} />
                </FL>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FL label="Total Respostas"><FNum value={form.respostas_total} onChange={v => setForm(f => ({ ...f, respostas_total: v }))} placeholder="0" brandColor={brandColor} /></FL>
                <FL label="Nota Média">    <FNum value={form.nota_media}      onChange={v => setForm(f => ({ ...f, nota_media: v }))}      placeholder="0.0" brandColor={brandColor} /></FL>
                <FL label="NPS Score">     <FNum value={form.nps_score}       onChange={v => setForm(f => ({ ...f, nps_score: v }))}       placeholder="-100–100" brandColor={brandColor} /></FL>
              </div>
              <FL label="URL do Formulário"><FInp value={form.url_formulario} onChange={v => setForm(f => ({ ...f, url_formulario: v }))} placeholder="https://forms.gle/…" brandColor={brandColor} /></FL>
              <FL label="Notas / Insights">
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={4}
                  placeholder="Resultados, observações e próximos passos…"
                  className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none"
                  style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
                  onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} />
              </FL>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#2a2a38' }}>
              <div>{modal?.id && <button onClick={() => del(modal.id)} className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors">Excluir</button>}</div>
              <div className="flex gap-3">
                <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors" style={{ borderColor: '#2a2a38', color: '#555568' }}>Cancelar</button>
                <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: brandColor }}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div className="rounded-lg px-3 py-2.5 border" style={{ backgroundColor: '#0c0c10', borderColor: '#1e1e2a' }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#555568' }}>{label}</p>
      <p className="font-bold text-base" style={{ color: color || '#fff' }}>{value}</p>
    </div>
  )
}

function FL({ label, children }) { return <div><label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#444455' }}>{label}</label>{children}</div> }
function FInp({ value, onChange, placeholder, brandColor }) { return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none" style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }} onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} /> }
function FNum({ value, onChange, placeholder, brandColor }) { return <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none" style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }} onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} /> }

export default function Pesquisas() {
  return <PesqContent />
}
