/* ──────────────────────────────────────────────────────────────────────────
   /api/suggest-tasks
   Sugere próximas tarefas para o acompanhamento, baseado em:
   - ATAs recentes (action items)
   - Calendário (status de campanhas)
   - Métricas do Diagnóstico
   - Cérebro da marca
   - Tarefas já existentes (para não duplicar)
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, count = 5 } = req.body || {}
  if (!client_id) return res.status(400).json({ error: 'client_id obrigatório' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}` }

  const now = new Date()
  const ago30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)

  try {
    const [cliRes, atasRes, tasksRes, entRes, biRes] = await Promise.all([
      fetch(`${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=name,brain`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/atas?client_id=eq.${client_id}&order=data.desc&limit=3`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/acompanhamento?client_id=eq.${client_id}&status=neq.concluido&limit=20`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/calendar_entries?client_id=eq.${client_id}&date=gte.${ago30}&limit=50`, { headers: h }),
      fetch(`${sbUrl}/rest/v1/bi_email_metrics?client_id=eq.${client_id}&order=ano.desc,mes.desc&limit=1`, { headers: h }),
    ])

    const client  = (await cliRes.json())?.[0] || {}
    const atas    = await atasRes.json()
    const tasks   = await tasksRes.json()
    const entries = await entRes.json()
    const bi      = (await biRes.json())?.[0] || null

    /* Extract action items from ATAs */
    const allActionItems = []
    for (const ata of Array.isArray(atas) ? atas : []) {
      const items = ata.action_items || ata.acoes || []
      if (Array.isArray(items)) {
        items.forEach(it => allActionItems.push(`- [${ata.data || 'recente'}] ${it.descricao || it.acao || it.item || JSON.stringify(it)}`))
      }
    }

    const pendingCount  = tasks.filter(t => t.status === 'pendente').length
    const blockedCount  = tasks.filter(t => t.status === 'bloqueado').length
    const overdue = tasks.filter(t => t.prazo && t.prazo < now.toISOString().slice(0, 10) && t.status !== 'concluido')

    /* Calendar summary */
    const calSent = entries.filter(e => e.status === 'enviado').length
    const calPend = entries.filter(e => e.status === 'pendente').length

    const prompt = `Você é gestor sênior de projetos CRM. Sugira ${count} próximas tarefas concretas para a marca "${client.name || ''}".

${client.brain ? `## Contexto da marca\n${client.brain.slice(0, 1200)}\n` : ''}

## Tarefas já existentes (NÃO duplique)
${tasks.map(t => `- [${t.status}] ${t.titulo}${t.prazo ? ` (até ${t.prazo})` : ''}`).join('\n') || '(nenhuma)'}

## Action items das ATAs recentes
${allActionItems.slice(0, 10).join('\n') || '(sem ATAs recentes)'}

## Estado do CRM
- Tarefas pendentes: ${pendingCount} · Bloqueadas: ${blockedCount} · Atrasadas: ${overdue.length}
- Calendário últimos 30d: ${calSent} enviadas, ${calPend} pendentes (${entries.length} total)
${bi ? `- Última métrica — Abertura: ${bi.taxa_abertura}%, Conversão: ${bi.taxa_conversao}%, Receita: ${bi.receita}` : ''}

## Regras
- Tarefas devem ser CONCRETAS (ação clara, não genérica)
- Ordene por prioridade (alta primeiro)
- Use as ATAs e métricas como base quando possível
- Variar categorias: otimização, criação, análise, reunião, integração

## Formato — JSON apenas, sem markdown
[
  {
    "titulo": "máx 70 chars, começa com verbo no infinitivo",
    "descricao": "1-2 frases explicando o que e porquê",
    "prioridade": "alta|media|baixa",
    "categoria": "otimização|criação|análise|reunião|integração|outros",
    "prazo_dias": número — quantos dias a partir de hoje
  }
]`

    const anth = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-7', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!anth.ok) {
      const err = await anth.text()
      return res.status(502).json({ error: 'Erro Anthropic', detail: err })
    }

    const data = await anth.json()
    let text = data.content?.[0]?.text || '[]'
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const first = text.indexOf('['); const last = text.lastIndexOf(']')
    if (first !== -1 && last !== -1) text = text.slice(first, last + 1)
    const suggestions = JSON.parse(text)
    if (!Array.isArray(suggestions)) return res.status(500).json({ error: 'Resposta da IA não é array' })

    /* Converter prazo_dias em data ISO */
    const processed = suggestions.map(s => {
      const prazo = s.prazo_dias != null ? new Date(now.getTime() + Number(s.prazo_dias) * 86400000).toISOString().slice(0, 10) : null
      return {
        titulo:      s.titulo || '',
        descricao:   s.descricao || '',
        prioridade:  s.prioridade || 'media',
        categoria:   s.categoria || '',
        prazo,
        status:      'pendente',
      }
    })

    return res.status(200).json({ suggestions: processed })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
