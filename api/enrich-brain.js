/* ──────────────────────────────────────────────────────────────────────────
   /api/enrich-brain
   Enriquece o Cérebro IA do cliente.
   Modos:
   - 'review'   → devolve sugestões do que melhorar/adicionar (sem alterar)
   - 'rewrite'  → reescreve o brain com estrutura padrão aprimorada
   - 'from_url' → tenta gerar um brain inicial a partir de uma URL/descrição
   ────────────────────────────────────────────────────────────────────────── */

const BRAIN_TEMPLATE = `## Marca
Nome:
Tom de voz:
Público-alvo:
Posicionamento (1 frase):

## Produtos
(liste 5-10 produtos: nome, preço, benefício principal)

## Segmentações CRM usadas
(liste 4-8 segmentos + critério)

## Dores/objeções do público
(3-5 bullets)

## Histórias de sucesso / social proof
(2-3 exemplos)

## Regras de comunicação
- Tom sempre...
- Nunca usar...
- Palavras proibidas:
- Palavras-chave da marca:

## Temas que performaram bem
(exemplos de assuntos vencedores)

## Observações estratégicas
`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, mode = 'review', current_brain = '', hint = '' } = req.body || {}
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY

  let clientName = ''
  try {
    const r = await fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name`, { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } })
    const d = await r.json()
    clientName = d?.[0]?.name || ''
  } catch {}

  let prompt = ''
  if (mode === 'review') {
    prompt = `Você é estrategista de marca. Revise o Cérebro IA de ${clientName || 'uma marca'} e sugira melhorias.

## Cérebro atual
${current_brain || '(vazio)'}

## Template ideal para referência
${BRAIN_TEMPLATE}

## Responda JSON (sem markdown):
{
  "completude_pct": número 0-100 indicando quão completo está,
  "pontos_faltando": ["o que está faltando (bullet)", "..."],
  "sugestoes_concretas": [
    { "secao": "nome da seção", "sugestao": "o que adicionar/mudar (concreto, com exemplo)" }
  ],
  "frase_resumo": "1 frase sobre o estado atual"
}`
  } else if (mode === 'rewrite') {
    prompt = `Você é estrategista de marca. Reestruture e enriqueça o Cérebro IA de ${clientName || 'uma marca'} seguindo o template padrão. Mantenha toda informação que já existe e adicione estrutura + placeholders onde falta.

## Cérebro atual
${current_brain || '(vazio)'}

${hint ? `## Instruções adicionais\n${hint}\n` : ''}

## Template padrão
${BRAIN_TEMPLATE}

## Sua tarefa
Reescreva o Cérebro em formato markdown seguindo o template. Use dados existentes, preencha lacunas quando houver contexto, e deixe [preencher] nos campos que precisam de input humano.

Responda APENAS com o markdown do novo Cérebro. Sem explicações, sem cercas de código.`
  } else if (mode === 'from_url') {
    prompt = `Você é estrategista de marca. Crie um Cérebro IA inicial para ${clientName || 'uma marca'} com base em:
${hint}

Use o template abaixo e preencha tudo que conseguir inferir. Para dados que não tiver, coloque [preencher].

## Template
${BRAIN_TEMPLATE}

Responda APENAS com o markdown. Sem explicações.`
  } else {
    return res.status(400).json({ error: 'mode inválido (use review, rewrite ou from_url)' })
  }

  try {
    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: mode === 'review' ? 1500 : 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!anth.ok) { const e = await anth.text(); return res.status(502).json({ error: 'Anthropic error', detail: e }) }
    const data = await anth.json()
    let text = data.content?.[0]?.text || ''

    if (mode === 'review') {
      text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
      const first = text.indexOf('{'), last = text.lastIndexOf('}')
      if (first !== -1 && last !== -1) text = text.slice(first, last + 1)
      return res.status(200).json({ review: JSON.parse(text) })
    } else {
      /* Rewrite/from_url → devolve markdown cru */
      text = text.trim().replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '')
      return res.status(200).json({ brain: text })
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
