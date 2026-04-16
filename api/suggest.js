/* ──────────────────────────────────────────────────────────────────────────
   /api/suggest
   Preenche automaticamente os campos de uma entrada do calendário.
   - Se só tem tema: gera segmentação, descrição, assunto, preheader, etc.
   - Se tem quase tudo: só completa o que está vazio.
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    tema, channel, date, acao_comercial, client_id,
    /* Campos atuais — usados para decidir o que preencher e manter contexto */
    segmentacao, descricao, assunto, preheader, link_copy, observacoes, horario, metodo_mensuracao,
    /* Modo: 'fill' (só preenche vazios) | 'regenerate' (re-gera tudo) */
    mode = 'fill',
  } = req.body || {}

  /* fetch client brain */
  let brain = ''
  if (client_id) {
    try {
      const sbUrl = process.env.VITE_SUPABASE_URL
      const sbKey = process.env.VITE_SUPABASE_ANON_KEY
      const sbRes = await fetch(
        `${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=brain`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      )
      const sbData = await sbRes.json()
      brain = sbData?.[0]?.brain || ''
    } catch {}
  }

  const channelMap  = { email: 'Email Marketing', whatsapp: 'WhatsApp', vip: 'Grupo VIP' }
  const channelName = channelMap[channel] || channel

  /* Identificar campos vazios */
  const current = { segmentacao, descricao, assunto, preheader, link_copy, observacoes, horario, metodo_mensuracao }
  const emptyFields = Object.entries(current).filter(([k, v]) => !v || String(v).trim() === '').map(([k]) => k)

  const relevantForChannel = channel === 'email'
    ? ['segmentacao', 'descricao', 'assunto', 'preheader', 'horario', 'metodo_mensuracao', 'observacoes']
    : ['segmentacao', 'descricao', 'observacoes', 'metodo_mensuracao']

  const fieldsToFill = mode === 'regenerate'
    ? relevantForChannel
    : emptyFields.filter(f => relevantForChannel.includes(f))

  const pilarContext = acao_comercial
    ? 'Este é um dia de AÇÃO COMERCIAL (pilar) — priorize oferta, urgência ou lançamento.'
    : ''

  const brainSection = brain ? `\n## Contexto da marca\n${brain}\n` : ''

  const currentSection = Object.entries(current)
    .filter(([_, v]) => v && String(v).trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n') || '(nenhum campo preenchido ainda)'

  const fieldSpecs = {
    segmentacao:       '"segmentacao": "segmentação alvo (ex: Ativos 90d, Reengajamento, VIPs, Toda base)"',
    descricao:         '"descricao": "2-3 frases claras sobre o conteúdo"',
    assunto:           '"assunto": "linha de assunto (máx 50 chars, curiosidade/benefício/urgência)"',
    preheader:         '"preheader": "preview do email (máx 90 chars, complementa o assunto)"',
    horario:           '"horario": "HH:MM (ex: 10:00, 14:30 — ideal para o segmento)"',
    metodo_mensuracao: '"metodo_mensuracao": "cupom_utm_tool | cupom | utm | utm_tool | cupom_tool | tool"',
    observacoes:       '"observacoes": "observação estratégica em 1 frase"',
  }

  const askFields = fieldsToFill.map(f => fieldSpecs[f]).filter(Boolean).join(',\n  ')

  if (!askFields) {
    return res.status(200).json({ note: 'Nada para preencher.' })
  }

  const prompt = `Você é especialista em marketing de retenção para e-commerce.
Complete os campos vazios de uma entrada do calendário de ${channelName}.${brainSection}
## Entrada
Data: ${date || 'a definir'}
Canal: ${channelName}
Tema: ${tema || '(sem tema — sugira algo coerente)'}
${pilarContext}

## Campos já preenchidos (MANTENHA coerência)
${currentSection}

## ${mode === 'regenerate' ? 'Regerar TODOS os campos abaixo' : 'Gerar APENAS os campos vazios abaixo'}
${fieldsToFill.join(', ')}

## Responda APENAS com JSON válido (sem markdown, sem texto extra):
{
  "tema": "${tema ? tema : 'tema conciso (máx 60 chars)'}${tema ? '" (mantenha igual)' : '"'},
  ${askFields}
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: 'Erro na API Anthropic', detail: err })
    }

    const data  = await response.json()
    const text  = data.content?.[0]?.text || '{}'
    const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(clean)
    res.status(200).json(parsed)
  } catch (e) {
    res.status(500).json({ error: 'Erro ao processar resposta da IA', detail: e.message })
  }
}
