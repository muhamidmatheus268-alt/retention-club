/* ──────────────────────────────────────────────────────────────────────────
   /api/diagnose
   Análise automática do Diagnóstico: olha métricas mensais + comparativo MoM
   e gera insights acionáveis com IA.
   ────────────────────────────────────────────────────────────────────────── */

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function pct(v) { return v == null ? '—' : `${Number(v).toFixed(1)}%` }
function brl(v) { if (v == null) return '—'; return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function intFmt(v) { return v == null ? '—' : Number(v).toLocaleString('pt-BR') }
function delta(c, p) { if (c == null || p == null || !Number(p)) return null; return ((Number(c) - Number(p)) / Number(p)) * 100 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, mes, ano } = req.body || {}
  if (!client_id || !mes || !ano) return res.status(400).json({ error: 'client_id, mes, ano obrigatórios' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  const prevMes = mes === 1 ? 12 : mes - 1
  const prevAno = mes === 1 ? ano - 1 : ano

  try {
    const [cliRes, curRes, prevRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/bi_email_metrics?client_id=eq.${client_id}&mes=eq.${mes}&ano=eq.${ano}`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/bi_email_metrics?client_id=eq.${client_id}&mes=eq.${prevMes}&ano=eq.${prevAno}`, { headers: h }),
    ])
    const client = (await cliRes.json())?.[0] || {}
    const bi     = (await curRes.json())?.[0] || null
    const prev   = (await prevRes.json())?.[0] || null

    if (!bi) return res.status(400).json({ error: 'Sem dados para este mês. Preencha o Diagnóstico primeiro.' })

    const metrics = [
      ['base_total','Base Total','int'],
      ['base_ativa','Base Ativa','int'],
      ['emails_enviados','Emails Enviados','int'],
      ['taxa_entrega','Entrega','pct'],
      ['taxa_abertura','Abertura','pct'],
      ['taxa_cliques','Cliques','pct'],
      ['taxa_conversao','Conversão','pct'],
      ['receita','Receita','brl'],
      ['meta_receita','Meta','brl'],
      ['ticket_medio','Ticket Médio','brl'],
      ['rpa','RPA','brl'],
      ['rpe','RPE','brl'],
      ['taxa_recompra','Recompra','pct'],
      ['cac','CAC','brl'],
      ['ltv_projetado','LTV','brl'],
      ['novos_clientes','Novos clientes','int'],
      ['clientes_recorrentes','Recorrentes','int'],
    ]
    const fmt = (t, v) => t === 'brl' ? brl(v) : t === 'pct' ? pct(v) : intFmt(v)
    const lines = metrics.map(([k, lbl, t]) => {
      if (bi?.[k] == null) return null
      const d = prev?.[k] != null ? delta(bi[k], prev[k]) : null
      const ds = d != null ? ` [${d > 0 ? '+' : ''}${d.toFixed(1)}% vs mês anterior]` : ''
      return `- ${lbl}: ${fmt(t, bi[k])}${ds}`
    }).filter(Boolean).join('\n')

    const metaPct = (bi.meta_receita && bi.receita) ? (bi.receita / bi.meta_receita * 100) : null
    const ltvCac  = (bi.ltv_projetado && bi.cac && Number(bi.cac) > 0) ? (bi.ltv_projetado / bi.cac) : null

    const prompt = `Você é analista sênior de CRM e retenção. Faça o diagnóstico técnico de ${client.name || 'uma marca'} para ${MONTH_NAMES[mes - 1]}/${ano}.

${client.brain ? `## Marca\n${client.brain.slice(0, 1200)}\n` : ''}

## Métricas (com variação MoM quando disponível)
${lines || '(mínimas)'}

${metaPct != null ? `Atingimento da meta: ${metaPct.toFixed(1)}%` : ''}
${ltvCac != null ? `LTV/CAC: ${ltvCac.toFixed(2)}x` : ''}

## Sua tarefa
Responda APENAS com JSON válido (sem markdown). Formato:
{
  "saude_geral": "saudavel | atencao | critico",
  "headline": "frase executiva de 1 linha resumindo o mês",
  "pontos_fortes": ["3 bullets", "…", "…"],
  "alertas": ["até 4 alertas críticos/atenção", "…"],
  "recomendacoes": ["5 ações concretas priorizadas para o próximo mês", "…"],
  "metricas_criticas": [
    { "metrica": "nome", "valor": "valor atual", "status": "ok|baixo|alto|critico", "comentario": "curto" }
  ]
}

Seja direto e técnico. Use números reais nos comentários. Se LTV/CAC < 3 sinalize como crítico. Se abertura < 15% ou conversão < 1% sinalize. Considere benchmark: abertura 20-30%, cliques 2-4%, conversão 1-3%.`

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

    return res.status(200).json({ diagnosis: JSON.parse(text), stats: { metaPct, ltvCac } })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
