/* ──────────────────────────────────────────────────────────────────────────
   /api/generate-automation
   Preenche TODOS os campos de uma automação com base no nome do fluxo, canal,
   momento e Cérebro da marca.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, nome, fluxo, canal, momento, gatilho } = req.body || {}
  if (!client_id || !nome) return res.status(400).json({ error: 'client_id e nome obrigatórios' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY

  let brain = '', clientName = ''
  try {
    const r = await fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } })
    const d = await r.json()
    brain = d?.[0]?.brain || ''; clientName = d?.[0]?.name || ''
  } catch {}

  const channelName = { Email: 'Email Marketing', WhatsApp: 'WhatsApp', SMS: 'SMS' }[canal] || canal || 'Email'

  const isEmail = canal === 'Email'
  const isWpp   = canal === 'WhatsApp'

  const fieldsSpec = isEmail
    ? `"assunto":    "linha de assunto (máx 50c, curiosidade/benefício/urgência)",
  "preheader":  "preview (máx 90c, complementa)",
  "texto_hero": "frase de impacto do hero (máx 60c)",
  "texto_corpo":"corpo do email, em markdown simples, 4-8 linhas, direto ao ponto",
  "cta":        "texto do CTA (máx 25c, verbo de ação)"`
    : isWpp
    ? `"assunto":    "",
  "preheader":  "",
  "texto_hero": "",
  "texto_corpo":"mensagem completa do WhatsApp com emojis moderados, máx 600 chars, call-to-action no final",
  "cta":        "link ou próxima ação (máx 60c)"`
    : `"assunto": "", "preheader": "", "texto_hero": "", "texto_corpo": "texto do SMS, máx 140 chars", "cta": ""`

  const prompt = `Você é copywriter sênior de CRM. Preencha os campos de uma automação para a marca ${clientName || ''}.

${brain ? `## Contexto da marca\n${brain.slice(0, 1200)}\n` : ''}

## Automação
- Fluxo: ${fluxo || '(não informado)'}
- Régua/nome: ${nome}
- Canal: ${channelName}
- Momento: ${momento || '(não informado)'}
- Gatilho: ${gatilho || '(não informado)'}

## Sua tarefa
Responda APENAS com JSON válido (sem markdown):
{
  ${fieldsSpec},
  "notas_cliente": "1 frase explicando para o cliente o que essa régua faz e por quê"
}`

  try {
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
