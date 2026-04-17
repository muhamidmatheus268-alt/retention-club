/* ──────────────────────────────────────────────────────────────────────────
   /api/analyze-quiz
   Analisa as respostas do quiz/funil CRM e gera insights.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY

  try {
    const r = await fetch(`${sbUrl}/rest/v1/quiz_respostas?order=created_at.desc&limit=500`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } })
    const all = await r.json()
    if (!Array.isArray(all) || all.length === 0) {
      return res.status(400).json({ error: 'Sem respostas para analisar' })
    }

    /* Estatísticas rápidas */
    const total = all.length
    const last30 = all.filter(r => new Date(r.created_at) >= new Date(Date.now() - 30 * 86400000)).length
    const last7  = all.filter(r => new Date(r.created_at) >= new Date(Date.now() - 7  * 86400000)).length

    /* Agregar campos comuns (os que aparecem) */
    const fieldCounts = {}
    for (const row of all) {
      for (const [k, v] of Object.entries(row)) {
        if (['id','created_at','updated_at'].includes(k)) continue
        if (v == null || v === '') continue
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
        fieldCounts[k] ??= {}
        fieldCounts[k][val] = (fieldCounts[k][val] || 0) + 1
      }
    }

    /* Top valores por campo */
    const fieldSummary = {}
    for (const [k, counts] of Object.entries(fieldCounts)) {
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
      fieldSummary[k] = entries.map(([v, c]) => `${v} (${c})`)
    }

    const prompt = `Você é analista sênior de CRM. Analise ${total} respostas do quiz de captura e gere insights acionáveis.

## Volume
- Total: ${total}
- Últimos 30 dias: ${last30}
- Últimos 7 dias: ${last7}

## Top 5 valores por campo (contagem)
${Object.entries(fieldSummary).map(([k, arr]) => `- ${k}:\n  ${arr.join('\n  ')}`).join('\n')}

## Sua tarefa
Responda em JSON (sem markdown):
{
  "headline": "1 frase resumindo o que os dados revelam",
  "insights": [
    { "titulo": "insight curto", "descricao": "1-2 frases com número real" }
  ],
  "perfis_dominantes": [
    { "nome": "nome curto do perfil", "traits": "características-chave", "pct_aproximado": número }
  ],
  "oportunidades": [
    "ação de marketing/CRM concreta 1",
    "ação 2",
    "ação 3"
  ],
  "alertas": ["se houver algo estranho (baixo volume, dados inconsistentes, etc.)"]
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
    return res.status(200).json({ analysis: JSON.parse(text), stats: { total, last30, last7 } })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
