/* ──────────────────────────────────────────────────────────────────────────
   /api/segment-base
   Sugere segmentações estratégicas baseadas na saúde da base de contatos.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, mes, ano } = req.body || {}
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  try {
    const [cliRes, baseRes, biRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: h }),
      mes && ano
        ? fetch(`${sbUrl}/rest/v1/controle_base?client_id=eq.${client_id}&mes=eq.${mes}&ano=eq.${ano}`, { headers: h })
        : fetch(`${sbUrl}/rest/v1/controle_base?client_id=eq.${client_id}&order=ano.desc,mes.desc&limit=1`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/bi_email_metrics?client_id=eq.${client_id}&order=ano.desc,mes.desc&limit=1`, { headers: h }),
    ])
    const client = (await cliRes.json())?.[0] || {}
    const base   = (await baseRes.json())?.[0] || null
    const bi     = (await biRes.json())?.[0] || null

    const baseLines = base ? Object.entries(base)
      .filter(([k, v]) => v != null && !['id','client_id','created_at','updated_at','mes','ano'].includes(k))
      .map(([k, v]) => `- ${k}: ${v}`).join('\n') : '(sem dados de Controle de Base)'

    const biLine = bi
      ? `Abertura ${bi.taxa_abertura}%, Cliques ${bi.taxa_cliques}%, Conversão ${bi.taxa_conversao}%, Recompra ${bi.taxa_recompra}%, LTV ${bi.ltv_projetado}, CAC ${bi.cac}`
      : '(sem métricas BI)'

    const prompt = `Você é estrategista de CRM. Sugira segmentações CRM acionáveis para ${client.name || 'esta marca'}.

${client.brain ? `## Marca\n${client.brain.slice(0, 1200)}\n` : ''}

## Saúde da base
${baseLines}

## Métricas BI
${biLine}

## Sua tarefa
Sugira 6-8 segmentações práticas, priorizadas por impacto. Para cada uma, dê:
- nome curto (ex: "VIPs inativos")
- critério técnico (ex: "3+ compras · última compra 60-120d · LTV > R$1000")
- estratégia (ex: "Cupom exclusivo + urgência")
- tamanho estimado (% da base total)
- canal recomendado

## Formato — JSON apenas, sem markdown:
{
  "resumo_base": "1-2 frases sobre saúde/oportunidade da base",
  "segmentacoes": [
    {
      "nome": "...",
      "criterio": "...",
      "estrategia": "...",
      "tamanho_estimado_pct": número 0-100,
      "canal_recomendado": "Email|WhatsApp|SMS|Multi-canal",
      "prioridade": "alta|media|baixa",
      "impacto": "resumo do impacto esperado (1 frase)"
    }
  ]
}`

    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!anth.ok) { const e = await anth.text(); return res.status(502).json({ error: 'Anthropic error', detail: e }) }
    const data = await anth.json()
    let text = data.content?.[0]?.text || '{}'
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const first = text.indexOf('{'), last = text.lastIndexOf('}')
    if (first !== -1 && last !== -1) text = text.slice(first, last + 1)
    return res.status(200).json(JSON.parse(text))
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
