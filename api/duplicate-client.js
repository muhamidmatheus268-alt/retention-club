/* ──────────────────────────────────────────────────────────────────────────
   /api/duplicate-client
   Duplica um cliente (Cérebro + automações + pesquisas + central de contas),
   NÃO copia: calendar_entries, atas, acompanhamento, relatorios, bi, controle_base
   ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { source_id, new_name } = req.body || {}
  if (!source_id || !new_name) return res.status(400).json({ error: 'source_id e new_name obrigatórios' })

  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

  const slugify = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

  try {
    /* 1) Fetch source */
    const srcRes = await fetch(`${sbUrl}/rest/v1/clients?id=eq.${source_id}&select=*`, { headers: h })
    const src = (await srcRes.json())?.[0]
    if (!src) return res.status(404).json({ error: 'Cliente origem não encontrado' })

    /* 2) Create new */
    const { id: _i, created_at: _c, updated_at: _u, ...clientData } = src
    const newSlug = slugify(new_name)
    const newClient = { ...clientData, name: new_name, slug: newSlug }
    const cRes = await fetch(`${sbUrl}/rest/v1/clients`, { method: 'POST', headers: h, body: JSON.stringify(newClient) })
    if (!cRes.ok) return res.status(502).json({ error: 'Erro ao criar cliente', detail: await cRes.text() })
    const createdArr = await cRes.json()
    const created = Array.isArray(createdArr) ? createdArr[0] : createdArr
    if (!created?.id) return res.status(500).json({ error: 'Cliente criado mas sem id' })

    const newId = created.id
    const summary = { clients: 1 }

    /* 3) Copy related tables */
    const copyTable = async (table) => {
      const r = await fetch(`${sbUrl}/rest/v1/${table}?client_id=eq.${source_id}&select=*`, { headers: h })
      const rows = await r.json()
      if (!Array.isArray(rows) || rows.length === 0) { summary[table] = 0; return }
      const cleaned = rows.map(row => {
        const { id, created_at, updated_at, ...rest } = row
        return { ...rest, client_id: newId }
      })
      const ins = await fetch(`${sbUrl}/rest/v1/${table}`, { method: 'POST', headers: h, body: JSON.stringify(cleaned) })
      summary[table] = ins.ok ? cleaned.length : 0
    }

    await Promise.all([
      copyTable('automacoes'),
      copyTable('pesquisas'),
      copyTable('central_contas'),
    ])

    return res.status(200).json({ client: created, summary })
  } catch (e) {
    return res.status(500).json({ error: 'Erro', detail: e.message })
  }
}
