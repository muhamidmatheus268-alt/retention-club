/* ──────────────────────────────────────────────────────────────────────────
   /api/compare-campaigns
   Compara 2-5 entradas do calendário com resultados e explica porque umas
   performaram melhor que outras.
   ────────────────────────────────────────────────────────────────────────── */

function brl(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }
function pct(v) { return v == null ? '—' : `${Number(v).toFixed(1)}%` }
function intF(v) { return v == null ? '—' : Number(v).toLocaleString('pt-BR') }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, entry_ids } = req.body || {}
  if (!client_id || !Array.isArray(entry_ids) || entry_ids.length < 2) {
    return res.status(400).json({ error: 'client_id e pelo menos 2 entry_ids obrigatórios' })
  }

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  try {
    const [cliRes, entRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/calendar_entries?id=in.(${entry_ids.join(',')})&order=date.asc`, { headers: h }),
    ])
    const client  = (await cliRes.json())?.[0] || {}
    const entries = await entRes.json()

    if (!Array.isArray(entries) || entries.length < 2) {
      return res.status(400).json({ error: 'Entradas não encontradas' })
    }

    /* Ranking por receita */
    const ranked = [...entries].sort((a, b) =>
      (parseFloat(b.res_receita) || 0) - (parseFloat(a.res_receita) || 0)
    )

    const summary = ranked.map((e, idx) => ({
      rank: idx + 1,
      id: e.id,
      data: e.date,
      tema: e.tema,
      canal: e.channel,
      segmentacao: e.segmentacao,
      assunto: e.assunto,
      preheader: e.preheader,
      horario: e.horario,
      pilar: e.acao_comercial,
      receita: parseFloat(e.res_receita) || 0,
      pedidos: parseFloat(e.res_pedidos) || 0,
      entregas: parseFloat(e.res_qtd_envios) || 0,
      taxa_conversao: parseFloat(e.res_taxa_conversao) || null,
      entregabilidade: parseFloat(e.res_entregabilidade) || null,
    }))

    const prompt = `Você é analista de CRM. Compare as ${entries.length} campanhas abaixo de "${client.name || 'cliente'}" e explique o que fez as melhores performarem melhor que as piores.

${client.brain ? `## Contexto da marca\n${client.brain.slice(0, 800)}\n` : ''}

## Campanhas (ranked por receita)
${summary.map(s => `
${s.rank}. "${s.tema}" · ${s.data} · ${s.canal} · seg: ${s.segmentacao || '—'}
   assunto: ${s.assunto || '—'}
   preheader: ${s.preheader || '—'}
   horário: ${s.horario || '—'}
   pilar: ${s.pilar ? 'sim' : 'não'}
   → Receita: ${brl(s.receita)} · Pedidos: ${intF(s.pedidos)} · Conv: ${pct(s.taxa_conversao)}`).join('\n')}

## Sua tarefa
Responda JSON sem markdown:
{
  "vencedora": { "id": id_da_melhor, "por_que": "1-2 frases explicando o que ela fez certo" },
  "perdedora": { "id": id_da_pior, "por_que": "1-2 frases do que falhou" },
  "insights": [
    { "padrao": "padrão identificado", "evidencia": "dado que confirma" }
  ],
  "recomendacoes": [
    "ação concreta 1 para replicar o que funcionou",
    "ação 2",
    "ação 3"
  ]
}`

    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!anth.ok) { const e = await anth.text(); return res.status(502).json({ error: 'Anthropic error', detail: e.slice(0, 200) }) }

    const data = await anth.json()
    let text = data.content?.[0]?.text || '{}'
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const first = text.indexOf('{'), last = text.lastIndexOf('}')
    if (first !== -1 && last !== -1) text = text.slice(first, last + 1)

    return res.status(200).json({ analysis: JSON.parse(text), campaigns: summary })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
