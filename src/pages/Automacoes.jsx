import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'

const STATUS = { planejada: { label: 'Planejada', color: '#6b7280' }, ativa: { label: 'Ativa', color: '#10b981' }, pausada: { label: 'Pausada', color: '#f59e0b' }, cancelada: { label: 'Cancelada', color: '#ef4444' } }
const CANAIS = ['Email', 'WhatsApp', 'SMS', 'Push']
const CHECKS = ['O ERP envia evento de pedido entregue?', 'O ERP envia evento de pedido cancelado?', 'Há integração de carrinho abandonado?', 'A plataforma envia dados de recompra?', 'Há webhook de cadastro disponível?', 'O cliente tem acesso ao painel da ferramenta?']
const EMPTY = { nome: '', descricao: '', canais: [], ferramenta_transacional: '', ferramenta_marketing: '', tipo_template_wpp: 'marketing', tamanho_base_wpp: '', quantidade_emails: '', status_automacao: 'planejada', erp_integrado: false, link_preview: '', checklist: [], observacoes: '' }

function calcWpp(tipo, base) { if (!base) return null; return (parseFloat(base) * (tipo === 'utilidade' ? 0.06 : 0.35) * 1.1215).toFixed(2) }
function fmtBRL(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }

const S = { bg: '#13131f', border: '#1e1e2a', input: '#0c0c10', ib: '#2a2a38', muted: '#555568', faint: '#444455' }

function AutoContent() {
  const { client, brandColor } = useClient()
  const [list, setList]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterCanal, setFilter] = useState('todos')

  const fetch = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase.from('automacoes').select('*').eq('client_id', client.id).order('created_at')
    setList(data || []); setLoading(false)
  }, [client])

  useEffect(() => { fetch() }, [fetch])

  function openNew() { setForm({ ...EMPTY }); setModal('new') }
  function openEdit(r) { setForm({ ...EMPTY, ...r, canais: r.canais || [], checklist: r.checklist || [], tamanho_base_wpp: r.tamanho_base_wpp != null ? String(r.tamanho_base_wpp) : '', quantidade_emails: r.quantidade_emails != null ? String(r.quantidade_emails) : '' }); setModal(r) }

  async function save() {
    if (!client || !form.nome) return
    setSaving(true)
    const p = { client_id: client.id, ...form, tamanho_base_wpp: form.tamanho_base_wpp !== '' ? parseInt(form.tamanho_base_wpp) : null, quantidade_emails: form.quantidade_emails !== '' ? parseInt(form.quantidade_emails) : null }
    if (modal?.id) await supabase.from('automacoes').update(p).eq('id', modal.id)
    else await supabase.from('automacoes').insert(p)
    setSaving(false); setModal(null); await fetch()
  }

  async function del(id) { if (!window.confirm('Excluir?')) return; await supabase.from('automacoes').delete().eq('id', id); setModal(null); await fetch() }

  const filtered = filterCanal === 'todos' ? list : list.filter(a => a.canais?.includes(filterCanal))
  const custo = form.canais?.includes('WhatsApp') ? calcWpp(form.tipo_template_wpp, form.tamanho_base_wpp) : null

  if (!client) return <div className="flex h-full items-center justify-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Automações</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Mapeamento de automações por canal e ferramenta</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: brandColor }}>
          + Nova automação
        </button>
      </div>

      {/* Stats */}
      {list.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {Object.entries(STATUS).map(([key, conf]) => (
            <div key={key} className="rounded-xl px-4 py-3 border flex items-center gap-2.5" style={{ backgroundColor: S.bg, borderColor: S.border }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: conf.color }} />
              <div><p className="text-white font-bold text-lg leading-none">{list.filter(a => a.status_automacao === key).length}</p><p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: S.muted }}>{conf.label}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {['todos', ...CANAIS].map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={filterCanal === c ? { backgroundColor: brandColor, color: '#fff' } : { backgroundColor: '#17171f', color: '#6b6b80', border: '1px solid #2a2a38' }}>
            {c === 'todos' ? 'Todos' : c}
          </button>
        ))}
        <span className="text-xs ml-auto" style={{ color: S.faint }}>{filtered.length} automação{filtered.length !== 1 ? 'ões' : ''}</span>
      </div>

      {/* List */}
      {loading ? <p className="text-center py-16 text-sm" style={{ color: S.muted }}>Carregando…</p>
        : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-3xl mb-3">⚡</p>
            <p className="text-sm" style={{ color: S.muted }}>Nenhuma automação cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => {
              const conf = STATUS[a.status_automacao] || STATUS.planejada
              const custo = a.canais?.includes('WhatsApp') && a.tamanho_base_wpp ? calcWpp(a.tipo_template_wpp, a.tamanho_base_wpp) : null
              return (
                <div key={a.id} onClick={() => openEdit(a)}
                  className="rounded-xl border cursor-pointer p-4 transition-all"
                  style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${conf.color}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = conf.color; e.currentTarget.style.backgroundColor = '#17171f' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = S.bg }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-semibold">{a.nome}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: conf.color + '22', color: conf.color }}>{conf.label}</span>
                      </div>
                      {a.descricao && <p className="text-xs mt-1 line-clamp-1" style={{ color: S.muted }}>{a.descricao}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {a.canais?.map(c => <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: '#1e1e2a', color: '#8b8ba0' }}>{c}</span>)}
                        {a.ferramenta_marketing && <span className="text-[10px]" style={{ color: S.faint }}>🔧 {a.ferramenta_marketing}</span>}
                        {a.quantidade_emails && <span className="text-[10px]" style={{ color: S.faint }}>✉ {a.quantidade_emails}</span>}
                        {custo && <span className="text-[10px] font-bold" style={{ color: brandColor }}>{fmtBRL(custo)}/envio</span>}
                        {a.erp_integrado && <span className="text-[10px] text-green-400">✓ ERP</span>}
                      </div>
                    </div>
                    {a.link_preview && <a href={a.link_preview} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs transition-colors shrink-0" style={{ color: S.muted }}>Preview ↗</a>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="rounded-2xl border w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ backgroundColor: '#17171f', borderColor: '#2a2a38', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a38' }}>
              <p className="text-white font-bold">{modal?.id ? 'Editar automação' : 'Nova automação'}</p>
              <button onClick={() => setModal(null)} className="text-[#555568] hover:text-white transition-colors text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <MField label="Nome"><MinInput value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} placeholder="Ex: Boas-vindas novo cadastro" brandColor={brandColor} /></MField>
              <MField label="Descrição"><MinTextarea value={form.descricao} onChange={v => setForm(f => ({ ...f, descricao: v }))} placeholder="O que essa automação faz?" rows={2} brandColor={brandColor} /></MField>
              <MField label="Canais">
                <div className="flex gap-2 flex-wrap">
                  {CANAIS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, canais: f.canais.includes(c) ? f.canais.filter(x => x !== c) : [...f.canais, c] }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                      style={form.canais.includes(c) ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' } : { borderColor: '#2a2a38', color: '#6b6b80' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </MField>

              {form.canais.includes('WhatsApp') && (
                <div className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: '#111118', borderColor: '#2a2a38' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.muted }}>WhatsApp</p>
                  <MField label="Tipo de Template">
                    <div className="flex gap-2">
                      {[{ v: 'marketing', l: 'Marketing', c: '#8b5cf6' }, { v: 'utilidade', l: 'Utilidade', c: '#06b6d4' }].map(o => (
                        <button key={o.v} onClick={() => setForm(f => ({ ...f, tipo_template_wpp: o.v }))}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
                          style={form.tipo_template_wpp === o.v ? { backgroundColor: o.c, borderColor: o.c, color: '#fff' } : { borderColor: '#2a2a38', color: '#6b6b80' }}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </MField>
                  <MField label="Tamanho da Base"><MinInput value={form.tamanho_base_wpp} onChange={v => setForm(f => ({ ...f, tamanho_base_wpp: v.replace(/\D/g,'') }))} placeholder="Ex: 5000" brandColor={brandColor} /></MField>
                  {custo && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: brandColor + '12', border: `1px solid ${brandColor}30` }}>
                      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: S.muted }}>Custo estimado por envio</p>
                      <p className="text-white font-bold text-lg">{fmtBRL(custo)}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <MField label="Ferramenta Transacional"><MinInput value={form.ferramenta_transacional} onChange={v => setForm(f => ({ ...f, ferramenta_transacional: v }))} placeholder="Ex: Vtex, Nuvemshop…" brandColor={brandColor} /></MField>
                <MField label="Ferramenta Marketing"><MinInput value={form.ferramenta_marketing} onChange={v => setForm(f => ({ ...f, ferramenta_marketing: v }))} placeholder="Ex: Klaviyo, RD…" brandColor={brandColor} /></MField>
                <MField label="Qtd. de Emails"><MinInput value={form.quantidade_emails} onChange={v => setForm(f => ({ ...f, quantidade_emails: v }))} placeholder="Ex: 3" brandColor={brandColor} /></MField>
                <MField label="Link Preview"><MinInput value={form.link_preview} onChange={v => setForm(f => ({ ...f, link_preview: v }))} placeholder="https://…" brandColor={brandColor} /></MField>
              </div>

              <MField label="Status">
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS).map(([key, conf]) => (
                    <button key={key} onClick={() => setForm(f => ({ ...f, status_automacao: key }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                      style={form.status_automacao === key ? { backgroundColor: conf.color, borderColor: conf.color, color: '#fff' } : { borderColor: '#2a2a38', color: '#6b6b80' }}>
                      {conf.label}
                    </button>
                  ))}
                </div>
              </MField>

              <MField label="ERP Integrado">
                <button onClick={() => setForm(f => ({ ...f, erp_integrado: !f.erp_integrado }))} className="flex items-center gap-2">
                  <span className="w-9 h-5 rounded-full relative flex items-center transition-colors" style={{ backgroundColor: form.erp_integrado ? brandColor : '#2a2a38' }}>
                    <span className={`w-3.5 h-3.5 bg-white rounded-full shadow absolute transition-all ${form.erp_integrado ? 'left-4' : 'left-0.5'}`} />
                  </span>
                  <span className="text-sm" style={{ color: S.muted }}>{form.erp_integrado ? 'Sim' : 'Não'}</span>
                </button>
              </MField>

              <MField label="Checklist do Cliente">
                <div className="space-y-2">
                  {CHECKS.map(q => (
                    <label key={q} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={form.checklist.includes(q)} onChange={() => setForm(f => ({ ...f, checklist: f.checklist.includes(q) ? f.checklist.filter(x => x !== q) : [...f.checklist, q] }))} style={{ accentColor: brandColor }} />
                      <span className="text-xs" style={{ color: S.muted }}>{q}</span>
                    </label>
                  ))}
                </div>
              </MField>

              <MField label="Observações"><MinTextarea value={form.observacoes} onChange={v => setForm(f => ({ ...f, observacoes: v }))} placeholder="Notas…" rows={3} brandColor={brandColor} /></MField>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#2a2a38' }}>
              <div>{modal?.id && <button onClick={() => del(modal.id)} className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors">Excluir</button>}</div>
              <div className="flex gap-3">
                <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors" style={{ borderColor: '#2a2a38', color: S.muted }}>Cancelar</button>
                <button onClick={save} disabled={saving || !form.nome} className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity" style={{ backgroundColor: brandColor }}>{saving ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MField({ label, children }) {
  return <div><label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#444455' }}>{label}</label>{children}</div>
}
function MinInput({ value, onChange, placeholder, brandColor }) {
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none transition-all"
    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
    onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
    onBlur={e => { e.target.style.borderColor = '#2a2a38'; e.target.style.boxShadow = '' }} />
}
function MinTextarea({ value, onChange, placeholder, rows, brandColor }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none transition-all"
    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
    onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
    onBlur={e => { e.target.style.borderColor = '#2a2a38'; e.target.style.boxShadow = '' }} />
}

export default function Automacoes() {
  return <AppLayout module="automacoes"><AutoContent /></AppLayout>
}
