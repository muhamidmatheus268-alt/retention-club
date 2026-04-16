/* ──────────────────────────────────────────────────────────────────────────
   /api/variations
   Gera variações A/B de assunto e preheader para um email existente.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tema, assunto, preheader, descricao, segmentacao, client_id, count = 3 } = req.body || {}

  if (!tema && !assunto) {
    return res.status(400).json({ error: 'Envie ao menos tema ou assunto atual' })
  }

  /* Buscar Cérebro */
  let brain = ''
  try {
    const sbUrl = process.env.VITE_SUPABASE_URL
    const sbKey = process.env.VITE_SUPABASE_ANON_KEY
    const sbRes = await fetch(
      `${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=brain`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    )
    const data = await sbRes.json()
    brain = data?.[0]?.brain || ''
  } catch { /* ignore */ }

  const prompt = `Você é copywriter sênior de email marketing. Gere ${count} variações A/B de ASSUNTO e PREHEADER para o email abaixo.

${brain ? `## Contexto da marca\n${brain}\n` : ''}
## Email atual
Tema: ${tema || '—'}
Segmentação: ${segmentacao || '—'}
${descricao ? `Descrição: ${descricao}` : ''}
${assunto ? `Assunto atual: ${assunto}` : ''}
${preheader ? `Preheader atual: ${preheader}` : ''}

## Regras
- Cada variação deve explorar um ângulo DIFERENTE (curiosidade, urgência, benefício direto, pergunta, social proof, medo de perder, etc.)
- Assunto: máx 50 caracteres
- Preheader: máx 90 caracteres, complementa o assunto (não repete)
- NÃO use CAPS LOCK
- NÃO use "Re:" ou "Fwd:"
- Evite clichês ("não perca!", "imperdível")

## Formato
Responda APENAS com JSON válido (sem markdown). Array de ${count} objetos:
[
  { "angulo": "curiosidade|urgencia|beneficio|pergunta|social_proof|escassez|outro", "assunto": "...", "preheader": "..." }
]`

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
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anth.ok) {
      const err = await anth.text()
      return res.status(502).json({ error: 'Erro na API Anthropic', detail: err })
    }

    const data = await anth.json()
    let text   = data.content?.[0]?.text || '[]'
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const first = text.indexOf('[')
    const last  = text.lastIndexOf(']')
    if (first !== -1 && last !== -1) text = text.slice(first, last + 1)

    const variations = JSON.parse(text)
    if (!Array.isArray(variations)) return res.status(500).json({ error: 'Resposta da IA não é array' })

    return res.status(200).json({ variations })
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao processar resposta', detail: e.message })
  }
}
