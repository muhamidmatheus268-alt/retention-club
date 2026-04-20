import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { exportClientData } from '../lib/clientExport'
import ActivityFeed from '../components/ActivityFeed'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import NotificationBell from '../components/NotificationBell'

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function firstName(profile) {
  if (!profile?.nome) return null
  return profile.nome.trim().split(/\s+/)[0]
}

const MODULES_SHORT = [
  { key: 'calendar',       label: 'Calendário'         },
  { key: 'cerebro',        label: 'Cérebro IA'         },
  { key: 'diagnostico',    label: 'Diagnóstico'        },
  { key: 'automacoes',     label: 'Automações'         },
  { key: 'relatorios',     label: 'Relatórios'         },
  { key: 'projecao',       label: 'Projeção'           },
  { key: 'imagens',        label: 'Banco de Imagens'   },
  { key: 'ata',            label: 'ATAs'               },
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

const COLORS = ['#E8642A','#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444']

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function getRecentSlugs() {
  try { return JSON.parse(localStorage.getItem('rc_recent_clients') || '[]') } catch { return [] }
}
function pushRecentSlug(slug) {
  const prev = getRecentSlugs().filter(s => s !== slug)
  localStorage.setItem('rc_recent_clients', JSON.stringify([slug, ...prev].slice(0, 5)))
}

/* ─── Skeleton ─────────────────────────────────────────────────────────── */
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
      <div className="flex gap-2 flex-wrap">
        {[80, 96, 72, 88, 64, 80].map((w, i) => (
          <div key={i} className="h-6 rounded-md" style={{ width: w, backgroundColor: S.ib }} />
        ))}
      </div>
    </div>
  )
}

/* ─── ClientCard ───────────────────────────────────────────────────────── */
function ClientCard({ client, onDelete, deleting, onAccess, stats, onToast }) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const menuRef = useRef(null)
  const color = client.brand_color || '#E8642A'
  const posts = stats?.posts || 0
  const atas  = stats?.atas  || 0
  const hasActivity = posts > 0 || atas > 0

  async function handleExport() {
    setExporting(true); setMenuOpen(false)
    try {
      const summary = await exportClientData(client)
      const total = Object.values(summary).reduce((s, v) => s + v, 0)
      onToast?.(`✓ ${total} registros exportados de ${client.name}`)
    } catch (e) {
      onToast?.(`Erro ao exportar: ${e.message}`, 'error')
    }
    setExporting(false)
  }

  async function handleDuplicate() {
    setMenuOpen(false)
    const newName = window.prompt(`Duplicar "${client.name}". Nome do novo cliente:`, `${client.name} (cópia)`)
    if (!newName?.trim()) return
    try {
      const res = await fetch('/api/duplicate-client', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: client.id, new_name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro')
      onToast?.(`✓ "${newName}" criado com ${Object.values(data.summary || {}).reduce((s, v) => s + v, 0)} itens`)
      window.location.reload()
    } catch (e) {
      onToast?.(`Erro ao duplicar: ${e.message}`, 'error')
    }
  }

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
              <div className="drop-enter absolute right-0 top-full mt-1 rounded-xl border py-1.5 z-50 shadow-2xl min-w-[160px]"
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
                <Link to={`/admin/settings/${client.slug}`} onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                  style={{ color: S.muted }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffffff08'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = S.muted }}>
                  ⚙ Configurações
                </Link>
                <button onClick={handleExport} disabled={exporting}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left disabled:opacity-50"
                  style={{ color: S.muted }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffffff08'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = S.muted }}>
                  {exporting ? '⏳ Exportando…' : '💾 Exportar dados (JSON)'}
                </button>
                <button onClick={handleDuplicate}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
                  style={{ color: S.muted }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ffffff08'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = S.muted }}>
                  📋 Duplicar cliente
                </button>
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

        {/* activity signal */}
        {hasActivity && (
          <div className="flex items-center gap-3 mb-3 text-[11px]" style={{ color: S.muted }}>
            {posts > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                <span className="text-white font-semibold">{posts}</span>
                posts no mês
              </span>
            )}
            {atas > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#6366f1' }} />
                <span className="text-white font-semibold">{atas}</span>
                ATA{atas !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* module pills */}
        <div className="flex flex-wrap gap-1.5">
          {MODULES_SHORT.map(m => (
            <Link key={m.key} to={`/admin/${m.key}/${client.slug}`}
              onClick={() => onAccess(client.slug)}
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

/* ─── Stat pill ────────────────────────────────────────────────────────── */
function Stat({ value, label, accent }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border"
      style={{ backgroundColor: S.card, borderColor: S.border }}>
      <span className="text-lg font-bold" style={{ color: accent || '#fff' }}>{value}</span>
      <span className="text-xs" style={{ color: S.muted }}>{label}</span>
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  useDocumentTitle('Painel')
  const { signOut, isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [clients, setClients]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [newName, setNewName]       = useState('')
  const [newColor, setNewColor]     = useState('#E8642A')
  const [newNicho, setNewNicho]     = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [adding, setAdding]         = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError]           = useState('')
  const [formOpen, setFormOpen]     = useState(false)
  const [search, setSearch]         = useState('')
  const [sortBy, setSortBy]         = useState('recent') // recent | activity | name
  const [stats, setStats]           = useState({ posts: 0, atas: 0, today: 0 })
  const [perClient, setPerClient]   = useState({}) // { [client_id]: { posts, atas } }
  const [recentSlugs, setRecentSlugs] = useState(getRecentSlugs)
  const inputRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => { fetchClients(); fetchStats() }, [])
  useEffect(() => { if (formOpen) setTimeout(() => inputRef.current?.focus(), 50) }, [formOpen])

  /* Open new-client form when navigated with state { openNew: true } (e.g. from Cmd+K) */
  useEffect(() => {
    if (location.state?.openNew) {
      setFormOpen(true)
      /* Clear the state so refresh doesn't re-trigger */
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  /* Auto-refresh stats when tab becomes visible again */
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible') fetchStats()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  /* Keyboard shortcuts: N = new client, / = focus search */
  useEffect(() => {
    function handleKey(e) {
      const tag = (e.target?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
      if (isTyping) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setFormOpen(true)
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function fetchStats() {
    const now = new Date()
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const [postsRes, atasRes, todayRes] = await Promise.allSettled([
      supabase.from('calendar_entries').select('client_id').gte('post_date', start),
      supabase.from('atas').select('client_id'),
      supabase.from('calendar_entries').select('id', { count: 'exact', head: true }).eq('post_date', today),
    ])

    /* Aggregate per-client counts */
    const map = {}
    if (postsRes.status === 'fulfilled' && postsRes.value.data) {
      for (const r of postsRes.value.data) {
        if (!r.client_id) continue
        map[r.client_id] ??= { posts: 0, atas: 0 }
        map[r.client_id].posts++
      }
    }
    if (atasRes.status === 'fulfilled' && atasRes.value.data) {
      for (const r of atasRes.value.data) {
        if (!r.client_id) continue
        map[r.client_id] ??= { posts: 0, atas: 0 }
        map[r.client_id].atas++
      }
    }
    setPerClient(map)

    setStats({
      posts: postsRes.status === 'fulfilled' ? (postsRes.value.data?.length || 0) : 0,
      atas:  atasRes.status  === 'fulfilled' ? (atasRes.value.data?.length  || 0) : 0,
      today: todayRes.status === 'fulfilled' ? (todayRes.value.count        || 0) : 0,
    })
  }

  async function handleAdd(e, withBrief = false) {
    if (e) e.preventDefault()
    if (!newName.trim()) return
    setError(''); setAdding(true)
    const name = newName.trim()
    const slug = generateSlug(name)

    let brainToAttach = null
    let finalColor = newColor

    /* Optional AI brief */
    if (withBrief) {
      try {
        toast.info('Gerando brief inicial com IA…', { duration: 2500 })
        const briefRes = await fetch('/api/create-client-brief', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, nicho: newNicho, website: newWebsite }),
        })
        const briefData = await briefRes.json()
        if (briefRes.ok) {
          brainToAttach = briefData.brain
          if (briefData.suggested_color && newColor === '#E8642A') finalColor = briefData.suggested_color
        }
      } catch { /* best-effort */ }
    }

    const payload = { name, slug, brand_color: finalColor }
    if (brainToAttach) payload.brain = brainToAttach
    if (newNicho)   payload.nicho = newNicho
    if (newWebsite) payload.website = newWebsite

    const { error } = await supabase.from('clients').insert(payload)
    if (error) {
      const msg = error.message.includes('duplicate') ? 'Já existe um cliente com esse nome.' : error.message
      setError(msg)
      toast.error(msg)
    } else {
      setNewName(''); setNewNicho(''); setNewWebsite(''); setFormOpen(false); await fetchClients()
      toast.success(`${name} adicionado${brainToAttach ? ' · Cérebro IA preenchido' : ''}.`)
    }
    setAdding(false)
  }

  async function handleDelete(id) {
    const client = clients.find(c => c.id === id)
    if (!window.confirm(`Excluir ${client?.name || 'este cliente'} e todos os seus dados?`)) return
    setDeletingId(id)
    const { error } = await supabase.from('calendar_entries').delete().eq('client_id', id)
    const { error: e2 } = await supabase.from('clients').delete().eq('id', id)
    if (error || e2) {
      toast.error('Erro ao excluir cliente.')
    } else {
      setClients(p => p.filter(c => c.id !== id))
      toast.success(`${client?.name || 'Cliente'} removido.`)
    }
    setDeletingId(null)
  }

  function handleAccess(slug) {
    pushRecentSlug(slug)
    setRecentSlugs(getRecentSlugs())
  }

  /* Derived */
  const q = search.trim().toLowerCase()
  let filtered = q
    ? clients.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
    : [...clients]

  /* Sort */
  if (sortBy === 'activity') {
    filtered.sort((a, b) => {
      const ap = (perClient[a.id]?.posts || 0) + (perClient[a.id]?.atas || 0)
      const bp = (perClient[b.id]?.posts || 0) + (perClient[b.id]?.atas || 0)
      return bp - ap
    })
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name))
  }
  /* 'recent' = default order from fetchClients (created_at desc) */

  const recentClients = recentSlugs
    .map(slug => clients.find(c => c.slug === slug))
    .filter(Boolean)
    .slice(0, 3)

  const showRecents = !q && recentClients.length > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: S.bg }}>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 h-12 border-b sticky top-0 z-40"
        style={{ backgroundColor: S.card, borderColor: S.border }}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white"
            style={{ backgroundColor: '#E8642A' }}>R</span>
          <span className="font-bold text-sm text-white tracking-tight">Retention Club</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => navigate('/admin/executivo')}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors font-semibold"
            style={{ background: 'linear-gradient(135deg, #E8642A, #E8642Add)', color: '#fff', boxShadow: '0 2px 8px #E8642A40' }}>
            📊 Executivo
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/admin/usuarios')}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: S.ib, color: S.muted }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
              onMouseLeave={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.ib }}>
              👥 Usuários
            </button>
          )}
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

        {/* ─── Page title / greeting ───────────────────────────────────── */}
        <div className="flex items-end justify-between mb-6 gap-6 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">
              {timeGreeting()}{firstName(profile) ? `, ${firstName(profile)}` : ''} <span className="inline-block" style={{ transform: 'translateY(-1px)' }}>👋</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: S.muted }}>
              {stats.today > 0 ? (
                <span>
                  Você tem <span className="text-white font-semibold">{stats.today}</span>
                  {' '}post{stats.today !== 1 ? 's' : ''} agendado{stats.today !== 1 ? 's' : ''} para hoje.
                </span>
              ) : clients.length === 0 ? (
                'Adicione o primeiro cliente para começar.'
              ) : (
                'Nenhum post agendado para hoje. Bom momento para planejar a semana.'
              )}
            </p>
          </div>
          <button onClick={() => setFormOpen(o => !o)}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            style={{ backgroundColor: '#E8642A' }}>
            {formOpen ? '× Cancelar' : '+ Novo cliente'}
          </button>
        </div>

        {/* ─── Stats strip ─────────────────────────────────────────────── */}
        {!loading && clients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Stat value={clients.length} label={clients.length === 1 ? 'cliente ativo' : 'clientes ativos'} accent="#E8642A" />
            <Stat value={stats.posts}    label="posts este mês"   accent="#10b981" />
            {stats.atas > 0 && <Stat value={stats.atas} label="ATAs registradas" accent="#6366f1" />}
          </div>
        )}

        {/* ─── Activity feed (cross-clients) ────────────────────────────── */}
        {!loading && clients.length > 0 && !q && (
          <div className="mb-6">
            <ActivityFeed />
          </div>
        )}

        {/* ─── Add form ────────────────────────────────────────────────── */}
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
                  placeholder="Ex: Peach Up"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>
                    Nicho (opcional)
                  </label>
                  <input type="text" value={newNicho} onChange={e => setNewNicho(e.target.value)}
                    placeholder="Ex: moda feminina, beauty…"
                    className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none"
                    style={{ backgroundColor: S.bg, border: `1px solid ${S.ib}`, color: '#fff' }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>
                    Site (opcional)
                  </label>
                  <input type="text" value={newWebsite} onChange={e => setNewWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none"
                    style={{ backgroundColor: S.bg, border: `1px solid ${S.ib}`, color: '#fff' }} />
                </div>
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
              <div className="flex justify-end gap-2 pt-1 flex-wrap">
                <button type="button" onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border transition-colors"
                  style={{ borderColor: S.ib, color: S.muted }}>
                  Cancelar
                </button>
                <button type="button" onClick={() => handleAdd(null, true)} disabled={adding || !newName.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50"
                  style={{ borderColor: newColor + '80', color: newColor, backgroundColor: newColor + '15' }}>
                  {adding ? '⏳ Gerando…' : '✨ Criar + brief IA'}
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

        {/* ─── Sort tabs ─────────────────────────────────────────────── */}
        {!loading && clients.length > 3 && (
          <div className="flex items-center gap-1 p-1 rounded-xl mb-3 w-fit"
            style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
            {[
              { k: 'recent',   l: '🕒 Recentes'   },
              { k: 'activity', l: '⚡ Atividade'  },
              { k: 'name',     l: 'A-Z'          },
            ].map(o => (
              <button key={o.k} onClick={() => setSortBy(o.k)}
                className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={sortBy === o.k ? { backgroundColor: '#E8642A', color: '#fff' } : { color: S.muted }}>
                {o.l}
              </button>
            ))}
          </div>
        )}

        {/* ─── Search ──────────────────────────────────────────────────── */}
        {!loading && clients.length > 1 && (
          <div className="relative mb-5">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="#555568" strokeWidth="1.5"/>
              <path d="M10.5 10.5l3 3" stroke="#555568" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-full text-sm rounded-xl pl-9 pr-20 py-2.5 focus:outline-none transition-all"
              style={{ backgroundColor: S.card, border: `1px solid ${S.border}`, color: '#fff' }}
              onFocus={e => { e.target.style.borderColor = '#3a3a48' }}
              onBlur={e => { e.target.style.borderColor = S.border }}
            />
            {search ? (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444455] hover:text-white transition-colors text-base leading-none">
                ×
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border pointer-events-none"
                style={{ borderColor: S.ib, color: S.muted }}>
                ⌘K
              </kbd>
            )}
          </div>
        )}

        {/* ─── Client list ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : clients.length === 0 ? (
          /* Empty state */
          <div className="text-center py-24 rounded-xl border" style={{ borderColor: S.border }}>
            <p className="text-3xl mb-3">📋</p>
            <p className="text-white font-semibold mb-1">Nenhum cliente ainda</p>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: S.muted }}>
              Adicione o primeiro cliente para começar a usar os módulos de gestão.
            </p>
            <button onClick={() => setFormOpen(true)}
              className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E8642A' }}>
              + Adicionar primeiro cliente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* No search results */
          <div className="text-center py-16 rounded-xl border" style={{ borderColor: S.border }}>
            <p className="text-2xl mb-3">🔍</p>
            <p className="text-sm" style={{ color: S.muted }}>
              Nenhum cliente encontrado para "<span className="text-white">{search}</span>"
            </p>
            <button onClick={() => setSearch('')}
              className="mt-4 text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: S.ib, color: S.muted }}>
              Limpar busca
            </button>
          </div>
        ) : (
          <>
            {/* Recentes */}
            {showRecents && (
              <section className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: '#3a3a4a' }}>
                  Recentes
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recentClients.map(c => (
                    <ClientCard key={c.id} client={c}
                      onDelete={handleDelete}
                      deleting={deletingId === c.id}
                      onAccess={handleAccess}
                      stats={perClient[c.id]} />
                  ))}
                </div>
              </section>
            )}

            {/* All clients */}
            {showRecents && (
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: '#3a3a4a' }}>
                Todos os clientes
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(c => (
                <ClientCard key={c.id} client={c}
                  onDelete={handleDelete}
                  deleting={deletingId === c.id}
                  onAccess={handleAccess}
                  stats={perClient[c.id]}
                  onToast={(msg, kind) => kind === 'error' ? toast.error(msg) : toast.success(msg)} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
