import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'

const S = { bg: '#13131f', border: '#1e1e2a', input: '#0c0c10', ib: '#2a2a38', muted: '#555568', faint: '#444455' }

const PLATAFORMAS = [
  'Klaviyo', 'Mailchimp', 'RD Station', 'HubSpot', 'ActiveCampaign',
  'Brevo', 'Twilio', 'Zenvia', 'Take Blip', 'Landbot', 'Outro',
]

const STATUS_OPTS = [
  { key: 'ativa',    label: 'Ativa',    color: '#10b981' },
  { key: 'inativa',  label: 'Inativa',  color: '#6b7280' },
  { key: 'trial',    label: 'Trial',    color: '#f59e0b' },
  { key: 'suspensa', label: 'Suspensa', color: '#ef4444' },
]

const TIPO_OPTS = ['Email', 'WhatsApp', 'SMS', 'CRM', 'Analytics', 'E-commerce', 'Outro']

const EMPTY_FORM = { plataforma: '', tipo: 'Email', status: 'ativa', login: '', senha_hint: '', url_acesso: '', notas: '', plano: '', renovacao: '' }

function ContasContent() {
  const { client, brandColor } = useClient()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [showSenha, setShowSenha] = useState({})

  const fetch = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase.from('central_contas').select('*')
      .eq('client_id', client.id).order('plataforma')
    setList(data || []); setLoading(false)
  }, [client])

  useEffect(() => { fetch() }, [fetch])

  function openNew() { setForm(EMPTY_FORM); setModal('new') }
  function openEdit(r) {
    setForm({ plataforma: r.plataforma || '', tipo: r.tipo || 'Email', status: r.status || 'ativa', login: r.login || '', senha_hint: r.senha_hint || '', url_acesso: r.url_acesso || '', notas: r.notas || '', plano: r.plano || '', renovacao: r.renovacao || '' })
    setModal(r)
  }

  async function save() {
    if (!client) return; setSaving(true)
    const p = { client_id: client.id, ...form }
    if (modal?.id) await supabase.from('central_contas').update(p).eq('id', modal.id)
    else await supabase.from('central_contas').insert(p)
    setSaving(false); setModal(null); await fetch()
  }

  async function del(id) { if (!window.confirm('Excluir conta?')) return; await supabase.from('central_contas').delete().eq('id', id); setModal(null); await fetch() }

  if (!client) return <div className="flex h-full items-center justify-center"><p className="text-[#555568] text-sm">Carregando…</p></div>

  const byTipo = TIPO_OPTS.filter(t => list.some(r => r.tipo === t))

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Central de Contas</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Acesso centralizado a todas as plataformas do cliente</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90" style={{ backgroundColor: brandColor }}>+ Nova conta</button>
      </div>

      {/* Stats */}
      {list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATUS_OPTS.map(s => {
            const count = list.filter(r => r.status === s.key).length
            if (count === 0) return null
            return (
              <div key={s.key} className="rounded-xl border p-4" style={{ backgroundColor: S.bg, borderColor: S.border, borderLeft: `3px solid ${s.color}` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: S.muted }}>{s.label}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* List */}
      {loading ? <p className="text-center py-16 text-sm" style={{ color: S.muted }}>Carregando…</p>
        : list.length === 0 ? <div className="text-center py-20"><p className="text-3xl mb-3">🔑</p><p className="text-sm" style={{ color: S.muted }}>Nenhuma conta cadastrada ainda.</p></div>
        : (
          <div className="space-y-6">
            {(byTipo.length > 0 ? byTipo : ['Outro']).map(tipo => {
              const items = list.filter(r => r.tipo === tipo)
              if (items.length === 0) return null
              return (
                <div key={tipo}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: S.faint }}>{tipo}</p>
                  <div className="space-y-2">
                    {items.map(r => {
                      const st = STATUS_OPTS.find(s => s.key === r.status)
                      const renovDate = r.renovacao ? new Date(r.renovacao + 'T12:00:00') : null
                      const soon = renovDate && (renovDate - new Date()) / 86400000 < 30
                      return (
                        <div key={r.id} className="rounded-xl border p-4 cursor-pointer transition-colors"
                          style={{ backgroundColor: S.bg, borderColor: S.border }}
                          onClick={() => openEdit(r)}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#17171f' }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-semibold text-sm">{r.plataforma}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: st?.color + '22', color: st?.color }}>{st?.label}</span>
                                {r.plano && <span className="text-[10px]" style={{ color: S.faint }}>{r.plano}</span>}
                              </div>
                              {r.login && <p className="text-xs" style={{ color: S.muted }}>{r.login}</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {renovDate && (
                                <p className="text-[10px]" style={{ color: soon ? '#f59e0b' : S.faint }}>
                                  Renova {renovDate.toLocaleDateString('pt-BR')}
                                </p>
                              )}
                              {r.url_acesso && (
                                <a href={r.url_acesso} target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-xs px-2 py-1 rounded transition-colors"
                                  style={{ color: brandColor, border: `1px solid ${brandColor}44` }}
                                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = brandColor + '18' }}
                                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}>
                                  Acessar ↗
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="rounded-2xl border w-full max-w-lg max-h-[90vh] flex flex-col modal-panel" style={{ backgroundColor: '#17171f', borderColor: '#2a2a38', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2a38' }}>
              <p className="text-white font-bold">{modal?.id ? 'Editar conta' : 'Nova conta'}</p>
              <button onClick={() => setModal(null)} className="text-[#555568] hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <FL label="Plataforma">
                <div className="flex gap-2">
                  <select value={form.plataforma} onChange={e => setForm(f => ({ ...f, plataforma: e.target.value }))}
                    className="flex-1 text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: form.plataforma ? '#fff' : '#555568' }}>
                    <option value="">Selecionar…</option>
                    {PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {form.plataforma === 'Outro' && <FInp value={form.plataforma === 'Outro' ? '' : form.plataforma} onChange={v => setForm(f => ({ ...f, plataforma: v }))} placeholder="Nome da plataforma" brandColor={brandColor} />}
              </FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Tipo">
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}>
                    {TIPO_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
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
              <FL label="Login / E-mail"><FInp value={form.login} onChange={v => setForm(f => ({ ...f, login: v }))} placeholder="usuario@email.com" brandColor={brandColor} /></FL>
              <FL label="Senha (dica)"><FInp value={form.senha_hint} onChange={v => setForm(f => ({ ...f, senha_hint: v }))} placeholder="Ex: igual ao padrão, ver 1Password" brandColor={brandColor} /></FL>
              <FL label="URL de Acesso"><FInp value={form.url_acesso} onChange={v => setForm(f => ({ ...f, url_acesso: v }))} placeholder="https://app.plataforma.com" brandColor={brandColor} /></FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Plano"><FInp value={form.plano} onChange={v => setForm(f => ({ ...f, plano: v }))} placeholder="Ex: Pro, Starter" brandColor={brandColor} /></FL>
                <FL label="Renovação">
                  <input type="date" value={form.renovacao} onChange={e => setForm(f => ({ ...f, renovacao: e.target.value }))}
                    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                    style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
                    onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} />
                </FL>
              </div>
              <FL label="Notas">
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={3}
                  placeholder="Observações adicionais…"
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

function FL({ label, children }) { return <div><label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#444455' }}>{label}</label>{children}</div> }
function FInp({ value, onChange, placeholder, brandColor }) { return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none" style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }} onFocus={e => { e.target.style.borderColor = brandColor }} onBlur={e => { e.target.style.borderColor = '#2a2a38' }} /> }

export default function CentralContas() {
  return <ContasContent />
}
