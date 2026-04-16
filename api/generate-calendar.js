/* ──────────────────────────────────────────────────────────────────────────
   /api/generate-calendar
   Gera um calendário completo para um mês inteiro com IA.
   ────────────────────────────────────────────────────────────────────────── */

const FIXED_HOLIDAYS = [
  { month: 1,  day: 1,  name: 'Confraternização Universal', commerce: false },
  { month: 3,  day: 8,  name: 'Dia da Mulher',              commerce: true  },
  { month: 4,  day: 21, name: 'Tiradentes',                 commerce: false },
  { month: 5,  day: 1,  name: 'Dia do Trabalho',            commerce: false },
  { month: 5,  day: 11, name: 'Dia das Mães',               commerce: true  },
  { month: 6,  day: 12, name: 'Dia dos Namorados',          commerce: true  },
  { month: 8,  day: 10, name: 'Dia dos Pais',               commerce: true  },
  { month: 9,  day: 7,  name: 'Independência do Brasil',    commerce: false },
  { month: 10, day: 12, name: 'N. Sra. Aparecida',          commerce: false },
  { month: 10, day: 31, name: 'Halloween',                  commerce: true  },
  { month: 11, day: 2,  name: 'Finados',                    commerce: false },
  { month: 11, day: 15, name: 'Proclamação da República',   commerce: false },
  { month: 11, day: 20, name: 'Consciência Negra',          commerce: false },
  { month: 11, day: 25, name: 'Black Friday',               commerce: true  },
  { month: 12, day: 20, name: 'Semana do Natal',            commerce: true  },
  { month: 12, day: 25, name: 'Natal',                      commerce: false },
]

function calcEaster(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }

function getHolidaysForMonth(year, month) {
  /* month: 0-indexed */
  const out = []
  for (const h of FIXED_HOLIDAYS) {
    if (h.month - 1 === month) {
      const date = new Date(year, month, h.day)
      out.push({
        day: h.day,
        iso: isoDate(date),
        name: h.name,
        commerce: h.commerce,
      })
    }
  }
  /* Easter-based */
  const easter = calcEaster(year)
  const easterEvents = [
    { date: addDays(easter, -48), name: 'Carnaval (2ª)', commerce: true  },
    { date: addDays(easter, -47), name: 'Carnaval (3ª)', commerce: true  },
    { date: addDays(easter, -2),  name: 'Sexta-feira Santa', commerce: false },
    { date: easter,               name: 'Páscoa', commerce: true  },
    { date: addDays(easter, 60),  name: 'Corpus Christi', commerce: false },
  ]
  for (const ev of easterEvents) {
    if (ev.date.getFullYear() === year && ev.date.getMonth() === month) {
      out.push({
        day: ev.date.getDate(),
        iso: isoDate(ev.date),
        name: ev.name,
        commerce: ev.commerce,
      })
    }
  }
  return out.sort((a, b) => a.day - b.day)
}

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    client_id,
    year,
    month,                      // 0-indexed
    channel,                    // email | whatsapp | vip
    cadence = 3,                // posts por semana
    segmentations = [],         // strings
    tom = '',
    focus = '',
    includePilares = true,
    startFromToday = false,
    scope = 'month',            // month | week
    weekStartIso = null,        // se scope=week, data inicial (segunda)
    playbook = null,            // opcional: 'black_friday' | 'maes' | 'aniversario' | ...
  } = req.body || {}

  if (!client_id || year == null || month == null || !channel) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: client_id, year, month, channel' })
  }

  /* ── Buscar Cérebro IA do cliente ────────────────────────────────────── */
  let brain = ''
  let clientName = ''
  try {
    const sbUrl = process.env.VITE_SUPABASE_URL
    const sbKey = process.env.VITE_SUPABASE_ANON_KEY
    const sbRes = await fetch(
      `${sbUrl}/rest/v1/clients?id=eq.${client_id}&select=brain,name`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    )
    const sbData = await sbRes.json()
    brain      = sbData?.[0]?.brain || ''
    clientName = sbData?.[0]?.name  || ''
  } catch { /* ignore */ }

  /* ── Montar contexto do período ──────────────────────────────────────── */
  const daysInMonth = getDaysInMonth(year, month)
  const holidays    = getHolidaysForMonth(year, month)
  const todayIso    = isoDate(new Date())

  const monthDays = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date    = new Date(year, month, d)
    const iso     = isoDate(date)
    const weekday = WEEKDAYS[date.getDay()]
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const holiday = holidays.find(h => h.day === d)
    if (startFromToday && iso < todayIso) continue
    if (scope === 'week' && weekStartIso) {
      const start = weekStartIso
      const endDate = new Date(weekStartIso); endDate.setDate(endDate.getDate() + 6)
      const endIso = isoDate(endDate)
      if (iso < start || iso > endIso) continue
    }
    monthDays.push({ day: d, iso, weekday, isWeekend, holiday })
  }

  const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const monthLabel = `${monthNames[month]}/${year}`

  const channelName = { email: 'Email Marketing', whatsapp: 'WhatsApp', vip: 'Grupo VIP' }[channel] || channel

  /* ── Campos por canal ────────────────────────────────────────────────── */
  const commonFields = `
    "date":        "YYYY-MM-DD (obrigatório, dentro do mês informado)",
    "tema":        "tema conciso da campanha (máx 60 chars)",
    "descricao":   "descrição do conteúdo em 2-3 frases",
    "segmentacao": "segmentação alvo (use uma das listadas ou similar)",
    "link_copy":   "breve referência ou URL (opcional)",
    "observacoes": "observação estratégica em 1 frase (opcional)",
    "acao_comercial": true | false,
    "metodo_mensuracao": "cupom_utm_tool | cupom | utm | utm_tool | cupom_tool | tool"`

  const channelSpecific = channel === 'email'
    ? `,
    "horario":   "HH:MM (ex: 10:00, 14:30 — horário ideal para o segmento)",
    "assunto":   "linha de assunto (máx 50 chars, use curiosidade/benefício/urgência)",
    "preheader": "preview do email (máx 90 chars, complementa o assunto)"`
    : channel === 'whatsapp'
    ? `,
    "tipo_template": "marketing | utility | authentication",
    "tamanho_base":  null | número (base estimada)`
    : ''

  /* ── Prompt ──────────────────────────────────────────────────────────── */
  const segLine = segmentations.length
    ? segmentations.map(s => `- ${s}`).join('\n')
    : '- Toda a base\n- Ativos 90d\n- Reengajamento (sem compra 90-180d)\n- VIPs'

  const holidayLine = holidays.length
    ? holidays.map(h => `- ${h.day}/${String(month + 1).padStart(2, '0')} (${h.iso}): ${h.name}${h.commerce ? ' [COMERCIAL — pilar]' : ''}`).join('\n')
    : 'Nenhuma data comercial fixa neste mês.'

  const daysLine = monthDays.map(d => {
    const base = `- ${d.iso} (${d.weekday})${d.isWeekend ? ' [fim de semana]' : ''}`
    return d.holiday ? `${base} — ${d.holiday.name}` : base
  }).join('\n')

  /* ── Playbooks ─────────────────────────────────────────────────────── */
  const PLAYBOOKS = {
    black_friday: `PLAYBOOK: SEMANA BLACK FRIDAY
Gere 5-7 disparos crescendo em intensidade:
- D-7 a D-4: Teaser / warming (mistério, "algo grande vem aí")
- D-3 a D-1: Revelação da oferta + urgência ("últimas 48h", "corra")
- D0 (sexta): Disparo principal (pilar) — maior impacto
- D+1 (sábado): Extensão / lembretes "últimas horas"`,

    maes: `PLAYBOOK: DIA DAS MÃES
Gere 4-6 disparos ao longo de 2 semanas antes da data:
- Começa suave (homenagem, conteúdo emocional)
- Cresce em ofertas
- Pico no fim de semana anterior ao Dia das Mães
- Último disparo: "últimas horas para chegar a tempo"`,

    aniversario: `PLAYBOOK: ANIVERSÁRIO DA MARCA
Gere 5 disparos ao longo da semana:
- Storytelling / "como tudo começou"
- Agradecimento aos clientes fiéis
- Oferta exclusiva aniversário (pilar)
- Destaques dos produtos mais queridos
- Último dia / encerramento com urgência`,

    liquidacao: `PLAYBOOK: LIQUIDAÇÃO / QUEIMA DE ESTOQUE
Gere 5-7 disparos com foco em urgência:
- Anúncio inicial ("liquidação começou")
- Destaque de categorias
- Reforço com escassez ("últimas unidades")
- Pilar: "último fim de semana"
- Fechamento: "última chance"`,

    lancamento: `PLAYBOOK: LANÇAMENTO DE PRODUTO
Gere 5-7 disparos sequenciais:
- Teaser (sem revelar o produto)
- Educação (problema que o produto resolve)
- Revelação oficial (pilar)
- Depoimentos / social proof
- Oferta de lançamento com prazo`,

    reengajamento: `PLAYBOOK: REENGAJAMENTO
Gere 4 disparos para base inativa (90-180d):
- "Sentimos sua falta" com tom acolhedor
- Cupom exclusivo de retorno
- Novidades desde a última compra
- Último push com urgência ("cupom expira em 48h")`,
  }

  const playbookInstruction = playbook && PLAYBOOKS[playbook]
    ? `\n\n## PLAYBOOK ATIVO\n${PLAYBOOKS[playbook]}\nEste playbook tem PRIORIDADE sobre as regras de cadência abaixo — siga a sequência narrativa descrita.`
    : ''

  const scopeLabel = scope === 'week' ? 'semana' : 'mês'
  const scopeDesc  = scope === 'week'
    ? `a semana de ${weekStartIso} a ${isoDate(new Date(new Date(weekStartIso).getTime() + 6 * 86400000))}`
    : monthLabel

  const prompt = `Você é especialista em CRM e retenção para e-commerce. Gere o calendário de ${channelName} completo para ${clientName ? clientName + ' — ' : ''}${scopeDesc}.${playbookInstruction}

## CONTEXTO DA MARCA
${brain || '(sem Cérebro IA cadastrado — use bom senso de marketing B2C)'}

${focus ? `## FOCO DO MÊS\n${focus}\n` : ''}
${tom ? `## TOM DE VOZ\n${tom}\n` : ''}

## SEGMENTAÇÕES DISPONÍVEIS
${segLine}

## DATAS COMERCIAIS / FERIADOS DO MÊS
${holidayLine}

## DIAS DISPONÍVEIS (use apenas estas datas)
${daysLine}

## REGRAS DE GERAÇÃO
1. Gere aproximadamente ${cadence} disparos por semana (total ~${scope === 'week' ? cadence : Math.round(cadence * 4.3)} no ${scopeLabel}).
2. Distribua ao longo do período — NÃO concentre tudo num dia ou semana só.
3. Prefira terça, quarta e quinta. Evite segundas e fins de semana, EXCETO se houver data comercial.
4. ${includePilares ? 'Marque "acao_comercial: true" em datas comerciais relevantes (Black Friday, Dia das Mães, etc.) e em 1-2 datas estratégicas adicionais (lançamentos, liquidações).' : 'Não marque pilares automaticamente.'}
5. Rotacione as segmentações — evite repetir a mesma segmentação 3x seguidas.
6. ${channel === 'email' ? 'Varie horários (manhã 9-11h e tarde 14-17h).' : 'Ajuste horários se relevante.'}
7. Cada entrada DEVE usar uma data da lista acima, no formato YYYY-MM-DD.
8. Gere conteúdo coerente com o Cérebro da marca — use a voz correta, produtos reais se mencionados.

## FORMATO DE RESPOSTA
Responda APENAS com JSON válido — um array de objetos, SEM markdown, SEM texto adicional.
Cada objeto deve ter EXATAMENTE estes campos:
{${commonFields}${channelSpecific}
}

Comece sua resposta com "[" e termine com "]".`

  /* ── Chamar Anthropic ────────────────────────────────────────────────── */
  try {
    const anthRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-api-key':        process.env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthRes.ok) {
      const err = await anthRes.text()
      return res.status(502).json({ error: 'Erro na API Anthropic', detail: err })
    }

    const data = await anthRes.json()
    const text = data.content?.[0]?.text || '[]'

    /* Remover qualquer cerca markdown acidental */
    let clean = text.trim()
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    /* Pegar apenas do primeiro [ até o último ] — safeguard para texto extra */
    const first = clean.indexOf('[')
    const last  = clean.lastIndexOf(']')
    if (first !== -1 && last !== -1) clean = clean.slice(first, last + 1)

    let entries
    try {
      entries = JSON.parse(clean)
    } catch (e) {
      return res.status(500).json({ error: 'Resposta da IA não é JSON válido', detail: text.slice(0, 500) })
    }

    if (!Array.isArray(entries)) {
      return res.status(500).json({ error: 'Resposta da IA não é um array', detail: text.slice(0, 500) })
    }

    /* Sanitizar — filtrar datas válidas dentro do mês e garantir campos mínimos */
    const validIsos = new Set(monthDays.map(d => d.iso))
    entries = entries
      .filter(e => e && typeof e === 'object' && validIsos.has(e.date))
      .map(e => ({
        date: e.date,
        channel,
        tema:              e.tema              || '',
        descricao:         e.descricao         || '',
        segmentacao:       e.segmentacao       || '',
        link_copy:         e.link_copy         || '',
        observacoes:       e.observacoes       || '',
        acao_comercial:    !!e.acao_comercial,
        metodo_mensuracao: e.metodo_mensuracao || '',
        status:            'pendente',
        /* email */
        assunto:           channel === 'email'    ? (e.assunto   || '') : '',
        preheader:         channel === 'email'    ? (e.preheader || '') : '',
        horario:           channel === 'email'    ? (e.horario   || '') : '',
        email_thumbnail:   '',
        /* whatsapp */
        tipo_template:     channel === 'whatsapp' ? (e.tipo_template || 'marketing') : 'marketing',
        tamanho_base:      channel === 'whatsapp' && e.tamanho_base != null ? e.tamanho_base : null,
      }))

    return res.status(200).json({ entries, count: entries.length })

  } catch (e) {
    return res.status(500).json({ error: 'Erro ao processar resposta da IA', detail: e.message })
  }
}
