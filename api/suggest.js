export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tema, channel, date, acao_comercial, client_id } = req.body || {}

  // fetch client brain from Supabase
  let brain = ''
  if (client_id) {
    try {
      const sbUrl  = process.env.VITE_SUPABASE_URL
      const sbKey  = process.env.VITE_SUPABASE_ANON_KEY
      const sbRes  = await fetch(
        `${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=brain`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      )
      const sbData = await sbRes.json()
      brain = sbData?.[0]?.brain || ''
    } catch {}
  }

  const channelMap  = { email: 'Email Marketing', whatsapp: 'WhatsApp', vip: 'Grupo VIP' }
  const channelName = channelMap[channel] || channel

  const emailFields = channel === 'email'
    ? `  "assunto": "linha de assunto do email (máx 50 chars, use curiosidade ou urgência)",
  "preheader": "texto de preview do email (máx 90 chars)",`
    : ''

  const pilarContext = acao_comercial
    ? 'Este é um dia de AÇÃO COMERCIAL (pilar) — priorize oferta, urgência ou lançamento.'
    : ''

  const brainSection = brain
    ? `\n## Contexto da marca (use como base):\n${brain}\n`
    : ''

  const prompt = `Você é especialista em marketing de retenção para e-commerce.
Gere conteúdo para o calendário de ${channelName}.
${brainSection}
Data: ${date || 'a definir'}
Canal: ${channelName}
Tema: ${tema || 'livre — sugira um tema relevante'}
${pilarContext}

Responda APENAS com JSON válido (sem markdown, sem explicações), com exatamente estes campos:
{
  "tema": "tema conciso do disparo (máx 60 chars)",
  "segmentacao": "segmentação sugerida",
  "descricao": "descrição do conteúdo em 2-3 frases diretas",
${emailFields}
  "observacoes": "observação estratégica em 1 frase"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: 'Erro na API Anthropic', detail: err })
    }

    const data  = await response.json()
    const text  = data.content?.[0]?.text || '{}'
    const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(clean)
    res.status(200).json(parsed)
  } catch (e) {
    res.status(500).json({ error: 'Erro ao processar resposta da IA', detail: e.message })
  }
}
