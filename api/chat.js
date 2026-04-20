/* ──────────────────────────────────────────────────────────────────────────
   /api/chat
   Chat contextual por cliente. Busca dados relevantes baseado na pergunta
   e passa para Claude com contexto.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, messages = [] } = req.body || {}
  if (!client_id || !messages.length) {
    return res.status(400).json({ error: 'client_id e messages obrigatórios' })
  }

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  try {
    /* Detectar quais dados buscar baseado na última pergunta */
    const lastQ = (messages[messages.length - 1]?.content || '').toLowerCase()
    const wantCal   = /calend|post|disparo|agendad|envio|receita|campanha/.test(lastQ)
    const wantBi    = /abertura|cliques|conversão|conversao|receita|meta|ticket|cac|ltv|métrica|metrica|diagn/.test(lastQ)
    const wantAtas  = /ata|reunião|reuniao|ação|acao|decisão|decisao/.test(lastQ)
    const wantAutom = /automação|automacao|fluxo|welcome|abandono|recompra|boas/.test(lastQ)
    const wantTasks = /tarefa|pendência|pendencia|acompanhamento|pendent/.test(lastQ)
    const wantContas= /conta|login|senha|plataforma|klaviyo|shopify|stack/.test(lastQ)

    const promises = [
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain,website,nicho,brand_color`, { headers: h }),
    ]
    if (wantCal || lastQ.length < 50) promises.push(fetch(`${sbUrl}/rest/v1/calendar_entries?client_id=eq.${client_id}&order=date.desc&limit=80`, { headers: h }))
    if (wantBi)    promises.push(fetch(`${sbUrl}/rest/v1/bi_email_metrics?client_id=eq.${client_id}&order=ano.desc,mes.desc&limit=6`, { headers: h }))
    if (wantAtas)  promises.push(fetch(`${sbUrl}/rest/v1/atas?client_id=eq.${client_id}&order=data.desc&limit=5`, { headers: h }))
    if (wantAutom) promises.push(fetch(`${sbUrl}/rest/v1/automacoes?client_id=eq.${client_id}&limit=50`, { headers: h }))
    if (wantTasks) promises.push(fetch(`${sbUrl}/rest/v1/acompanhamento?client_id=eq.${client_id}&order=created_at.desc&limit=30`, { headers: h }))
    if (wantContas)promises.push(fetch(`${sbUrl}/rest/v1/central_contas?client_id=eq.${client_id}&limit=40`, { headers: h }))

    const results = await Promise.all(promises)
    const client = (await results[0].json())?.[0] || {}

    const ctx = { client }
    let idx = 1
    if (wantCal || lastQ.length < 50) ctx.calendar    = await results[idx++].json()
    if (wantBi)                       ctx.bi          = await results[idx++].json()
    if (wantAtas)                     ctx.atas        = await results[idx++].json()
    if (wantAutom)                    ctx.automacoes  = await results[idx++].json()
    if (wantTasks)                    ctx.tarefas     = await results[idx++].json()
    if (wantContas)                   ctx.contas      = await results[idx++].json()

    /* Compactar contexto (não jogar tudo crú) */
    const compact = {
      cliente: {
        nome:   client.name,
        nicho:  client.nicho,
        website:client.website,
        brain:  client.brain ? client.brain.slice(0, 2000) : null,
      },
    }
    if (ctx.calendar) compact.calendar = ctx.calendar.map(e => ({
      date: e.date, channel: e.channel, tema: e.tema, segmentacao: e.segmentacao,
      status: e.status, pilar: e.acao_comercial,
      assunto: e.assunto, horario: e.horario,
      receita: e.res_receita, pedidos: e.res_pedidos, conv: e.res_taxa_conversao,
    }))
    if (ctx.bi) compact.bi = ctx.bi.map(r => {
      const keep = { mes: r.mes, ano: r.ano }
      for (const k of ['base_total','base_ativa','taxa_abertura','taxa_cliques','taxa_conversao','taxa_entrega','receita','meta_receita','ticket_medio','rpa','rpe','cac','ltv_projetado','taxa_recompra','novos_clientes','clientes_recorrentes']) {
        if (r[k] != null) keep[k] = r[k]
      }
      return keep
    })
    if (ctx.atas) compact.atas = ctx.atas.map(a => ({
      data: a.data, titulo: a.titulo, pauta: a.pauta?.slice(0, 400),
      resumo: a.resumo?.slice(0, 400),
      action_items: a.action_items,
    }))
    if (ctx.automacoes) compact.automacoes = ctx.automacoes.map(a => ({
      fluxo: a.fluxo, nome: a.nome, canal: a.canal, momento: a.momento,
      status: a.status_automacao, tem_script: !!(a.texto_corpo || a.assunto),
    }))
    if (ctx.tarefas) compact.tarefas = ctx.tarefas.map(t => ({
      titulo: t.titulo, status: t.status, prioridade: t.prioridade, prazo: t.prazo, categoria: t.categoria,
    }))
    if (ctx.contas) compact.contas = ctx.contas.map(c => ({
      plataforma: c.plataforma, tipo: c.tipo, status: c.status, plano: c.plano,
    }))

    const today = new Date().toISOString().slice(0, 10)

    const systemPrompt = `Você é a IA do Retention Club, especialista em CRM/retenção. Responde perguntas sobre o cliente ${client.name || ''} com base nos dados reais abaixo.

HOJE: ${today}

## DADOS DISPONÍVEIS
${JSON.stringify(compact, null, 2)}

## REGRAS
- Responda em português, tom profissional-direto
- Use NÚMEROS REAIS dos dados; nunca invente
- Se faltar dado, diga "não tenho esse dado" e explique o que seria necessário
- Formate com markdown (listas, negrito) quando ajudar
- Seja CONCISO — máximo 6 parágrafos curtos
- Se a pergunta for ambígua, peça a clarificação antes de responder
- Ao citar métricas, SEMPRE indique o período (ex: "em março/2026")
- Para cálculos, mostre rapidamente a conta`

    const anthMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 2000,
        system: systemPrompt,
        messages: anthMessages,
      }),
    })
    if (!anth.ok) {
      const err = await anth.text()
      return res.status(502).json({ error: 'Anthropic error', detail: err.slice(0, 300) })
    }
    const data = await anth.json()
    const text = data.content?.[0]?.text || ''
    return res.status(200).json({
      reply: text,
      usage: data.usage,
      sources_used: Object.keys(ctx).filter(k => k !== 'client'),
    })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
