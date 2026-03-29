import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'

const TIPOS = [
  { key: 'segunda',   label: 'Feedback de Segunda',  desc: 'Baseado na PLAND' },
  { key: 'semanal',   label: 'Revisão Semanal',       desc: 'Revisão dos projetos' },
  { key: 'quinzenal', label: 'Otimização Quinzenal',  desc: 'Feedback de automações' },
  { key: 'mensal',    label: 'Acompanhamento Mensal', desc: 'MoM / YoY' },
]
const S = { bg: '#13131f', border: '#1e1e2a', input: '#0c0c10', ib: '#2a2a38', muted: '#555568', faint: '#444455' }

function RelContent() {
  const { client, brandColor } = useClient()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState({ tipo: 'segunda', titulo: '', notas: '', imagens: [''], data_referencia: '' })
  const [saving, setSaving]   = useState(false)
  const [filter, setFilter]   = useState('todos')
  const [expanded, setExpanded] = useState(null)

  const fetch = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase.from('relatorios').select('*').eq('client_id', client.id).order('data_referencia', { ascending: false })
    setList(data || []); setLoading(false)
  }, [client])

  useEffect(() => { fetch() }, [fetch])

  function openNew() { setForm({ tipo: 'segunda', titulo: '', notas: '', imagens: [''], data_referencia: new Date().toISOString().split('T')[0] }); setModal('new') }
  function openEdit(r) { setForm({ tipo: r.tipo || 'segunda', titulo: r.titulo || '', notas: r.notas || '', imagens: r.imagens?.length ? r.imagens : [''], data_referencia: r.data_referencia || '' }); setModal(r) }

  async function save() {
    if (!client) return; setSaving(true)
    const p = { client_id: client.id, ...form, imagens: form.imagens.filter(i => i.trim()) }
    if (modal?.id) await supabase.from('relatorios').update(p).eq('id', modal.id)
    else await supabase.from('relatorios').insert(p)
    setSaving(false); setModal(null); await fetch()
  }

  async function del(id) { if (!window.confirm('Excluir?')) return; await supabase.from('relatorios').delete().eq('id', id); setModal(null); await fetch() }

  const filtered = filter === 'todos' ? list : list.filter(r => r.tipo === filter)

  if (!client) return <div className="flex h-full items-center justify-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Relatórios</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Feedbacks semanais e acompanhamentos por período</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90" style={{ backgroundColor: brandColor }}>+ Novo relatório</button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['todos', ...TIPOS.map(t => t.key)].map(k => (
          <button key={k} onClick={() => setFilter(k)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={filter === k ? { backgroundColor: brandColor, color: '#fff' } : { backgroundColor: '#17171f', color: '#6b6b80', border: '1px solid #2a2a38' }}>
            {k === 'todos' ? 'Todos' : TIPOS.find(t => t.key === k)?.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <p className="text-center py-16 text-sm" style={{ color: S.muted }}>Carregando…</p>
        : filtered.length === 0 ? <div className="text-center py-20"><p className="text-3xl mb-3">📋</p><p className="text-sm" style={{ color: S.muted }}>Nenhum relatório ainda.</p></div>
        : <div className="space-y-2">
            {filtered.map(r => {
              const tipo = TIPOS.find(t => t.key === r.tipo)
              const isExp = expanded === r.id
              const dt = r.data_referencia ? new Date(r.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR') : null
              return (
                <div key={r.id} className="rounded-xl border overflow-hidden" style={{ backgroundColor: S.bg, borderColor: S.border }}>
                  <div className="p-4 cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => setExpanded(isExp ? null : r.id)}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#17171f' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: brandColor + 'bb' }}>{tipo?.label}</span>
                        {dt && <span className="text-xs" style={{ color: S.muted }}>{dt}</span>}
                      </div>
                      <p className="text-white font-semibold text-sm">{r.titulo || tipo?.desc}</p>
                      {!isExp && r.notas && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: S.muted }}>{r.notas}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.imagens?.filter(Boolean).length > 0 && <span className="text-xs" style={{ color: S.faint }}>🖼 {r.imagens.filter(Boolean).length}</span>}
                      <button onClick={e => { e.stopPropagation(); openEdit(r) }} className="text-xs px-2 py-1 rounded transition-colors" style={{ color: S.muted }} onMouseEnter={e => { e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.color = S.muted }}>Editar</button>
                      <span style={{ color: S.faint }}>{isExp ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-5 pb-5 border-t pt-4" style={{ borderColor: S.border }}>
                      {r.notas && <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>Notas</p><p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c8c8d8' }}>{r.notas}</p></div>}
                      {r.imagens?.filter(Boolean).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: S.muted }}>Imagens</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {r.imagens.filter(Boolean).map((img, i) => (
                              <a key={i} href={img} target="_blank" rel="noreferrer">
                                <img src={img} alt={`Img ${i+1}`} className="w-full rounded-lg object-cover aspect-video" style={{ backgroundColor: '#1e1e2a' }} onError={e => { e.target.style.display='none' }} />
                              </a>
                            ))}
                          </div>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="rounded-2xl border w-full max-w-xl max-h-[90vh] flex flex-col" style={{ backgroundColor: '#17171f', borderColor: '#2a2a38', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a38' }}>
              <p className="text-white font-bold">{modal?.id ? 'Editar relatório' : 'Novo relatório'}</p>
              <button onClick={() => setModal(null)} className="text-[#555568] hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FL label="Tipo">
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS.map(t => <button key={t.key} onClick={() => setForm(f => ({ ...f, tipo: t.key }))} className="py-2 px-3 rounded-lg text-xs font-semibold border text-left transition-all" style={form.tipo === t.key ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' } : { borderColor: '#2a2a38', color: '#6b6b80' }}>{t.label}</button>)}
                </div>
              </FL>
              <FL label="Título"><FInp value={form.titulo} onChange={v => setForm(f => ({ ...f, titulo: v }))} placeholder="Ex: Revisão semana 12/03" brandColor={brandColor} /></FL>
              <FL label="Data de Referência"><input type="date" value={form.data_referencia} onChange={e => setForm(f => ({ ...f, data_referencia: e.target.value }))} className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none" style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }} onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} /></FL>
              <FL label="Notas / Análise"><textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={6} placeholder="Cole insights, análises, resultados e recomendações…" className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none" style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }} onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} /></FL>
              <FL label="Imagens (URLs)">
                <div className="space-y-2">
                  {form.imagens.map((img, i) => (
                    <div key={i} className="flex gap-2">
                      <FInp value={img} onChange={v => { const imgs = [...form.imagens]; imgs[i] = v; setForm(f => ({ ...f, imagens: imgs })) }} placeholder={`URL da imagem ${i+1}`} brandColor={brandColor} />
                      {form.imagens.length > 1 && <button onClick={() => setForm(f => ({ ...f, imagens: f.imagens.filter((_,j) => j !== i) }))} className="text-[#555568] hover:text-red-400 px-2 transition-colors">×</button>}
                    </div>
                  ))}
                  <button onClick={() => setForm(f => ({ ...f, imagens: [...f.imagens, ''] }))} className="text-xs font-semibold transition-colors" style={{ color: brandColor }}>+ Adicionar imagem</button>
                </div>
                <p className="text-[10px] mt-1" style={{ color: '#333340' }}>Cole URLs de prints de diferentes ferramentas para centralizar tudo aqui</p>
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

function FL({ label, children }) { return <div><label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#444455' }}>{label}</label>{children}</div> }
function FInp({ value, onChange, placeholder, brandColor }) { return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none" style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }} onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} /> }

export default function Relatorios() {
  return <AppLayout module="relatorios"><RelContent /></AppLayout>
}
