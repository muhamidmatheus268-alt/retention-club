/* ──────────────────────────────────────────────────────────────────────────
   /api/executive-summary
   Cross-clients: soma métricas, avalia saúde, gera insights executivos com IA.
   ────────────────────────────────────────────────────────────────────────── */

function safeN(v) { const n = Number(v); return isFinite(n) ? n : 0 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { mes, ano } = req.body || {}
  if (!mes || !ano) return res.status(400).json({ error: 'mes, ano obrigatórios' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  try {
    const [cliRes, biRes, calRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/clients?select=id,name,brand_color`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/bi_email_metrics?mes=eq.${mes}&ano=eq.${ano}`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/calendar_entries?date=gte.${ano}-${String(mes).padStart(2,'0')}-01&date=lte.${ano}-${String(mes).padStart(2,'0')}-31`, { headers: h }),
    ])
    const clients = await cliRes.json()
    const bi      = await biRes.json()
    const entries = await calRes.json()

    const biByClient  = Object.fromEntries((bi || []).map(r => [r.client_id, r]))
    const calByClient = {}
    for (const e of (entries || [])) {
      calByClient[e.client_id] ??= { total: 0, with_results: 0, receita: 0, pedidos: 0 }
      calByClient[e.client_id].total++
      if (e.res_receita != null || e.res_pedidos != null) calByClient[e.client_id].with_results++
      calByClient[e.client_id].receita += safeN(e.res_receita)
      calByClient[e.client_id].pedidos += safeN(e.res_pedidos)
    }

    /* Health score por cliente: 0-100 baseado em abertura/conversao/meta */
    const perClient = clients.map(c => {
      const b = biByClient[c.id] || {}
      const cal = calByClient[c.id] || { total: 0, with_results: 0, receita: 0, pedidos: 0 }

      let health = 50
      if (safeN(b.taxa_abertura) >= 25) health += 15
      else if (safeN(b.taxa_abertura) >= 18) health += 5
      else if (safeN(b.taxa_abertura) > 0 && safeN(b.taxa_abertura) < 15) health -= 15
      if (safeN(b.taxa_conversao) >= 2) health += 15
      else if (safeN(b.taxa_conversao) >= 1) health += 5
      else if (safeN(b.taxa_conversao) > 0 && safeN(b.taxa_conversao) < 0.5) health -= 15
      if (safeN(b.meta_receita) > 0) {
        const pct = safeN(b.receita) / safeN(b.meta_receita)
        if (pct >= 1) health += 10
        else if (pct >= 0.8) health += 5
        else if (pct < 0.5) health -= 10
      }
      if (cal.total === 0) health -= 10
      health = Math.max(0, Math.min(100, health))

      return {
        id: c.id, name: c.name, color: c.brand_color || '#E8642A',
        health,
        receita_bi:  safeN(b.receita),
        receita_cal: cal.receita,
        meta:        safeN(b.meta_receita),
        abertura:    safeN(b.taxa_abertura),
        conversao:   safeN(b.taxa_conversao),
        disparos:    cal.total,
        has_bi:      !!biByClient[c.id],
      }
    })

    const totalReceita = perClient.reduce((s, c) => s + c.receita_bi, 0)
    const totalMeta    = perClient.reduce((s, c) => s + c.meta, 0)
    const totalDisparos = perClient.reduce((s, c) => s + c.disparos, 0)
    const totalPedidos = Object.values(calByClient).reduce((s, c) => s + c.pedidos, 0)

    const healthy   = perClient.filter(c => c.health >= 70).length
    const atRisk    = perClient.filter(c => c.health < 50).length
    const noData    = perClient.filter(c => !c.has_bi).length

    const top3    = [...perClient].sort((a, b) => b.receita_bi - a.receita_bi).slice(0, 3)
    const worst3  = [...perClient].filter(c => c.has_bi).sort((a, b) => a.health - b.health).slice(0, 3)

    /* IA summary */
    let aiSummary = null
    try {
      const prompt = `Você é CTO/COO de agência de CRM. Resumo executivo da carteira de ${clients.length} clientes em ${String(mes).padStart(2, '0')}/${ano}.

## Agregados
- Receita total: R$ ${totalReceita.toLocaleString('pt-BR')}
- Meta agregada: R$ ${totalMeta.toLocaleString('pt-BR')} (${totalMeta > 0 ? ((totalReceita / totalMeta) * 100).toFixed(1) + '%' : '—'})
- Disparos totais: ${totalDisparos}
- Pedidos: ${totalPedidos}
- Saúde: ${healthy} saudáveis · ${atRisk} em risco · ${noData} sem dados

## Top 3
${top3.map(c => `- ${c.name}: R$ ${c.receita_bi.toLocaleString('pt-BR')} · saúde ${c.health}`).join('\n')}

## Bottom 3 (em risco)
${worst3.map(c => `- ${c.name}: saúde ${c.health} · abertura ${c.abertura}% · conversão ${c.conversao}%`).join('\n') || '—'}

## Sua tarefa
Responda JSON (sem markdown):
{
  "headline": "1 frase executiva sobre o mês da carteira",
  "acoes_da_semana": ["3 ações prioritárias na carteira toda", "...", "..."],
  "clientes_para_acionar": ["nome do cliente + 1 frase do que fazer"]
}`

      const anth = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
      })
      if (anth.ok) {
        const d = await anth.json()
        let t = d.content?.[0]?.text || '{}'
        t = t.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
        const f = t.indexOf('{'), l = t.lastIndexOf('}')
        if (f !== -1 && l !== -1) t = t.slice(f, l + 1)
        aiSummary = JSON.parse(t)
      }
    } catch { /* AI is best-effort */ }

    return res.status(200).json({
      totals: {
        clientes: clients.length,
        receita: totalReceita,
        meta: totalMeta,
        atingimento_pct: totalMeta > 0 ? (totalReceita / totalMeta) * 100 : null,
        disparos: totalDisparos,
        pedidos: totalPedidos,
        healthy, atRisk, noData,
      },
      per_client: perClient,
      top3,
      worst3,
      ai: aiSummary,
    })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
