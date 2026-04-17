/* ──────────────────────────────────────────────────────────────────────────
   /api/suggest-stack
   Analisa as contas cadastradas do cliente e sugere plataformas faltantes
   ou upgrades baseado no perfil da marca.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id } = req.body || {}
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  try {
    const [cliRes, contasRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/central_contas?client_id=eq.${client_id}`, { headers: h }),
    ])
    const client = (await cliRes.json())?.[0] || {}
    const contas = await contasRes.json() || []

    const contasStr = contas.map(c => `- ${c.plataforma} (${c.tipo}) — ${c.status}${c.plano ? ` · ${c.plano}` : ''}`).join('\n') || '(nenhuma conta cadastrada)'

    const prompt = `Você é consultor de stack de CRM. Analise as integrações atuais da marca e sugira o que está faltando.

${client.brain ? `## Marca\n${client.brain.slice(0, 1000)}\n` : ''}

## Contas atuais
${contasStr}

## Sua tarefa
Liste plataformas recomendadas que a marca ainda NÃO tem (não duplique as atuais). Priorize por impacto.

Tipos esperados em uma operação madura: Email (Klaviyo/Mailchimp), WhatsApp (Zenvia/Take/Twilio), SMS, CRM (HubSpot), Analytics (GA4/Amplitude), E-commerce (Shopify/VTEX/Tray), Reviews (Yotpo/Stamped), Push (OneSignal), Cashback (recomendado para moda/beauty).

Responda APENAS com JSON válido (sem markdown):
{
  "gaps_criticos": [
    { "plataforma": "nome", "tipo": "Email|WhatsApp|…", "por_que": "1 frase", "prioridade": "alta|media|baixa" }
  ],
  "upgrades_sugeridos": [
    { "plataforma_atual": "nome", "sugestao": "nome", "por_que": "1 frase" }
  ],
  "resumo": "1-2 frases sobre maturidade da stack atual"
}`

    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
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
