import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const S = {
  bg: '#0c0c10', card: '#111118', panel: '#13131f',
  border: '#1e1e2a', ib: '#2a2a38',
  input: '#0a0a0f', muted: '#555568', faint: '#444455',
}

const ROLES = [
  { key: 'admin',    label: 'Admin',    color: '#E8642A', desc: 'Acesso total ao sistema' },
  { key: 'analista', label: 'Analista', color: '#818cf8', desc: 'Gerencia clientes, sem admin de usuários' },
  { key: 'cliente',  label: 'Cliente',  color: '#10b981', desc: 'Acesso somente ao portal do cliente' },
]

function roleConf(key) { return ROLES.find(r => r.key === key) || ROLES[1] }

export default function GestaoUsuarios() {
  const { profile: myProfile, refreshProfile } = useAuth()
  const [profiles, setProfiles]  = useState([])
  const [clients, setClients]    = useState([])
  const [loading, setLoading]    = useState(true)
  const [modal, setModal]        = useState(null) // null | profile object
  const [form, setForm]          = useState({})
  const [saving, setSaving]      = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*, clients(id, name, slug)').order('created_at'),
      supabase.from('clients').select('id, name, slug').order('name'),
    ])
    setProfiles(p || [])
    setClients(c || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(profile) {
    setForm({
      id: profile.id,
      user_id: profile.user_id,
      nome: profile.nome || '',
      email: profile.email || '',
      role: profile.role || 'analista',
      client_id: profile.client_id || '',
    })
    setModal(profile)
  }

  async function save() {
    setSaving(true)
    const update = {
      nome: form.nome,
      role: form.role,
      client_id: form.role === 'cliente' ? (form.client_id || null) : null,
    }
    await supabase.from('profiles').update(update).eq('id', form.id)

    // If editing own profile, refresh auth context
    if (form.user_id === myProfile?.user_id) await refreshProfile()

    setSaving(false)
    setModal(null)
    await load()
  }

  const adminCount = profiles.filter(p => p.role === 'admin').length

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Gestão de Usuários</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>
            {profiles.length} usuário{profiles.length !== 1 ? 's' : ''} cadastrado{profiles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#E8642A' }}>
          + Convidar usuário
        </button>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {ROLES.map(r => {
          const count = profiles.filter(p => p.role === r.key).length
          return (
            <div key={r.key} className="rounded-xl border p-4" style={{ backgroundColor: S.card, borderColor: S.border }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>{r.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-[10px] mt-1" style={{ color: S.faint }}>{r.desc}</p>
            </div>
          )
        })}
      </div>

      {/* User list */}
      {loading ? (
        <p className="text-center py-12 text-sm" style={{ color: S.muted }}>Carregando…</p>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: S.border }}>
          {/* Header row */}
          <div className="flex items-center px-4 py-2.5 border-b"
            style={{ backgroundColor: '#0a0a12', borderColor: S.border }}>
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Usuário</span>
            </div>
            <div className="w-28 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Role</span>
            </div>
            <div className="w-40 shrink-0 hidden md:block">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Cliente vinculado</span>
            </div>
            <div className="w-16 shrink-0" />
          </div>

          {profiles.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl mb-3">👥</p>
              <p className="text-sm" style={{ color: S.muted }}>Nenhum usuário cadastrado.</p>
            </div>
          ) : profiles.map(p => {
            const rc = roleConf(p.role)
            const isMe = p.user_id === myProfile?.user_id
            return (
              <div key={p.id}
                className="flex items-center px-4 py-3 border-t transition-colors cursor-pointer"
                style={{ borderColor: S.border }}
                onClick={() => openEdit(p)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#111118'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>

                {/* User info */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: rc.color + '30', border: `1px solid ${rc.color}50`, color: rc.color }}>
                    {(p.nome || p.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-medium truncate">{p.nome || p.email || 'Sem nome'}</p>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                          style={{ backgroundColor: '#E8642A20', color: '#E8642A' }}>você</span>
                      )}
                    </div>
                    <p className="text-[11px] truncate" style={{ color: S.muted }}>{p.email}</p>
                  </div>
                </div>

                {/* Role badge */}
                <div className="w-28 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: rc.color + '18', color: rc.color }}>
                    {rc.label}
                  </span>
                </div>

                {/* Client */}
                <div className="w-40 shrink-0 hidden md:block">
                  {p.clients ? (
                    <p className="text-xs truncate" style={{ color: S.muted }}>{p.clients.name}</p>
                  ) : p.role === 'cliente' ? (
                    <p className="text-xs" style={{ color: '#ef4444' }}>⚠ sem cliente</p>
                  ) : (
                    <p className="text-xs" style={{ color: S.faint }}>—</p>
                  )}
                </div>

                {/* Edit caret */}
                <div className="w-16 shrink-0 flex justify-end">
                  <span className="text-xs" style={{ color: S.faint }}>editar →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="rounded-2xl border w-full max-w-md flex flex-col"
            style={{ backgroundColor: S.card, borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: S.ib }}>
              <p className="text-white font-bold">Editar usuário</p>
              <button onClick={() => setModal(null)} className="text-[#555568] hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FLabel label="Nome">
                <FInput value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))}
                  placeholder="Nome do usuário" />
              </FLabel>
              <FLabel label="E-mail">
                <FInput value={form.email} onChange={() => {}} placeholder="e-mail" disabled />
              </FLabel>
              <FLabel label="Role / Nível de acesso">
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button key={r.key} onClick={() => setForm(f => ({ ...f, role: r.key }))}
                      className="py-2.5 rounded-xl text-xs font-bold border transition-all"
                      style={form.role === r.key
                        ? { backgroundColor: r.color, borderColor: r.color, color: '#fff' }
                        : { borderColor: S.ib, color: S.muted }}>
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] mt-1.5" style={{ color: S.faint }}>
                  {roleConf(form.role).desc}
                </p>
              </FLabel>

              {form.role === 'cliente' && (
                <FLabel label="Cliente vinculado">
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
                    style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: form.client_id ? '#fff' : S.muted }}>
                    <option value="">Selecionar cliente…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FLabel>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: S.ib }}>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border"
                style={{ borderColor: S.ib, color: S.muted }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#E8642A' }}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowInvite(false) }}>
          <div className="rounded-2xl border w-full max-w-md p-8"
            style={{ backgroundColor: S.card, borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <h2 className="text-white font-bold text-lg mb-2">Convidar usuário</h2>
            <p className="text-sm mb-6" style={{ color: S.muted }}>
              Para criar novos usuários, acesse o painel do Supabase:
            </p>
            <div className="rounded-xl p-4 mb-5 space-y-3"
              style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
              {[
                '1. Acesse supabase.com → seu projeto → Authentication → Users',
                '2. Clique em "Invite User" e informe o e-mail',
                '3. O usuário receberá um link para definir a senha',
                '4. Volte aqui e defina o role e cliente do usuário',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#E8642A' }} />
                  <p className="text-xs" style={{ color: S.muted }}>{step}</p>
                </div>
              ))}
            </div>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-bold mb-3 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#3ecf8e' }}>
              Abrir Supabase ↗
            </a>
            <button onClick={() => setShowInvite(false)}
              className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
              style={{ borderColor: S.ib, color: S.muted }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FLabel({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#444455' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
function FInput({ value, onChange, placeholder, disabled }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all"
      style={{ backgroundColor: disabled ? '#0a0a12' : '#0a0a0f', border: '1px solid #2a2a38', color: disabled ? '#555568' : '#fff', cursor: disabled ? 'not-allowed' : 'text' }} />
  )
}
