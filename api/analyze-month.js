/* ──────────────────────────────────────────────────────────────────────────
   /api/analyze-month
   Analisa os resultados do mês e sugere melhorias para o próximo.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, year, month, channel } = req.body || {}

  if (!client_id || year == null || month == null || !channel) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: client_id, year, month, channel' })
  }

  /* Buscar entradas do mês via REST */
  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endDate = new Date(year, month + 1, 0)
  const end   = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  let entries = []
  let brain   = ''
  let clientName = ''
  try {
    const [entRes, cliRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/calendar_entries?client_id=eq.${client_id}&channel=eq.${channel}&date=gte.${start}&date=lte.${end}&order=date.asc`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }),
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=brain,name`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }),
    ])
    entries = await entRes.json()
    const cli = await cliRes.json()
    brain      = cli?.[0]?.brain || ''
    clientName = cli?.[0]?.name || ''
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao buscar dados', detail: e.message })
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Nenhuma entrada encontrada no mês para este canal' })
  }

  /* Agregar métricas */
  const withResults = entries.filter(e => e.res_receita != null || e.res_pedidos != null)
  const totalReceita = withResults.reduce((s, e) => s + (parseFloat(e.res_receita) || 0), 0)
  const totalPedidos = withResults.reduce((s, e) => s + (parseFloat(e.res_pedidos) || 0), 0)

  /* Top 3 por receita */
  const top3 = [...withResults]
    .sort((a, b) => (parseFloat(b.res_receita) || 0) - (parseFloat(a.res_receita) || 0))
    .slice(0, 3)
    .map(e => `- ${e.date} "${e.tema}" (${e.segmentacao}): R$ ${parseFloat(e.res_receita || 0).toLocaleString('pt-BR')} · ${e.res_pedidos || 0} pedidos · conv ${e.res_taxa_conversao || '—'}%`)

  const bottom3 = [...withResults]
    .sort((a, b) => (parseFloat(a.res_receita) || 0) - (parseFloat(b.res_receita) || 0))
    .slice(0, 3)
    .map(e => `- ${e.date} "${e.tema}" (${e.segmentacao}): R$ ${parseFloat(e.res_receita || 0).toLocaleString('pt-BR')} · ${e.res_pedidos || 0} pedidos`)

  /* Cadência */
  const segCount = {}
  entries.forEach(e => { if (e.segmentacao) segCount[e.segmentacao] = (segCount[e.segmentacao] || 0) + 1 })
  const segList = Object.entries(segCount).map(([s, c]) => `${s}: ${c}`).join(', ')

  const prompt = `Você é analista sênior de CRM e retenção. Analise o mês que acabou e gere insights acionáveis para o próximo mês.

${brain ? `## Marca\n${brain}\n` : ''}
## Mês analisado: ${String(month + 1).padStart(2, '0')}/${year} — canal: ${channel}
- Total de disparos: ${entries.length}
- Com resultados registrados: ${withResults.length}
- Receita total: R$ ${totalReceita.toLocaleString('pt-BR')}
- Pedidos totais: ${totalPedidos}
- Distribuição por segmentação: ${segList}

## Top 3 campanhas (por receita)
${top3.join('\n') || '—'}

## Bottom 3 campanhas
${bottom3.join('\n') || '—'}

## Responda em JSON (sem markdown), com este formato:
{
  "resumo": "1-2 frases com resumo executivo do mês",
  "destaques": ["ponto positivo 1", "ponto positivo 2", "..."],
  "problemas": ["ponto de atenção 1", "...", "..."],
  "recomendacoes": [
    "ação concreta 1 para o próximo mês",
    "ação concreta 2",
    "ação concreta 3"
  ],
  "cadencia_sugerida": número de disparos por semana recomendado,
  "segmentacoes_priorizar": ["seg1", "seg2"],
  "evitar": ["padrão 1 que não funcionou", "..."]
}`

  try {
    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       process.env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anth.ok) {
      const err = await anth.text()
      return res.status(502).json({ error: 'Erro na API Anthropic', detail: err })
    }

    const data = await anth.json()
    let text   = data.content?.[0]?.text || '{}'
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const first = text.indexOf('{')
    const last  = text.lastIndexOf('}')
    if (first !== -1 && last !== -1) text = text.slice(first, last + 1)

    const analysis = JSON.parse(text)
    return res.status(200).json({
      analysis,
      stats: {
        total: entries.length,
        withResults: withResults.length,
        receita: totalReceita,
        pedidos: totalPedidos,
      },
    })
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao processar resposta', detail: e.message })
  }
}
