import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'

const S = { bg: '#13131f', border: '#1e1e2a', input: '#0c0c10', ib: '#2a2a38', muted: '#555568', faint: '#444455' }

const STATUS_OPTS = [
  { key: 'pendente',    label: 'Pendente',    color: '#f59e0b' },
  { key: 'em_andamento',label: 'Em andamento',color: '#3b82f6' },
  { key: 'concluido',   label: 'Concluído',   color: '#10b981' },
  { key: 'bloqueado',   label: 'Bloqueado',   color: '#ef4444' },
]

const PRIORIDADE_OPTS = [
  { key: 'alta',   label: 'Alta',   color: '#ef4444' },
  { key: 'media',  label: 'Média',  color: '#f59e0b' },
  { key: 'baixa',  label: 'Baixa',  color: '#6b7280' },
]

const EMPTY_FORM = { titulo: '', descricao: '', status: 'pendente', prioridade: 'media', responsavel: '', prazo: '', categoria: '' }

function AcompContent() {
  const { client, brandColor } = useClient()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [filterStatus, setFilterStatus] = useState('todos')

  const fetch = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase.from('acompanhamento').select('*')
      .eq('client_id', client.id).order('created_at', { ascending: false })
    setList(data || []); setLoading(false)
  }, [client])

  useEffect(() => { fetch() }, [fetch])

  function openNew() { setForm({ ...EMPTY_FORM, prazo: new Date().toISOString().split('T')[0] }); setModal('new') }
  function openEdit(r) { setForm({ titulo: r.titulo || '', descricao: r.descricao || '', status: r.status || 'pendente', prioridade: r.prioridade || 'media', responsavel: r.responsavel || '', prazo: r.prazo || '', categoria: r.categoria || '' }); setModal(r) }

  async function save() {
    if (!client) return; setSaving(true)
    const p = { client_id: client.id, ...form }
    if (modal?.id) await supabase.from('acompanhamento').update(p).eq('id', modal.id)
    else await supabase.from('acompanhamento').insert(p)
    setSaving(false); setModal(null); await fetch()
  }

  async function del(id) { if (!window.confirm('Excluir?')) return; await supabase.from('acompanhamento').delete().eq('id', id); setModal(null); await fetch() }

  const filtered = filterStatus === 'todos' ? list : list.filter(r => r.status === filterStatus)

  const counts = Object.fromEntries(STATUS_OPTS.map(s => [s.key, list.filter(r => r.status === s.key).length]))

  if (!client) return <div className="flex h-full items-center justify-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Acompanhamento</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Tarefas, pendências e próximos passos</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90" style={{ backgroundColor: brandColor }}>+ Nova tarefa</button>
      </div>

      {/* Status counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STATUS_OPTS.map(s => (
          <div key={s.key} className="rounded-xl border p-4" style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${s.color}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>{s.label}</p>
            <p className="text-2xl font-bold text-white">{counts[s.key] || 0}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ backgroundColor: '#0c0c10', border: '1px solid #1e1e2a' }}>
        {['todos', ...STATUS_OPTS.map(s => s.key)].map(k => (
          <button key={k} onClick={() => setFilterStatus(k)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={filterStatus === k ? { backgroundColor: brandColor, color: '#fff' } : { color: '#555568' }}>
            {k === 'todos' ? 'Todos' : STATUS_OPTS.find(s => s.key === k)?.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <p className="text-center py-16 text-sm" style={{ color: S.muted }}>Carregando…</p>
        : filtered.length === 0 ? <div className="text-center py-20"><p className="text-3xl mb-3">✓</p><p className="text-sm" style={{ color: S.muted }}>Nenhuma tarefa encontrada.</p></div>
        : <div className="space-y-2">
            {filtered.map(r => {
              const st = STATUS_OPTS.find(s => s.key === r.status)
              const pr = PRIORIDADE_OPTS.find(p => p.key === r.prioridade)
              const prazoDate = r.prazo ? new Date(r.prazo + 'T12:00:00') : null
              const isOverdue = prazoDate && prazoDate < new Date() && r.status !== 'concluido'
              return (
                <div key={r.id} className="rounded-xl border p-4 transition-colors cursor-pointer"
                  style={{ backgroundColor: S.bg, borderColor: S.border }}
                  onClick={() => openEdit(r)}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#17171f' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: st?.color + '22', color: st?.color }}>{st?.label}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: pr?.color + '22', color: pr?.color }}>{pr?.label}</span>
                        {r.categoria && <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: '#1e1e2a', color: S.muted }}>{r.categoria}</span>}
                      </div>
                      <p className="text-white font-semibold text-sm">{r.titulo}</p>
                      {r.descricao && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: S.muted }}>{r.descricao}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {prazoDate && (
                        <p className="text-xs" style={{ color: isOverdue ? '#ef4444' : S.faint }}>
                          {prazoDate.toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {r.responsavel && <p className="text-[10px] mt-0.5" style={{ color: S.faint }}>{r.responsavel}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
      }

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="rounded-2xl border w-full max-w-lg max-h-[90vh] flex flex-col modal-panel" style={{ backgroundColor: '#17171f', borderColor: '#2a2a38', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a38' }}>
              <p className="text-white font-bold">{modal?.id ? 'Editar tarefa' : 'Nova tarefa'}</p>
              <button onClick={() => setModal(null)} className="text-[#555568] hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FL label="Título"><FInp value={form.titulo} onChange={v => setForm(f => ({ ...f, titulo: v }))} placeholder="Ex: Configurar fluxo de reativação" brandColor={brandColor} /></FL>
              <FL label="Descrição">
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3}
                  placeholder="Detalhes da tarefa…"
                  className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none"
                  style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
                  onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} />
              </FL>
              <FL label="Status">
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTS.map(s => (
                    <button key={s.key} onClick={() => setForm(f => ({ ...f, status: s.key }))}
                      className="py-2 px-3 rounded-lg text-xs font-semibold border text-left transition-all"
                      style={form.status === s.key ? { backgroundColor: s.color + '22', borderColor: s.color, color: s.color } : { borderColor: '#2a2a38', color: '#6b6b80' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </FL>
              <FL label="Prioridade">
                <div className="flex gap-2">
                  {PRIORIDADE_OPTS.map(p => (
                    <button key={p.key} onClick={() => setForm(f => ({ ...f, prioridade: p.key }))}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
                      style={form.prioridade === p.key ? { backgroundColor: p.color + '22', borderColor: p.color, color: p.color } : { borderColor: '#2a2a38', color: '#6b6b80' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Responsável"><FInp value={form.responsavel} onChange={v => setForm(f => ({ ...f, responsavel: v }))} placeholder="Nome" brandColor={brandColor} /></FL>
                <FL label="Prazo">
                  <input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
                    onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} />
                </FL>
              </div>
              <FL label="Categoria"><FInp value={form.categoria} onChange={v => setForm(f => ({ ...f, categoria: v }))} placeholder="Ex: Email, WhatsApp, Estratégia" brandColor={brandColor} /></FL>
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

export default function Acompanhamento() {
  return <AcompContent />
}
