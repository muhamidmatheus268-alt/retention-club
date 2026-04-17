/* ──────────────────────────────────────────────────────────────────────────
   /api/forecast-autofill
   Busca métricas históricas do cliente e retorna médias para auto-preencher
   o formulário de Projeção. Opcionalmente gera cenários com IA.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, months = 3, scenarios = false } = req.body || {}

  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  try {
    const [cliRes, biRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/bi_email_metrics?client_id=eq.${client_id}&order=ano.desc,mes.desc&limit=${months}`, { headers: h }),
    ])
    const client = (await cliRes.json())?.[0] || {}
    const rows   = await biRes.json()

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Sem histórico no Diagnóstico — preencha pelo menos 1 mês.' })
    }

    /* Médias */
    const keys = ['base_total','base_ativa','taxa_abertura','taxa_cliques','taxa_conversao','taxa_resposta','ticket_medio','taxa_recompra']
    const averages = {}
    for (const k of keys) {
      const vals = rows.map(r => Number(r[k])).filter(v => !isNaN(v) && v > 0)
      if (vals.length === 0) continue
      averages[k] = +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
    }

    /* Cenários base (calculados) */
    const realista = { ...averages }
    const otimista = Object.fromEntries(Object.entries(averages).map(([k, v]) => {
      if (['taxa_abertura','taxa_cliques','taxa_conversao','taxa_resposta','taxa_recompra'].includes(k)) return [k, +(v * 1.15).toFixed(2)]
      if (k === 'ticket_medio') return [k, +(v * 1.10).toFixed(2)]
      return [k, v]
    }))
    const pessimista = Object.fromEntries(Object.entries(averages).map(([k, v]) => {
      if (['taxa_abertura','taxa_cliques','taxa_conversao','taxa_resposta','taxa_recompra'].includes(k)) return [k, +(v * 0.85).toFixed(2)]
      if (k === 'ticket_medio') return [k, +(v * 0.92).toFixed(2)]
      return [k, v]
    }))

    const response = {
      averages,
      scenarios: { realista, otimista, pessimista },
      based_on: rows.length,
      rationale: null,
    }

    /* Opcional: IA explica */
    if (scenarios) {
      const prompt = `Você é analista de CRM. Com base em ${rows.length} mês(es) de histórico da marca "${client.name || ''}", gere uma frase curta (máx 2 linhas) justificando cada cenário de projeção. ${client.brain ? 'Considere: ' + client.brain.slice(0, 400) : ''}

Médias observadas: ${JSON.stringify(averages)}

Responda JSON: { "realista": "...", "otimista": "...", "pessimista": "..." }`

      try {
        const anth = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
        })
        if (anth.ok) {
          const d = await anth.json()
          let t = d.content?.[0]?.text || '{}'
          t = t.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
          response.rationale = JSON.parse(t)
        }
      } catch { /* optional */ }
    }

    return res.status(200).json(response)
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
