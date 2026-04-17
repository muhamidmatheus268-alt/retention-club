/* ──────────────────────────────────────────────────────────────────────────
   /api/generate-survey
   Gera título, perguntas sugeridas e notas para uma pesquisa (NPS/CSAT/etc)
   ────────────────────────────────────────────────────────────────────────── */

const TIPO_TEMPLATES = {
  nps: `NPS clássico: 1 pergunta principal (0-10) + 1 open-ended.`,
  csat: `CSAT: satisfação com escala 1-5 + pergunta aberta.`,
  ces:  `CES: esforço para resolver (escala 1-7) + pergunta aberta.`,
  pos_compra: `Pós-compra: satisfação com produto, entrega, atendimento, intenção de recompra.`,
  produto: `Avaliação de produto: nota geral, pontos fortes, pontos fracos, sugestões.`,
  personalizada: `Customizada: crie até 6 perguntas relevantes ao contexto da marca.`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, tipo = 'nps', canal = 'Email', contexto = '' } = req.body || {}
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY

  let brain = '', clientName = ''
  try {
    const r = await fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } })
    const d = await r.json()
    brain = d?.[0]?.brain || ''; clientName = d?.[0]?.name || ''
  } catch {}

  const prompt = `Você é especialista em pesquisa de experiência do cliente. Crie uma pesquisa de tipo ${tipo.toUpperCase()} para a marca ${clientName || ''}.

${brain ? `## Marca\n${brain.slice(0, 1000)}\n` : ''}
${contexto ? `## Contexto específico\n${contexto}\n` : ''}

## Instrução
${TIPO_TEMPLATES[tipo] || TIPO_TEMPLATES.personalizada}

Canal de envio: ${canal}

## Responda em JSON (sem markdown):
{
  "titulo": "título profissional e curto da pesquisa (máx 80 chars)",
  "perguntas": [
    {
      "ordem": 1,
      "pergunta": "texto da pergunta",
      "tipo": "escala_0_10|escala_1_5|escala_1_7|unica_escolha|aberta|multipla",
      "opcoes": ["opção 1", "opção 2"] ou null,
      "obrigatoria": true | false
    }
  ],
  "introducao": "1-2 frases que aparecem no topo da pesquisa, com tom da marca",
  "agradecimento": "mensagem após envio (máx 120c)",
  "notas_internas": "1 frase para uso interno da agência — o que esperar/analisar"
}`

  try {
    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
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
