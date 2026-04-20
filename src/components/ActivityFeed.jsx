import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const S = { card: '#111118', border: '#1e1e2a', muted: '#555568', faint: '#333340' }

/* Fetches the last N events across multiple tables + clients */
export default function ActivityFeed() {
  const [events, setEvents] = useState(null)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    try {
      const [cal, ata, rel, tsk, auto] = await Promise.all([
        supabase.from('calendar_entries').select('id, tema, date, status, channel, client_id, created_at, updated_at').order('updated_at', { ascending: false }).limit(5),
        supabase.from('atas').select('id, titulo, data, client_id, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('relatorios').select('id, titulo, mes, ano, client_id, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('acompanhamento').select('id, titulo, status, client_id, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('automacoes').select('id, nome, status_automacao, client_id, created_at').order('created_at', { ascending: false }).limit(4),
      ])
      const { data: clients } = await supabase.from('clients').select('id, name, slug, brand_color')
      const byId = Object.fromEntries((clients || []).map(c => [c.id, c]))

      const items = []
      for (const r of (cal.data || [])) {
        items.push({ ts: r.updated_at || r.created_at, kind: 'cal', icon: '📅', label: `Calendário · ${r.tema || 'disparo'}`, sub: r.date, client: byId[r.client_id], link: `/admin/calendar/${byId[r.client_id]?.slug}` })
      }
      for (const r of (ata.data || [])) {
        items.push({ ts: r.created_at, kind: 'ata', icon: '📝', label: `ATA · ${r.titulo || 'reunião'}`, sub: r.data, client: byId[r.client_id], link: `/admin/ata/${byId[r.client_id]?.slug}` })
      }
      for (const r of (rel.data || [])) {
        items.push({ ts: r.created_at, kind: 'rel', icon: '📊', label: `Relatório · ${r.titulo || 'novo'}`, sub: `${r.mes}/${r.ano}`, client: byId[r.client_id], link: `/admin/relatorios/${byId[r.client_id]?.slug}` })
      }
      for (const r of (tsk.data || [])) {
        items.push({ ts: r.created_at, kind: 'tsk', icon: '✅', label: `Tarefa · ${r.titulo}`, sub: r.status, client: byId[r.client_id], link: `/admin/acompanhamento/${byId[r.client_id]?.slug}` })
      }
      for (const r of (auto.data || [])) {
        items.push({ ts: r.created_at, kind: 'auto', icon: '⚙', label: `Automação · ${r.nome || 'régua'}`, sub: r.status_automacao, client: byId[r.client_id], link: `/admin/automacoes/${byId[r.client_id]?.slug}` })
      }
      items.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
      setEvents(items.slice(0, 8))
    } catch (e) {
      setEvents([])
    }
  }

  if (events == null) {
    return (
      <div className="rounded-xl border p-4" style={{ backgroundColor: S.card, borderColor: S.border }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.muted }}>Atividade recente</p>
        <p className="text-xs mt-2" style={{ color: S.faint }}>Carregando…</p>
      </div>
    )
  }
  if (events.length === 0) return null

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: S.muted }}>Atividade recente</p>
      <div className="space-y-2">
        {events.map((e, i) => (
          <Link key={i} to={e.link || '#'}
            className="flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg transition-colors hover:bg-[#ffffff08]">
            <span className="text-sm shrink-0">{e.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{e.label}</p>
              <div className="flex items-center gap-2 text-[10px]" style={{ color: S.muted }}>
                {e.client && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.client.brand_color || '#E8642A' }} />
                    <span className="truncate">{e.client.name}</span>
                  </>
                )}
                {e.sub && <><span>·</span><span>{e.sub}</span></>}
              </div>
            </div>
            <span className="text-[10px] shrink-0" style={{ color: S.faint }}>{relTime(e.ts)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function relTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
