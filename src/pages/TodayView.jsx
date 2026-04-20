import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from '../components/NotificationBell'

const S = { bg: '#0c0c10', card: '#111118', border: '#1e1e2a', ib: '#2a2a38', muted: '#555568', faint: '#333340' }

function weekday(date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'long' })
}
function dateBR(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function TodayView() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => new Date())

  useEffect(() => { fetchData() }, [date])

  async function fetchData() {
    setLoading(true)
    const iso   = date.toISOString().slice(0, 10)
    const tomorrow = new Date(date); tomorrow.setDate(tomorrow.getDate() + 1)
    const tomIso = tomorrow.toISOString().slice(0, 10)
    const weekAgo = new Date(date); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoIso = weekAgo.toISOString().slice(0, 10)

    const [clients, posts, postsTmw, tasksDue, tasksOverdue, atas] = await Promise.all([
      supabase.from('clients').select('id, name, slug, brand_color'),
      supabase.from('calendar_entries').select('id, tema, channel, horario, status, client_id, acao_comercial, assunto, segmentacao')
        .eq('date', iso),
      supabase.from('calendar_entries').select('id, tema, channel, client_id, status')
        .eq('date', tomIso),
      supabase.from('acompanhamento').select('id, titulo, prioridade, status, client_id, prazo')
        .eq('prazo', iso).neq('status', 'concluido'),
      supabase.from('acompanhamento').select('id, titulo, prioridade, status, client_id, prazo')
        .lt('prazo', iso).neq('status', 'concluido').limit(15),
      supabase.from('atas').select('id, titulo, data, client_id')
        .gte('data', weekAgoIso).lte('data', iso).limit(5),
    ])

    const byId = Object.fromEntries((clients.data || []).map(c => [c.id, c]))
    setData({
      byId,
      posts:        posts.data || [],
      postsTmw:     postsTmw.data || [],
      tasksDue:     tasksDue.data || [],
      tasksOverdue: tasksOverdue.data || [],
      recentAtas:   atas.data || [],
      clientsCount: (clients.data || []).length,
    })
    setLoading(false)
  }

  async function toggleTask(id, currentStatus) {
    const next = currentStatus === 'concluido' ? 'pendente' : 'concluido'
    await supabase.from('acompanhamento').update({ status: next }).eq('id', id)
    fetchData()
  }

  const isToday = date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
  const hasNothing = !loading && data && data.posts.length === 0 && data.tasksDue.length === 0 && data.tasksOverdue.length === 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: S.bg }}>
      <header className="flex items-center justify-between px-6 h-12 border-b sticky top-0 z-40"
        style={{ backgroundColor: S.card, borderColor: S.border }}>
        <div className="flex items-center gap-2 text-xs">
          <Link to="/admin" className="hover:text-white transition-colors" style={{ color: S.muted }}>← Clientes</Link>
          <span style={{ color: S.faint }}>/</span>
          <span className="text-white font-semibold">Hoje</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d) }}
            className="text-xs px-2.5 py-1.5 rounded-lg border" style={{ borderColor: S.ib, color: S.muted }}>←</button>
          {!isToday && (
            <button onClick={() => setDate(new Date())}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ backgroundColor: '#E8642A', color: '#fff' }}>
              Hoje
            </button>
          )}
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d) }}
            className="text-xs px-2.5 py-1.5 rounded-lg border" style={{ borderColor: S.ib, color: S.muted }}>→</button>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: S.ib, color: S.muted }}>
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: S.muted }}>
            {weekday(date)}
          </p>
          <h1 className="text-2xl font-bold text-white">{dateBR(date)}</h1>
        </div>

        {loading && (
          <p className="text-center py-20 text-sm" style={{ color: S.muted }}>Carregando agenda do dia…</p>
        )}

        {!loading && hasNothing && isToday && (
          <div className="rounded-2xl border p-10 text-center"
            style={{ backgroundColor: S.card, borderColor: S.border }}>
            <p className="text-5xl mb-3">🌴</p>
            <p className="text-white font-bold text-lg mb-1">Dia tranquilo!</p>
            <p className="text-sm" style={{ color: S.muted }}>
              Nenhum post agendado ou tarefa para hoje. Bom momento para planejar a semana ou revisar métricas.
            </p>
            <Link to="/admin/executivo"
              className="inline-block mt-5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: '#E8642A' }}>
              📊 Ver dashboard executivo
            </Link>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-6">
            {/* Quick stats */}
            {(data.posts.length > 0 || data.tasksDue.length > 0) && (
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Posts hoje" value={data.posts.length} accent="#10b981" />
                <Stat label="Tarefas hoje" value={data.tasksDue.length} accent="#6366f1" />
                {data.tasksOverdue.length > 0 && (
                  <Stat label="Atrasadas" value={data.tasksOverdue.length} accent="#ef4444" />
                )}
              </div>
            )}

            {/* Posts scheduled today */}
            {data.posts.length > 0 && (
              <Section title="📅 Posts de hoje" count={data.posts.length}>
                {data.posts
                  .sort((a, b) => (a.horario || '99:99').localeCompare(b.horario || '99:99'))
                  .map(p => {
                  const c = data.byId[p.client_id]
                  return (
                    <Link key={p.id} to={c ? `/admin/calendar/${c.slug}` : '#'}
                      className="flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-[#ffffff05]"
                      style={{ backgroundColor: '#0c0c10', borderColor: S.border }}>
                      <div className="shrink-0 text-center" style={{ minWidth: 52 }}>
                        <p className="text-sm font-bold text-white font-mono">{p.horario || '—'}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: S.muted }}>{p.channel}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c?.brand_color || '#E8642A' }} />
                          <span className="text-xs font-semibold text-white truncate">{c?.name || 'Cliente'}</span>
                          {p.acao_comercial && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                            style={{ backgroundColor: '#f59e0b22', color: '#f59e0b' }}>★ Pilar</span>}
                          <StatusDot status={p.status} />
                        </div>
                        <p className="text-sm text-white truncate">{p.tema || '(sem tema)'}</p>
                        {p.assunto && <p className="text-[11px] mt-0.5 truncate" style={{ color: '#8b8ba0' }}>{p.assunto}</p>}
                      </div>
                    </Link>
                  )
                })}
              </Section>
            )}

            {/* Overdue tasks */}
            {data.tasksOverdue.length > 0 && (
              <Section title="🔴 Tarefas atrasadas" count={data.tasksOverdue.length} color="#ef4444">
                {data.tasksOverdue.map(t => (
                  <TaskRow key={t.id} task={t} client={data.byId[t.client_id]} onToggle={toggleTask} overdue />
                ))}
              </Section>
            )}

            {/* Due today tasks */}
            {data.tasksDue.length > 0 && (
              <Section title="✅ Tarefas de hoje" count={data.tasksDue.length}>
                {data.tasksDue.map(t => (
                  <TaskRow key={t.id} task={t} client={data.byId[t.client_id]} onToggle={toggleTask} />
                ))}
              </Section>
            )}

            {/* Tomorrow preview */}
            {data.postsTmw.length > 0 && (
              <Section title="🔜 Amanhã" count={data.postsTmw.length}>
                {data.postsTmw.map(p => {
                  const c = data.byId[p.client_id]
                  return (
                    <Link key={p.id} to={c ? `/admin/calendar/${c.slug}` : '#'}
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors hover:bg-[#ffffff05]"
                      style={{ backgroundColor: '#0c0c10', borderColor: S.border, color: '#c4c4d0' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c?.brand_color || '#E8642A' }} />
                      <span className="truncate">{c?.name}</span>
                      <span style={{ color: S.muted }}>·</span>
                      <span className="truncate flex-1">{p.tema}</span>
                      <span className="shrink-0" style={{ color: S.faint }}>{p.channel}</span>
                    </Link>
                  )
                })}
              </Section>
            )}

            {/* Recent ATAs */}
            {data.recentAtas.length > 0 && (
              <Section title="📝 ATAs recentes (7d)" count={data.recentAtas.length}>
                {data.recentAtas.map(a => {
                  const c = data.byId[a.client_id]
                  return (
                    <Link key={a.id} to={c ? `/admin/ata/${c.slug}` : '#'}
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors hover:bg-[#ffffff05]"
                      style={{ backgroundColor: '#0c0c10', borderColor: S.border, color: '#c4c4d0' }}>
                      <span className="shrink-0 font-mono text-[10px]" style={{ color: S.muted }}>{a.data}</span>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c?.brand_color || '#E8642A' }} />
                      <span className="truncate">{c?.name}</span>
                      <span style={{ color: S.muted }}>·</span>
                      <span className="truncate flex-1">{a.titulo}</span>
                    </Link>
                  )
                })}
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <p className="text-2xl font-bold" style={{ color: accent || '#fff' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: S.muted }}>{label}</p>
    </div>
  )
}

function Section({ title, count, color, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: color || S.muted }}>
          {title}
        </p>
        <span className="text-[10px]" style={{ color: S.faint }}>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function StatusDot({ status }) {
  const map = { pendente: '#f59e0b', agendado: '#3b82f6', criado: '#8b5cf6', enviado: '#10b981' }
  const color = map[status] || '#6b7280'
  return <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} title={status} />
}

function TaskRow({ task, client, onToggle, overdue }) {
  const priColor = task.prioridade === 'alta' ? '#ef4444' : task.prioridade === 'media' ? '#f59e0b' : '#6b7280'
  const done = task.status === 'concluido'
  return (
    <div className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
      style={{ backgroundColor: '#0c0c10', borderColor: S.border,
        opacity: done ? 0.4 : 1,
        borderLeft: `3px solid ${overdue ? '#ef4444' : priColor}` }}>
      <button onClick={() => onToggle(task.id, task.status)}
        className="w-4 h-4 rounded border shrink-0 flex items-center justify-center mt-0.5"
        style={{ borderColor: done ? priColor : '#2a2a38', backgroundColor: done ? priColor : 'transparent' }}>
        {done && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6.5l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm text-white ${done ? 'line-through' : ''}`}>{task.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {client && (
            <>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: client.brand_color || '#E8642A' }} />
              <span className="text-[10px]" style={{ color: S.muted }}>{client.name}</span>
            </>
          )}
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
            style={{ backgroundColor: priColor + '22', color: priColor }}>{task.prioridade}</span>
          {overdue && <span className="text-[10px]" style={{ color: '#ef4444' }}>⏱ {task.prazo}</span>}
        </div>
      </div>
      {client && (
        <Link to={`/admin/acompanhamento/${client.slug}`} className="text-[10px] shrink-0" style={{ color: S.muted }}>
          ↗
        </Link>
      )}
    </div>
  )
}
