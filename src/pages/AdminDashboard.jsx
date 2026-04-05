import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MODULES_SHORT = [
  { key: 'calendar',       label: 'Calendário'   },
  { key: 'automacoes',     label: 'Automações'   },
  { key: 'cerebro',        label: 'Cérebro IA'   },
  { key: 'diagnostico',    label: 'Diagnóstico'  },
  { key: 'relatorios',     label: 'Relatórios'   },
  { key: 'projecao',       label: 'Projeção'     },
  { key: 'imagens',        label: 'Imagens'      },
]

const S = {
  bg:     '#0c0c10',
  card:   '#111118',
  border: '#1e1e2a',
  ib:     '#2a2a38',
  muted:  '#555568',
  faint:  '#333340',
}

function generateSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

/* color options for new clients */
const COLORS = ['#E8642A','#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444']

function SkeletonCard() {
  return (
    <div className="rounded-xl border p-5 animate-pulse" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: S.ib }} />
        <div className="flex-1">
          <div className="h-3.5 rounded-md w-32 mb-1.5" style={{ backgroundColor: S.ib }} />
          <div className="h-2.5 rounded w-24" style={{ backgroundColor: S.faint }} />
        </div>
      </div>
      <div className="flex gap-2">
        {[80, 96, 72, 88].map((w, i) => (
          <div key={i} className="h-6 rounded-md" style={{ width: w, backgroundColor: S.ib }} />
        ))}
      </div>
    </div>
  )
}

function ClientCard({ client, onDelete, deleting }) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const color = client.brand_color || '#E8642A'

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function copy() {
    navigator.clipboard.writeText(`${window.location.origin}/calendar/${client.slug}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border overflow-hidden transition-all group"
      style={{ backgroundColor: S.card, borderColor: S.border }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color + '60'}
      onMouseLeave={e => e.currentTarget.style.borderColor = S.border}>

      {/* accent bar */}
      <div className="h-0.5 w-full" style={{ backgroundColor: color }} />

      <div className="p-5">
        {/* top row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-black"
              style={{ backgroundColor: color }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm leading-tight truncate">{client.name}</p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: S.muted }}>/{client.slug}</p>
            </div>
          </div>

          {/* context menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: S.muted }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = S.ib; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = S.muted }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="3" r="1" fill="currentColor"/>
                <circle cx="7" cy="7" r="1" fill="currentColor"/>
                <circle cx="7" cy="11" r="1" fill="currentColor"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="drop-enter absolute right-0 top-full mt-1 rounded-xl border py-1.5 z-50 shadow-2xl min-w-[150px]"
                style={{ backgroundColor: '#17171f', borderColor: S.ib }}>
                <button onClick={() => { copy(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
                  style={{ color: S.muted }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffffff08'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = S.muted }}>
                  {copied ? '✓ Copiado!' : '⎘ Copiar link público'}
                </button>
                <a href={`/calendar/${client.slug}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                  style={{ color: S.muted }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffffff08'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = S.muted }}>
                  ↗ Visão do cliente
                </a>
                <div className="my-1 border-t" style={{ borderColor: S.ib }} />
                <button onClick={() => { onDelete(client.id); setMenuOpen(false) }} disabled={deleting}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left text-red-500 hover:text-red-400 disabled:opacity-50"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ff000008'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                  {deleting ? '…' : '🗑 Excluir cliente'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* module pills */}
        <div className="flex flex-wrap gap-1.5">
          {MODULES_SHORT.map(m => (
            <Link key={m.key} to={`/admin/${m.key}/${client.slug}`}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all"
              style={{ borderColor: S.ib, color: S.muted, backgroundColor: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = color + '18'; e.currentTarget.style.borderColor = color + '50'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.borderColor = S.ib; e.currentTarget.style.color = S.muted }}>
              {m.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [newName, setNewName]     = useState('')
  const [newColor, setNewColor]   = useState('#E8642A')
  const [adding, setAdding]       = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError]         = useState('')
  const [formOpen, setFormOpen]   = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { fetchClients() }, [])
  useEffect(() => { if (formOpen) setTimeout(() => inputRef.current?.focus(), 50) }, [formOpen])

  async function fetchClients() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || []); setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setError(''); setAdding(true)
    const slug = generateSlug(newName.trim())
    const { error } = await supabase.from('clients').insert({ name: newName.trim(), slug, brand_color: newColor })
    if (error) {
      setError(error.message.includes('duplicate') ? 'Já existe um cliente com esse nome.' : error.message)
    } else {
      setNewName(''); setFormOpen(false); await fetchClients()
    }
    setAdding(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir este cliente e todos os seus dados?')) return
    setDeletingId(id)
    await supabase.from('calendar_entries').delete().eq('client_id', id)
    await supabase.from('clients').delete().eq('id', id)
    setClients(p => p.filter(c => c.id !== id)); setDeletingId(null)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: S.bg }}>

      {/* header */}
      <header className="flex items-center justify-between px-6 h-12 border-b sticky top-0 z-40"
        style={{ backgroundColor: S.card, borderColor: S.border }}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white"
            style={{ backgroundColor: '#E8642A' }}>R</span>
          <span className="font-bold text-sm text-white tracking-tight">Retention Club</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: S.muted }}>
            {clients.length} cliente{clients.length !== 1 ? 's' : ''}
          </span>
          <button onClick={() => navigate('/admin/usuarios')}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: S.ib, color: S.muted }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
            onMouseLeave={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.ib }}>
            👥 Usuários
          </button>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: S.ib, color: S.muted }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
            onMouseLeave={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.ib }}>
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* page title + add button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">Carteira de clientes</h1>
            <p className="text-sm mt-0.5" style={{ color: S.muted }}>
              Selecione um cliente para acessar os módulos
            </p>
          </div>
          <button onClick={() => setFormOpen(o => !o)}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#E8642A' }}>
            {formOpen ? '× Cancelar' : '+ Novo cliente'}
          </button>
        </div>

        {/* add form */}
        {formOpen && (
          <div className="rounded-xl border p-5 mb-6 modal-panel"
            style={{ backgroundColor: S.card, borderColor: S.ib }}>
            <p className="text-sm font-semibold text-white mb-4">Novo cliente</p>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>
                  Nome
                </label>
                <input ref={inputRef} type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: APEX Comunicação"
                  className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-all"
                  style={{ backgroundColor: S.bg, border: `1px solid ${S.ib}`, color: '#fff' }}
                  onFocus={e => { e.target.style.borderColor = '#E8642A'; e.target.style.boxShadow = '0 0 0 3px #E8642A18' }}
                  onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }} />
                {newName.trim() && (
                  <p className="text-[11px] mt-1.5" style={{ color: S.muted }}>
                    Slug: <span style={{ color: '#6b6b80' }}>{generateSlug(newName.trim())}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: S.faint }}>
                  Cor da marca
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setNewColor(c)}
                      className="w-7 h-7 rounded-lg transition-all"
                      style={{
                        backgroundColor: c,
                        outline: newColor === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                        transform: newColor === c ? 'scale(1.15)' : 'scale(1)',
                      }} />
                  ))}
                </div>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border transition-colors"
                  style={{ borderColor: S.ib, color: S.muted }}>
                  Cancelar
                </button>
                <button type="submit" disabled={adding || !newName.trim()}
                  className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: newColor }}>
                  {adding ? 'Criando…' : 'Criar cliente'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* client list */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-24 rounded-xl border" style={{ borderColor: S.border }}>
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm mb-5" style={{ color: S.muted }}>Nenhum cliente cadastrado ainda.</p>
            <button onClick={() => setFormOpen(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E8642A' }}>
              + Adicionar primeiro cliente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clients.map(c => (
              <ClientCard key={c.id} client={c}
                onDelete={handleDelete}
                deleting={deletingId === c.id} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
