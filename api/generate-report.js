/* ──────────────────────────────────────────────────────────────────────────
   /api/generate-report
   Gera um relatório mensal completo (título, notas e análise) a partir de:
   - bi_email_metrics do mês atual + mês anterior (para MoM)
   - calendar_entries com resultados do mês
   - Cérebro IA do cliente
   ────────────────────────────────────────────────────────────────────────── */

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmtBRL(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (!isFinite(n)) return '—'
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function pct(v) { return v == null ? '—' : `${Number(v).toFixed(1)}%` }
function int(v) { return v == null ? '—' : Number(v).toLocaleString('pt-BR') }

function delta(curr, prev) {
  if (curr == null || prev == null || !Number(prev)) return null
  return ((Number(curr) - Number(prev)) / Number(prev)) * 100
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, mes, ano, tipo = 'mensal' } = req.body || {}

  if (!client_id || !mes || !ano) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: client_id, mes, ano' })
  }

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  /* Mes anterior */
  const prevMes = mes === 1 ? 12 : mes - 1
  const prevAno = mes === 1 ? ano - 1 : ano

  /* Período do calendário */
  const startIso = `${ano}-${String(mes).padStart(2, '0')}-01`
  const endDate  = new Date(ano, mes, 0).getDate()
  const endIso   = `${ano}-${String(mes).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`

  try {
    const [cliRes, curBiRes, prevBiRes, calRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/bi_email_metrics?client_id=eq.${client_id}&mes=eq.${mes}&ano=eq.${ano}`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/bi_email_metrics?client_id=eq.${client_id}&mes=eq.${prevMes}&ano=eq.${prevAno}`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/calendar_entries?client_id=eq.${client_id}&date=gte.${startIso}&date=lte.${endIso}&order=date.asc`, { headers: h }),
    ])

    const cliArr  = await cliRes.json()
    const curArr  = await curBiRes.json()
    const prevArr = await prevBiRes.json()
    const calArr  = await calRes.json()

    const client     = cliArr?.[0] || {}
    const bi         = curArr?.[0] || null
    const biPrev     = prevArr?.[0] || null
    const entries    = Array.isArray(calArr) ? calArr : []

    if (!bi && entries.length === 0) {
      return res.status(400).json({ error: 'Sem dados do mês. Preencha o Diagnóstico ou registre resultados no Calendário antes.' })
    }

    /* Agregar resultados do calendário */
    const withResults = entries.filter(e => e.res_receita != null || e.res_pedidos != null)
    const calReceita  = withResults.reduce((s, e) => s + (parseFloat(e.res_receita) || 0), 0)
    const calPedidos  = withResults.reduce((s, e) => s + (parseFloat(e.res_pedidos) || 0), 0)
    const calEnvios   = withResults.reduce((s, e) => s + (parseFloat(e.res_qtd_envios) || 0), 0)
    const byChannel   = { email: 0, whatsapp: 0, vip: 0 }
    entries.forEach(e => { if (byChannel[e.channel] != null) byChannel[e.channel]++ })

    /* Top 3 por receita */
    const top3 = [...withResults]
      .sort((a, b) => (parseFloat(b.res_receita) || 0) - (parseFloat(a.res_receita) || 0))
      .slice(0, 3)
      .map(e => `- ${e.date} "${e.tema}" (${e.segmentacao || '—'}): ${fmtBRL(e.res_receita)} · ${int(e.res_pedidos)} pedidos · conv ${pct(e.res_taxa_conversao)}`)

    /* Métricas formatadas com MoM */
    const keys = [
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
    ]
    const fmt = (type, v) => type === 'brl' ? fmtBRL(v) : type === 'pct' ? pct(v) : int(v)
    const metricsLines = keys.map(([k, label, type]) => {
      if (bi?.[k] == null) return null
      const d = biPrev?.[k] != null ? delta(bi[k], biPrev[k]) : null
      const dStr = d != null ? ` (${d > 0 ? '+' : ''}${d.toFixed(1)}% MoM)` : ''
      return `- ${label}: ${fmt(type, bi[k])}${dStr}`
    }).filter(Boolean).join('\n')

    /* Meta atingida? */
    let metaHit = null
    if (bi?.meta_receita && bi?.receita) {
      metaHit = (bi.receita / bi.meta_receita) * 100
    }

    /* Prompt */
    const tipoLabel = {
      mensal:    'Acompanhamento Mensal (MoM)',
      segunda:   'Feedback de Segunda',
      semanal:   'Revisão Semanal',
      quinzenal: 'Otimização Quinzenal',
    }[tipo] || 'Relatório'

    const prompt = `Você é analista sênior de CRM. Gere um relatório profissional completo para a ${client.name || 'marca'} — ${tipoLabel} · ${MONTH_NAMES[mes - 1]}/${ano}.

${client.brain ? `## Contexto da marca\n${client.brain.slice(0, 1500)}\n` : ''}

## Métricas do mês (${MONTH_NAMES[mes - 1]}/${ano})
${metricsLines || '(sem métricas do Diagnóstico cadastradas)'}
${metaHit != null ? `\nMeta atingida: ${metaHit.toFixed(1)}% da meta` : ''}

## Calendário executado
- Total de disparos: ${entries.length}
- Por canal: ${byChannel.email} email · ${byChannel.whatsapp} whatsapp · ${byChannel.vip} VIP
- Com resultados registrados: ${withResults.length}
- Receita agregada (canal): ${fmtBRL(calReceita)}
- Pedidos agregados: ${int(calPedidos)}
- Envios totais: ${int(calEnvios)}

## Top 3 campanhas (por receita)
${top3.join('\n') || '—'}

## Sua tarefa
Responda APENAS com JSON válido (sem markdown, sem texto extra):
{
  "titulo": "título curto e profissional do relatório (máx 80 chars)",
  "notas": "2-3 parágrafos de contexto para consumo do cliente. Destaque o que aconteceu no mês, incluindo números importantes e decisões tomadas. Português fluente, tom executivo. Use quebras de linha.",
  "analise_ia": "análise técnica em markdown com 3 seções nomeadas exatamente assim:\\n\\n**📊 Performance Geral**\\n[2-3 frases sobre resultados gerais com números]\\n\\n**✅ Pontos Fortes**\\n- bullet 1\\n- bullet 2\\n- bullet 3\\n\\n**🎯 Próximos Passos**\\n- ação concreta 1\\n- ação concreta 2\\n- ação concreta 3"
}`

    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       process.env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anth.ok) {
      const err = await anth.text()
      return res.status(502).json({ error: 'Erro na API Anthropic', detail: err })
    }

    const data = await anth.json()
    let text   = data.content?.[0]?.text || '{}'
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const first = text.indexOf('{')
    const last  = text.lastIndexOf('}')
    if (first !== -1 && last !== -1) text = text.slice(first, last + 1)

    const report = JSON.parse(text)
    return res.status(200).json({
      report,
      stats: {
        bi_filled:     !!bi,
        entries:       entries.length,
        with_results:  withResults.length,
        receita_cal:   calReceita,
        meta_hit_pct:  metaHit,
      },
    })
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao processar relatório', detail: e.message })
  }
}
