/* Exporta todos os dados de um cliente como JSON (LGPD compliance + backup) */
import { supabase } from './supabase'

const TABLES = [
  'calendar_entries',
  'atas',
  'automacoes',
  'acompanhamento',
  'pesquisas',
  'relatorios',
  'central_contas',
  'bi_email_metrics',
  'controle_base',
]

export async function exportClientData(client) {
  const dump = { exported_at: new Date().toISOString(), client, tables: {} }
  const errors = []

  for (const t of TABLES) {
    try {
      const { data, error } = await supabase.from(t).select('*').eq('client_id', client.id)
      if (error) { errors.push({ table: t, error: error.message }); continue }
      dump.tables[t] = data || []
    } catch (e) {
      errors.push({ table: t, error: e.message })
    }
  }
  if (errors.length) dump.errors = errors

  /* Count totals */
  dump.summary = Object.fromEntries(TABLES.map(t => [t, dump.tables[t]?.length || 0]))

  /* Download */
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = `${client.name.toLowerCase().replace(/\s+/g, '-')}-dump-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)

  return dump.summary
}
