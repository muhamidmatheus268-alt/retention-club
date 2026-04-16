import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MODULES = [
  { key: 'calendar',       label: 'Calendário',        path: 'calendar',       kw: 'calendario posts agenda' },
  { key: 'cerebro',        label: 'Cérebro IA',        path: 'cerebro',        kw: 'cerebro ia brain ai' },
  { key: 'diagnostico',    label: 'Diagnóstico',       path: 'diagnostico',    kw: 'diagnostico analise' },
  { key: 'automacoes',     label: 'Automações',        path: 'automacoes',     kw: 'automacao fluxo email whatsapp' },
  { key: 'relatorios',     label: 'Relatórios',        path: 'relatorios',     kw: 'relatorio metricas' },
  { key: 'projecao',       label: 'Projeção',          path: 'projecao',       kw: 'projecao forecast' },
  { key: 'base',           label: 'Controle de Base',  path: 'base',           kw: 'base contatos' },
  { key: 'acompanhamento', label: 'Acompanhamento',    path: 'acompanhamento', kw: 'acompanhamento tarefas' },
  { key: 'contas',         label: 'Central de Contas', path: 'contas',         kw: 'contas integracoes' },
  { key: 'pesquisas',      label: 'Pesquisas',         path: 'pesquisas',      kw: 'pesquisa survey form' },
  { key: 'imagens',        label: 'Banco de Imagens',  path: 'imagens',        kw: 'imagens banco storage assets' },
  { key: 'ata',            label: 'ATAs',              path: 'ata',            kw: 'ata reuniao minuta' },
]

const S = {
  backdrop: 'rgba(0, 0, 0, 0.55)',
  panel:    '#13131d',
  border:   '#2a2a38',
  bg:       '#0c0c10',
  muted:    '#555568',
  faint:    '#333340',
  accent:   '#E8642A',
}

/* Simple fuzzy: every char of query must appear in target in order */
function fuzzyMatch(q, target) {
  if (!q) return true
  q = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  target = target.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  let i = 0
  for (const ch of q) {
    const idx = target.indexOf(ch, i)
    if (idx === -1) return false
    i = idx + 1
  }
  return true
}

function score(q, target) {
  if (!q) return 1
  q = q.toLowerCase()
  target = target.toLowerCase()
  if (target.startsWith(q)) return 100
  if (target.includes(q))   return 50
  return fuzzyMatch(q, target) ? 10 : 0
}

export default function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(0)
  const [lastSlug, setLastSlug] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('rc_recent_clients') || '[]') || [])[0] || null } catch { return null }
  })
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  /* Load clients once when first opened */
  useEffect(() => {
    if (!open || clients.length > 0) return
    supabase.from('clients').select('id, name, slug, brand_color').order('name')
      .then(({ data }) => setClients(data || []))
  }, [open, clients.length])

  /* Global keyboard listener */
  useEffect(() => {
    function handleKey(e) {
      /* Open: Cmd+K or Ctrl+K */
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (isCmdK) {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      if (!open) return

      if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => s + 1) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(0, s - 1)) }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  /* Focus input on open */
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 30)
      /* Refresh last slug */
      try {
        const arr = JSON.parse(localStorage.getItem('rc_recent_clients') || '[]')
        setLastSlug(arr?.[0] || null)
      } catch { /* ignore */ }
    }
  }, [open])

  /* Body scroll lock */
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  /* Build result list */
  const results = useMemo(() => {
    const items = []

    // Clients
    for (const c of clients) {
      const s = Math.max(score(query, c.name), score(query, c.slug))
      if (s > 0) items.push({
        type: 'client',
        id: `client:${c.id}`,
        label: c.name,
        sub: `/${c.slug}`,
        score: s,
        onSelect: () => navigate(`/admin/calendar/${c.slug}`),
        color: c.brand_color || '#E8642A',
      })
    }

    // Modules (only if we have a "current" client context)
    if (lastSlug) {
      for (const m of MODULES) {
        const s = Math.max(score(query, m.label), score(query, m.kw))
        if (s > 0) items.push({
          type: 'module',
          id: `module:${m.key}`,
          label: m.label,
          sub: `→ /${lastSlug}`,
          score: s,
          onSelect: () => navigate(`/admin/${m.path}/${lastSlug}`),
          color: '#6366f1',
        })
      }
    }

    // Actions
    const actions = [
      { key: 'new',       label: 'Novo cliente',         kw: 'novo cliente criar add',    path: '/admin', state: { openNew: true } },
      { key: 'dashboard', label: 'Painel de clientes',   kw: 'dashboard painel home',     path: '/admin' },
      { key: 'usuarios',  label: 'Gestão de usuários',   kw: 'usuarios users',            path: '/admin/usuarios' },
      { key: 'quiz',      label: 'Funil CRM (quiz)',     kw: 'funil quiz crm',            path: '/admin/quiz-respostas' },
    ]
    for (const a of actions) {
      const s = Math.max(score(query, a.label), score(query, a.kw))
      if (s > 0) items.push({
        type: 'action',
        id: `action:${a.key}`,
        label: a.label,
        sub: a.path,
        score: s,
        onSelect: () => navigate(a.path, a.state ? { state: a.state } : undefined),
        color: a.key === 'new' ? '#E8642A' : '#10b981',
      })
    }

    return items.sort((a, b) => b.score - a.score).slice(0, 12)
  }, [clients, query, navigate, lastSlug])

  /* Reset selection when results change */
  useEffect(() => { setSelected(0) }, [query])

  /* Clamp selection */
  useEffect(() => {
    if (selected >= results.length) setSelected(Math.max(0, results.length - 1))
  }, [selected, results.length])

  /* Scroll selected into view */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  function handleEnter(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[selected]
      if (item) { item.onSelect(); setOpen(false) }
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 modal-backdrop"
      style={{ backgroundColor: S.backdrop, backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}>

      <div className="w-full max-w-xl rounded-2xl border overflow-hidden shadow-2xl modal-panel"
        style={{ backgroundColor: S.panel, borderColor: S.border }}
        onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b" style={{ borderColor: S.border }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="7" cy="7" r="4.5" stroke={S.muted} strokeWidth="1.5"/>
            <path d="M10.5 10.5l3 3" stroke={S.muted} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleEnter}
            placeholder="Buscar cliente, módulo ou ação…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#555568] focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: S.border, color: S.muted }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm" style={{ color: S.muted }}>
                {clients.length === 0 ? 'Carregando…' : 'Nenhum resultado'}
              </p>
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                data-idx={i}
                onClick={() => { r.onSelect(); setOpen(false) }}
                onMouseEnter={() => setSelected(i)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{ backgroundColor: i === selected ? '#ffffff08' : 'transparent' }}>

                <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-[10px] font-black"
                  style={{ backgroundColor: r.color }}>
                  {r.type === 'client' ? r.label.charAt(0).toUpperCase() :
                   r.type === 'module' ? '◈' : '→'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{r.label}</p>
                  <p className="text-[11px] truncate" style={{ color: S.muted }}>{r.sub}</p>
                </div>

                <span className="text-[9px] font-bold uppercase tracking-widest shrink-0" style={{ color: S.faint }}>
                  {r.type === 'client' ? 'Cliente' : r.type === 'module' ? 'Módulo' : 'Ação'}
                </span>

                {i === selected && (
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0"
                    style={{ borderColor: S.border, color: S.muted }}>↵</kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-[10px]"
          style={{ borderColor: S.border, color: S.faint, backgroundColor: '#0f0f17' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded border" style={{ borderColor: S.border }}>↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded border" style={{ borderColor: S.border }}>↵</kbd>
              abrir
            </span>
          </div>
          <span>⌘K / Ctrl+K</span>
        </div>
      </div>
    </div>
  )
}
