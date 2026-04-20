import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const S = { panel: '#13131d', border: '#2a2a38', muted: '#555568', faint: '#333340', input: '#0a0a0f' }

/* Polls Supabase for things that deserve attention:
   - Overdue tasks (acompanhamento.prazo < today, status != concluido)
   - Calendar entries for today still pendente
   - Accounts with renovacao < 30 days
   - ATAs sem action items fechados (> 30 days)
*/
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch()
    const int = setInterval(fetch, 5 * 60 * 1000) // refresh every 5min
    return () => clearInterval(int)
  }, [])

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function fetch() {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const in30   = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

      const { data: clients } = await supabase.from('clients').select('id, name, slug, brand_color')
      const byId = Object.fromEntries((clients || []).map(c => [c.id, c]))

      const [overdue, pendingToday, renewals] = await Promise.all([
        supabase.from('acompanhamento').select('id, titulo, prazo, client_id, prioridade')
          .lt('prazo', today).neq('status', 'concluido').limit(10),
        supabase.from('calendar_entries').select('id, tema, date, client_id, channel')
          .eq('date', today).eq('status', 'pendente').limit(10),
        supabase.from('central_contas').select('id, plataforma, renovacao, client_id')
          .not('renovacao', 'is', null).gte('renovacao', today).lte('renovacao', in30).limit(10),
      ])

      const out = []
      for (const r of (overdue.data || [])) {
        const c = byId[r.client_id]
        out.push({
          id: `ovd-${r.id}`, kind: 'overdue', severity: r.prioridade === 'alta' ? 'high' : 'med',
          icon: '🔴', title: `Tarefa atrasada`, body: r.titulo,
          meta: c?.name, link: c ? `/admin/acompanhamento/${c.slug}` : null,
          client: c, ts: r.prazo,
        })
      }
      for (const r of (pendingToday.data || [])) {
        const c = byId[r.client_id]
        out.push({
          id: `pnd-${r.id}`, kind: 'today_pending', severity: 'med',
          icon: '⏰', title: `Post pendente hoje`, body: r.tema,
          meta: `${r.channel} · ${c?.name || ''}`, link: c ? `/admin/calendar/${c.slug}` : null,
          client: c, ts: r.date,
        })
      }
      for (const r of (renewals.data || [])) {
        const c = byId[r.client_id]
        const days = Math.ceil((new Date(r.renovacao) - new Date()) / 86400000)
        out.push({
          id: `rnv-${r.id}`, kind: 'renewal', severity: days <= 7 ? 'high' : 'low',
          icon: days <= 7 ? '⚠' : '💡', title: `Renovação em ${days}d`, body: r.plataforma,
          meta: c?.name, link: c ? `/admin/contas/${c.slug}` : null,
          client: c, ts: r.renovacao,
        })
      }

      /* Sort: high severity first, then by recency */
      out.sort((a, b) => {
        const sev = { high: 2, med: 1, low: 0 }
        if (sev[b.severity] !== sev[a.severity]) return sev[b.severity] - sev[a.severity]
        return (a.ts || '').localeCompare(b.ts || '')
      })
      setItems(out)
    } catch {
      setItems([])
    }
    setLoading(false)
  }

  const count = items.length
  const hasHigh = items.some(i => i.severity === 'high')

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        title={`${count} notificação${count !== 1 ? 'ões' : ''}`}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: S.muted, backgroundColor: open ? '#ffffff0a' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.backgroundColor = '#ffffff08' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.backgroundColor = 'transparent' }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M8 2a4 4 0 014 4v2l1 2H3l1-2V6a4 4 0 014-4z" stroke={hasHigh ? '#ef4444' : '#8b8ba0'} strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M6.5 12.5a1.5 1.5 0 003 0" stroke={hasHigh ? '#ef4444' : '#8b8ba0'} strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: hasHigh ? '#ef4444' : '#E8642A' }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="drop-enter absolute right-0 top-full mt-1 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{ backgroundColor: S.panel, borderColor: S.border, width: 340 }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: S.border }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8b8ba0' }}>
              Notificações
            </p>
            {count > 0 && <span className="text-[10px]" style={{ color: S.muted }}>{count} pendente{count !== 1 ? 's' : ''}</span>}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <p className="text-center py-8 text-xs" style={{ color: S.muted }}>Carregando…</p>
            ) : items.length === 0 ? (
              <div className="text-center py-10 px-5">
                <p className="text-2xl mb-2">✨</p>
                <p className="text-sm text-white font-semibold mb-1">Tudo em dia!</p>
                <p className="text-[11px]" style={{ color: S.muted }}>Nenhuma pendência urgente.</p>
              </div>
            ) : (
              items.map(it => {
                const sevColor = it.severity === 'high' ? '#ef4444' : it.severity === 'med' ? '#f59e0b' : '#6366f1'
                return (
                  <button key={it.id} onClick={() => { if (it.link) { navigate(it.link); setOpen(false) } }}
                    disabled={!it.link}
                    className="w-full flex items-start gap-3 px-4 py-2.5 border-b text-left transition-colors"
                    style={{ borderColor: '#1a1a26' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffffff05'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                    <span className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-sm"
                      style={{ backgroundColor: sevColor + '22', color: sevColor }}>
                      {it.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-semibold text-white">{it.title}</p>
                      </div>
                      <p className="text-xs truncate" style={{ color: '#c4c4d0' }}>{it.body}</p>
                      {it.meta && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {it.client && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: it.client.brand_color || '#E8642A' }} />}
                          <p className="text-[10px]" style={{ color: S.muted }}>{it.meta}</p>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="px-4 py-2 border-t text-[10px] text-center" style={{ borderColor: S.border, color: S.faint, backgroundColor: '#0f0f17' }}>
            Atualiza automaticamente a cada 5 min
          </div>
        </div>
      )}
    </div>
  )
}
