import { useState, useEffect, useMemo } from 'react'

const S = { card: '#111118', border: '#1e1e2a', ib: '#2a2a38', muted: '#555568', faint: '#333340' }
const MONTH_NAMES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const WEEKDAYS_SHORT   = ['S','T','Q','Q','S','S','D']

/* Cor progressiva baseada em contagem de disparos no dia (GitHub-like) */
function levelColor(total, brandColor) {
  if (total === 0) return '#1a1a26'
  if (total === 1) return brandColor + '33'
  if (total === 2) return brandColor + '66'
  if (total === 3) return brandColor + '99'
  if (total <= 5) return brandColor + 'cc'
  return brandColor
}

export default function YearHeatmap({ ano = new Date().getFullYear(), clientId = null, brandColor = '#E8642A', height = 140 }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch('/api/year-heatmap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ano, client_id: clientId }),
    })
      .then(r => r.json())
      .then(d => { if (alive) { setData(d); setLoading(false) } })
      .catch(() => { if (alive) { setData(null); setLoading(false) } })
    return () => { alive = false }
  }, [ano, clientId])

  /* Build 7x53 grid (53 weeks) */
  const grid = useMemo(() => {
    if (!data?.days) return null
    const out = []
    const today = new Date()
    const start = new Date(ano, 0, 1)
    const startDow = (start.getDay() + 6) % 7  // Mon=0
    const firstMonday = new Date(start)
    firstMonday.setDate(firstMonday.getDate() - startDow)

    for (let w = 0; w < 53; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(firstMonday)
        date.setDate(firstMonday.getDate() + w * 7 + d)
        const iso = date.toISOString().slice(0, 10)
        const inYear = date.getFullYear() === ano
        const isFuture = date > today
        week.push({
          iso, inYear, isFuture, month: date.getMonth(),
          day: data.days[iso] || null,
        })
      }
      out.push(week)
    }
    return out
  }, [data, ano])

  /* Month labels positions */
  const monthLabels = useMemo(() => {
    if (!grid) return []
    const out = []
    let lastMonth = -1
    grid.forEach((week, wi) => {
      const firstInYear = week.find(d => d.inYear)
      if (firstInYear && firstInYear.month !== lastMonth) {
        out.push({ wi, month: firstInYear.month })
        lastMonth = firstInYear.month
      }
    })
    return out
  }, [grid])

  if (loading) {
    return (
      <div className="rounded-xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: S.muted }}>
          Atividade {ano}
        </p>
        <div className="animate-pulse h-32 rounded-lg" style={{ backgroundColor: S.ib }} />
      </div>
    )
  }

  if (!data) return null
  const stats = data.stats || {}

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: S.card, borderColor: S.border }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.muted }}>
            Atividade {ano}
          </p>
          <p className="text-xs mt-0.5" style={{ color: S.faint }}>
            <span className="text-white font-semibold">{stats.totalEntries}</span> disparos ·
            <span className="text-white font-semibold"> {stats.totalPilares}</span> pilares ·
            <span className="text-white font-semibold"> {stats.activeDays}</span> dias ativos
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: S.muted }}>
          <span>menos</span>
          {[0,1,2,3,5].map(v => (
            <span key={v} className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: levelColor(v, brandColor) }} />
          ))}
          <span>mais</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="relative pl-6 overflow-x-auto">
        <div className="flex gap-[3px] mb-1 text-[9px] font-semibold min-w-max" style={{ color: S.muted }}>
          {Array.from({ length: 53 }).map((_, wi) => {
            const label = monthLabels.find(m => m.wi === wi)
            return (
              <div key={wi} style={{ width: 12 }}>
                {label ? MONTH_NAMES_SHORT[label.month] : ''}
              </div>
            )
          })}
        </div>

        <div className="flex gap-[3px]" style={{ minWidth: 'max-content' }}>
          {/* Day-of-week labels on left */}
          <div className="flex flex-col gap-[3px] text-[9px] mr-1 justify-between absolute left-0 top-5"
            style={{ color: S.faint, height: 7 * 12 + 6 * 3 }}>
            {WEEKDAYS_SHORT.map((d, i) => (
              <span key={i} style={{ height: 12, lineHeight: '12px' }}>{i % 2 ? d : ''}</span>
            ))}
          </div>

          {grid?.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) => {
                const total = cell.day?.total || 0
                const c = !cell.inYear ? 'transparent'
                  : cell.isFuture ? '#0c0c10'
                  : levelColor(total, brandColor)
                return (
                  <div
                    key={di}
                    className="w-3 h-3 rounded-sm transition-transform"
                    style={{
                      backgroundColor: c,
                      border: cell.inYear && cell.isFuture ? '1px dashed #1e1e2a' : 'none',
                      cursor: cell.day ? 'pointer' : 'default',
                    }}
                    onMouseEnter={() => cell.day && setHovered({ ...cell, total })}
                    onMouseLeave={() => setHovered(null)}
                    title={cell.inYear ? `${cell.iso} · ${total} disparo${total !== 1 ? 's' : ''}${cell.day?.pilares ? ` · ${cell.day.pilares} pilar${cell.day.pilares !== 1 ? 'es' : ''}` : ''}` : ''}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {hovered && hovered.day && (
          <div className="mt-3 text-xs flex items-center gap-3 flex-wrap" style={{ color: '#c4c4d0' }}>
            <span className="font-mono font-bold" style={{ color: '#fff' }}>{hovered.iso}</span>
            <span>{hovered.total} disparo{hovered.total !== 1 ? 's' : ''}</span>
            {hovered.day.pilares > 0 && <span style={{ color: '#f59e0b' }}>{hovered.day.pilares} pilar{hovered.day.pilares !== 1 ? 'es' : ''}</span>}
            {hovered.day.receita > 0 && <span style={{ color: '#10b981' }}>R$ {hovered.day.receita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
