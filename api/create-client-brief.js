/* ──────────────────────────────────────────────────────────────────────────
   /api/create-client-brief
   Gera um Cérebro inicial para um novo cliente a partir de nome + nicho + site
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, nicho = '', website = '', notes = '' } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name obrigatório' })

  const prompt = `Você é estrategista de marca. Crie um Cérebro IA inicial para um novo cliente de agência CRM.

## Cliente
- Nome: ${name}
- Nicho: ${nicho || '(não informado)'}
- Site: ${website || '(não informado)'}
- Observações: ${notes || '—'}

## Template a seguir
## Marca
Nome: ${name}
Tom de voz: [preencher com base no nicho]
Público-alvo: [inferir pelo nicho]
Posicionamento (1 frase):

## Produtos
(liste 5-8 produtos típicos do nicho como placeholders)

## Segmentações CRM usadas
- Novos clientes (0-30d)
- Ativos (30-90d)
- Em risco (90-180d)
- Reativação (180d+)
- VIPs (top 10%)
(adapte ao nicho)

## Dores/objeções do público
(3-5 bullets baseados no nicho)

## Regras de comunicação
- Tom sempre...
- Nunca usar...
- Palavras-chave da marca:

## Temas sazonais relevantes
(Liste feriados/datas-chave para o nicho)

## Observações estratégicas
[preencher conforme o cliente se desenvolve]

## Sua tarefa
Preencha o template acima com conteúdo inferido do nicho. Seja específico. Use [preencher] SÓ onde não houver informação inferível. Responda APENAS com o markdown do Cérebro — sem explicações, sem cercas de código, sem títulos extras.`

  try {
    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!anth.ok) {
      const err = await anth.text()
      return res.status(502).json({ error: 'Anthropic error', detail: err })
    }
    const data = await anth.json()
    let text = data.content?.[0]?.text || ''
    text = text.trim().replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '')

    /* Suggest a brand color based on nicho (optional) */
    const colorMap = {
      moda:         '#E8642A',
      fashion:      '#E8642A',
      beauty:       '#ec4899',
      beleza:       '#ec4899',
      suplemento:   '#10b981',
      saude:        '#10b981',
      tech:         '#6366f1',
      tecnologia:   '#6366f1',
      pet:          '#f59e0b',
      casa:         '#8b5cf6',
      decor:        '#8b5cf6',
      financeiro:   '#06b6d4',
    }
    const nichoLower = nicho.toLowerCase()
    const suggested  = Object.entries(colorMap).find(([k]) => nichoLower.includes(k))?.[1] || null

    return res.status(200).json({ brain: text, suggested_color: suggested })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
