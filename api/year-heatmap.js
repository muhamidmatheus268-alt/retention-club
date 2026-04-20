/* ──────────────────────────────────────────────────────────────────────────
   /api/year-heatmap
   Retorna contagem diária de disparos do calendário para um ano inteiro,
   opcionalmente filtrado por client_id.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { ano, client_id } = req.body || {}
  if (!ano) return res.status(400).json({ error: 'ano obrigatório' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  const start = `${ano}-01-01`
  const end   = `${ano}-12-31`

  try {
    let url = `${sbUrl}/rest/v1/calendar_entries?date=gte.${start}&date=lte.${end}&select=date,client_id,acao_comercial,channel,res_receita`
    if (client_id) url += `&client_id=eq.${client_id}`

    const resp = await fetch(url, { headers: h })
    const entries = await resp.json()
    if (!Array.isArray(entries)) {
      return res.status(500).json({ error: 'Resposta inesperada', detail: JSON.stringify(entries).slice(0, 200) })
    }

    /* Agregação: { '2026-01-15': { total: 3, pilares: 1, receita: 1200 } } */
    const days = {}
    let totalEntries = 0
    let totalPilares = 0
    let totalReceita = 0
    const byMonth = Array(12).fill(0)
    for (const e of entries) {
      if (!e.date) continue
      days[e.date] ??= { total: 0, pilares: 0, receita: 0, channels: {} }
      days[e.date].total++
      if (e.acao_comercial) { days[e.date].pilares++; totalPilares++ }
      const r = parseFloat(e.res_receita) || 0
      days[e.date].receita += r
      totalReceita += r
      totalEntries++
      days[e.date].channels[e.channel] = (days[e.date].channels[e.channel] || 0) + 1
      const m = parseInt(e.date.slice(5, 7), 10) - 1
      if (m >= 0 && m < 12) byMonth[m]++
    }

    return res.status(200).json({
      days,
      stats: {
        totalEntries,
        totalPilares,
        totalReceita,
        byMonth,
        activeDays: Object.keys(days).length,
      },
    })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
