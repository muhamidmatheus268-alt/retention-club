import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'

const S = {
  bg: '#0c0c10', card: '#111118', panel: '#0e0e16',
  border: '#1e1e2a', ib: '#2a2a38', muted: '#555568', faint: '#333340',
  input: '#0c0c10',
}

const STATUS_ATA = {
  rascunho:   { label: 'Rascunho',   color: '#6b7280' },
  finalizada: { label: 'Finalizada', color: '#10b981' },
  arquivada:  { label: 'Arquivada',  color: '#374151' },
}

const STATUS_ACAO = {
  pendente:     { label: 'Pendente',     color: '#f59e0b' },
  em_andamento: { label: 'Em andamento', color: '#6366f1' },
  concluida:    { label: 'Concluída',    color: '#10b981' },
}

function uid() { return Math.random().toString(36).slice(2) }

function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── DOCX extractor (no deps — reads ZIP binary natively) ────────────────────
async function extractDocxText(file) {
  const buffer = await file.arrayBuffer()
  const bytes  = new Uint8Array(buffer)
  const target = 'word/document.xml'

  for (let i = 0; i < bytes.length - 30; i++) {
    if (bytes[i] !== 0x50 || bytes[i+1] !== 0x4B || bytes[i+2] !== 0x03 || bytes[i+3] !== 0x04) continue
    const fnLen    = bytes[i+26] | (bytes[i+27] << 8)
    const exLen    = bytes[i+28] | (bytes[i+29] << 8)
    const filename = new TextDecoder().decode(bytes.slice(i+30, i+30+fnLen))
    if (filename !== target) continue

    const method   = bytes[i+8] | (bytes[i+9] << 8)
    const cSize    = bytes[i+18] | (bytes[i+19] << 8) | (bytes[i+20] << 16) | (bytes[i+21] << 24)
    const dataStart = i + 30 + fnLen + exLen
    const compressed = bytes.slice(dataStart, dataStart + cSize)

    let xml
    if (method === 0) {
      xml = new TextDecoder().decode(compressed)
    } else {
      const ds = new DecompressionStream('deflate-raw')
      const w = ds.writable.getWriter()
      w.write(compressed); w.close()
      const r = ds.readable.getReader()
      const chunks = []
      for (;;) { const { done, value } = await r.read(); if (done) break; chunks.push(value) }
      const total = chunks.reduce((n, c) => n + c.length, 0)
      const out = new Uint8Array(total)
      let off = 0; for (const c of chunks) { out.set(c, off); off += c.length }
      xml = new TextDecoder().decode(out)
    }

    // Extract <w:t> tag content (preserves word spacing)
    const matches = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    return matches.map(m => m[1]).join(' ').replace(/\s+/g, ' ').trim()
  }
  throw new Error('word/document.xml não encontrado')
}

// ─── AI parser — reads raw ATA text and returns structured JSON ───────────────
async function parseAtaWithAI(rawText, clientName) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return null

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `Você extrai informações de atas de reunião em português brasileiro.

Cliente: ${clientName || 'desconhecido'}

Texto da ata:
${rawText.substring(0, 4000)}

Retorne APENAS este JSON válido, sem texto adicional:
{
  "titulo": "título completo da reunião",
  "data_reuniao": "YYYY-MM-DD",
  "participantes": "nomes separados por vírgula",
  "pauta": "contexto, escopo e pontos discutidos em texto corrido",
  "decisoes": "decisões tomadas, uma por linha com •",
  "acoes": [
    { "descricao": "tarefa", "responsavel": "nome", "prazo": "YYYY-MM-DD", "status": "pendente" }
  ]
}`,
      }],
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

// ─── Client matcher — compares filename + text against client list ─────────────
function matchClient(filename, rawText, clients) {
  const haystack = (filename + ' ' + rawText.substring(0, 300)).toLowerCase()
  // Sort by name length descending to prefer more specific matches
  const sorted = [...clients].sort((a, b) => b.name.length - a.name.length)
  for (const c of sorted) {
    if (haystack.includes(c.slug.toLowerCase())) return c
    const words = c.name.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    if (words.length && words.every(w => haystack.includes(w))) return c
  }
  return null
}

// ─── Sync Panel ───────────────────────────────────────────────────────────────
function SyncPanel({ clients, importedFiles, brandColor, onImport, onClose }) {
  const [step, setStep]         = useState('idle') // idle | scanning | preview | importing | done
  const [items, setItems]       = useState([])
  const [error, setError]       = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  async function handleSelectFolder() {
    if (!window.showDirectoryPicker) {
      setError('Seu navegador não suporta seleção de pasta. Use Chrome ou Edge.')
      return
    }
    setError('')
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
      setStep('scanning')
      const found = []

      for await (const entry of dirHandle.values()) {
        if (entry.kind !== 'file') continue
        if (!entry.name.toLowerCase().endsWith('.docx')) continue
        if (importedFiles.includes(entry.name)) continue // already imported

        const file      = await entry.getFile()
        const rawText   = await extractDocxText(file).catch(() => '')
        const matched   = matchClient(entry.name, rawText, clients)

        found.push({
          filename:   entry.name,
          file,
          rawText,
          matched,    // client object or null
          clientId:   matched?.id || null,
          skip:       false,
        })
      }

      setItems(found)
      setStep('preview')
    } catch (e) {
      if (e.name !== 'AbortError') setError('Erro ao acessar pasta: ' + e.message)
      setStep('idle')
    }
  }

  async function handleImport() {
    const toImport = items.filter(it => !it.skip && it.clientId)
    setStep('importing')
    setProgress({ done: 0, total: toImport.length })

    for (let i = 0; i < toImport.length; i++) {
      const it = toImport[i]
      const client = clients.find(c => c.id === it.clientId)
      const parsed = await parseAtaWithAI(it.rawText, client?.name || '')
      if (parsed) {
        await onImport({
          ...parsed,
          acoes:       (parsed.acoes || []).map(a => ({ ...a, id: uid() })),
          client_id:   it.clientId,
          source_file: it.filename,
          status:      'finalizada',
        })
      }
      setProgress({ done: i + 1, total: toImport.length })
    }
    setStep('done')
  }

  function updateItem(i, patch) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }

  const readyCount = items.filter(it => !it.skip && it.clientId).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget && step !== 'importing') onClose() }}>
      <div className="rounded-2xl border w-full max-w-2xl flex flex-col"
        style={{ backgroundColor: S.card, borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.8)', maxHeight: '88vh' }}>

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: S.ib }}>
          <div>
            <p className="text-white font-bold">Importar ATAs da pasta</p>
            <p className="text-xs mt-0.5" style={{ color: S.muted }}>Arquivos .docx do Google Meet / Gemini</p>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="text-[#555568] hover:text-white text-xl transition-colors">×</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* idle */}
          {step === 'idle' && (
            <div className="text-center py-10">
              <p className="text-4xl mb-4">📁</p>
              <p className="text-sm text-white font-semibold mb-1">Selecione a pasta com as ATAs</p>
              <p className="text-xs mb-6" style={{ color: S.muted }}>
                Ex: Downloads\Claude\Tarefas — arquivos já importados serão ignorados
              </p>
              {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
              <button onClick={handleSelectFolder}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: brandColor }}>
                📂 Selecionar pasta
              </button>
            </div>
          )}

          {/* scanning */}
          {step === 'scanning' && (
            <div className="text-center py-12">
              <svg className="animate-spin mx-auto mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={brandColor} strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10"/>
              </svg>
              <p className="text-sm text-white">Lendo arquivos da pasta…</p>
            </div>
          )}

          {/* preview */}
          {step === 'preview' && (
            <div>
              {items.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm text-white">Nenhum arquivo novo encontrado</p>
                  <p className="text-xs mt-1" style={{ color: S.muted }}>Todos os arquivos já foram importados anteriormente</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: S.faint }}>
                    {items.length} arquivo{items.length !== 1 ? 's' : ''} encontrado{items.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2">
                    {items.map((it, i) => (
                      <div key={i} className="rounded-xl border p-4 transition-all"
                        style={{ borderColor: it.skip ? S.faint : it.clientId ? brandColor + '40' : '#f59e0b40', backgroundColor: S.panel, opacity: it.skip ? 0.5 : 1 }}>
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={!it.skip} onChange={e => updateItem(i, { skip: !e.target.checked })}
                            className="mt-1 shrink-0 accent-orange-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{it.filename}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Cliente:</span>
                              <select
                                value={it.clientId || ''}
                                onChange={e => updateItem(i, { clientId: e.target.value || null })}
                                className="flex-1 text-xs rounded-lg px-2 py-1 focus:outline-none"
                                style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: it.clientId ? '#fff' : '#f59e0b' }}>
                                <option value="">⚠ Selecionar cliente manualmente</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* importing */}
          {step === 'importing' && (
            <div className="text-center py-10">
              <svg className="animate-spin mx-auto mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={brandColor} strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10"/>
              </svg>
              <p className="text-sm text-white mb-3">Processando com IA… {progress.done}/{progress.total}</p>
              <div className="h-1.5 rounded-full overflow-hidden mx-auto max-w-xs" style={{ backgroundColor: S.ib }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress.total ? (progress.done / progress.total * 100) : 0}%`, backgroundColor: brandColor }} />
              </div>
            </div>
          )}

          {/* done */}
          {step === 'done' && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm text-white font-semibold">{progress.total} ATA{progress.total !== 1 ? 's' : ''} importada{progress.total !== 1 ? 's' : ''} com sucesso!</p>
              <p className="text-xs mt-1" style={{ color: S.muted }}>As ATAs aparecem na lista do cliente correspondente</p>
            </div>
          )}
        </div>

        {/* footer */}
        {(step === 'preview' || step === 'done') && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: S.ib }}>
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm border transition-colors"
              style={{ borderColor: S.ib, color: S.muted }}>
              {step === 'done' ? 'Fechar' : 'Cancelar'}
            </button>
            {step === 'preview' && items.length > 0 && readyCount > 0 && (
              <button onClick={handleImport}
                className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: brandColor }}>
                ✨ Importar {readyCount} ATA{readyCount !== 1 ? 's' : ''} com IA
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AI Agent ────────────────────────────────────────────────────────────────
async function runAgentCOO(ata) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY não configurado')

  const prompt = `Você é um Agente COO especializado em gestão de reuniões de agências de marketing digital.

Analise as informações abaixo de uma reunião com cliente e retorne um JSON estruturado.

**Título:** ${ata.titulo || ''}
**Data:** ${ata.data_reuniao || ''}
**Participantes:** ${ata.participantes || ''}
**Pauta / Notas da reunião:**
${ata.pauta || '(sem pauta informada)'}

Instruções:
- Extraia as decisões tomadas na reunião
- Gere tarefas de ação claras com responsável e prazo estimado
- Crie um resumo executivo em 2-3 frases
- Seja direto e objetivo, linguagem de agência brasileira

Retorne APENAS este JSON válido, sem texto adicional:
{
  "resumo": "resumo executivo da reunião em 2-3 frases",
  "decisoes": "lista das decisões tomadas, uma por linha com •",
  "acoes": [
    { "descricao": "descrição da tarefa", "responsavel": "nome ou 'Equipe'", "prazo": "YYYY-MM-DD estimado", "status": "pendente" }
  ]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Erro API: ${res.status}`)
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da IA')
  return JSON.parse(match[0])
}

// ─── small atoms ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Inp({ value, onChange, placeholder, brandColor }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-all"
      style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
      onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
      onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }}
    />
  )
}

function Txt({ value, onChange, placeholder, rows = 4, brandColor }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-all resize-none"
      style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
      onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
      onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }}
    />
  )
}

// ─── Ação item row ────────────────────────────────────────────────────────────
function AcaoRow({ acao, onChange, onDelete, brandColor }) {
  const conf = STATUS_ACAO[acao.status] || STATUS_ACAO.pendente
  const keys = Object.keys(STATUS_ACAO)

  function cycleStatus() {
    const next = keys[(keys.indexOf(acao.status) + 1) % keys.length]
    onChange({ ...acao, status: next })
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-xl border group transition-all"
      style={{ borderColor: S.ib, backgroundColor: S.panel }}>

      {/* status dot */}
      <button onClick={cycleStatus} title={conf.label}
        className="w-5 h-5 rounded-full shrink-0 mt-0.5 transition-all hover:scale-110 border"
        style={{ backgroundColor: conf.color + '20', borderColor: conf.color + '60' }}>
        <span className="block w-2 h-2 rounded-full mx-auto" style={{ backgroundColor: conf.color }} />
      </button>

      <div className="flex-1 min-w-0 space-y-1.5">
        <input value={acao.descricao} onChange={e => onChange({ ...acao, descricao: e.target.value })}
          placeholder="Descrição da tarefa…"
          className="w-full text-sm bg-transparent focus:outline-none text-white placeholder-[#333340]" />
        <div className="flex gap-3">
          <input value={acao.responsavel} onChange={e => onChange({ ...acao, responsavel: e.target.value })}
            placeholder="Responsável"
            className="flex-1 text-xs bg-transparent focus:outline-none"
            style={{ color: S.muted }} />
          <input type="date" value={acao.prazo || ''} onChange={e => onChange({ ...acao, prazo: e.target.value })}
            className="text-xs bg-transparent focus:outline-none"
            style={{ color: S.muted, colorScheme: 'dark' }} />
        </div>
      </div>

      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 text-sm transition-all shrink-0">
        ×
      </button>
    </div>
  )
}

// ─── ATA card (sidebar) ───────────────────────────────────────────────────────
function AtaCard({ ata, active, brandColor, onClick }) {
  const conf = STATUS_ATA[ata.status] || STATUS_ATA.rascunho
  const pendentes = (ata.acoes || []).filter(a => a.status !== 'concluida').length
  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-3.5 rounded-xl border transition-all"
      style={{
        borderColor: active ? brandColor + '50' : S.border,
        backgroundColor: active ? brandColor + '0c' : 'transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#ffffff05' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-white leading-tight truncate flex-1">{ata.titulo}</p>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ backgroundColor: conf.color + '20', color: conf.color }}>
          {conf.label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: S.muted }}>
          {formatDate(ata.data_reuniao)}
        </span>
        {pendentes > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
            {pendentes} pendente{pendentes !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Print ATA ────────────────────────────────────────────────────────────────
function printAta(ata, clientName) {
  const win = window.open('', '_blank')
  const acoes = ata.acoes || []
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>ATA — ${ata.titulo}</title>
    <style>
      body { font-family: 'Helvetica Neue', sans-serif; margin: 40px; color: #111; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #666; margin-bottom: 32px; }
      h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #444; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin: 24px 0 12px; }
      p { font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
      th { text-align: left; padding: 8px 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb; }
      td { padding: 8px 10px; border: 1px solid #e5e7eb; }
      .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .pendente { background: #fef3c7; color: #92400e; }
      .em_andamento { background: #ede9fe; color: #4338ca; }
      .concluida { background: #d1fae5; color: #065f46; }
      @media print { body { margin: 20px; } }
    </style></head><body>
    <h1>${ata.titulo}</h1>
    <div class="meta">
      ${clientName} · ${formatDate(ata.data_reuniao)}${ata.participantes ? ` · ${ata.participantes}` : ''}
    </div>
    ${ata.resumo_ia ? `<h2>Resumo Executivo</h2><p>${ata.resumo_ia}</p>` : ''}
    ${ata.pauta ? `<h2>Pauta / Notas</h2><p>${ata.pauta}</p>` : ''}
    ${ata.decisoes ? `<h2>Decisões</h2><p>${ata.decisoes}</p>` : ''}
    ${acoes.length ? `
    <h2>Plano de Ação</h2>
    <table>
      <thead><tr><th>Tarefa</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
      <tbody>
        ${acoes.map(a => `<tr>
          <td>${a.descricao || ''}</td>
          <td>${a.responsavel || ''}</td>
          <td>${a.prazo ? formatDate(a.prazo) : '—'}</td>
          <td><span class="status ${a.status}">${STATUS_ACAO[a.status]?.label || a.status}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}
  </body></html>`)
  win.document.close()
  setTimeout(() => { win.print() }, 400)
}

// ─── ATA Editor ──────────────────────────────────────────────────────────────
function AtaEditor({ ata, brandColor, clientName, onSave, onDelete }) {
  const [form, setForm] = useState({ ...ata })
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiDone, setAiDone] = useState(false)

  useEffect(() => { setForm({ ...ata }) }, [ata.id])

  function f(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function addAcao() {
    const nova = { id: uid(), descricao: '', responsavel: '', prazo: '', status: 'pendente' }
    f('acoes', [...(form.acoes || []), nova])
  }

  function updateAcao(id, updated) {
    f('acoes', (form.acoes || []).map(a => a.id === id ? updated : a))
  }

  function deleteAcao(id) {
    f('acoes', (form.acoes || []).filter(a => a.id !== id))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  async function handleAI() {
    setAiLoading(true); setAiError(''); setAiDone(false)
    try {
      const result = await runAgentCOO(form)
      setForm(p => ({
        ...p,
        resumo_ia: result.resumo || p.resumo_ia,
        decisoes:  result.decisoes || p.decisoes,
        acoes: [
          ...(p.acoes || []),
          ...(result.acoes || []).map(a => ({ ...a, id: uid() })),
        ],
      }))
      setAiDone(true)
      setTimeout(() => setAiDone(false), 3000)
    } catch (e) {
      setAiError(e.message)
    }
    setAiLoading(false)
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(ata)

  return (
    <div className="flex flex-col h-full">

      {/* editor header */}
      <div className="flex items-center justify-between px-8 py-4 border-b shrink-0" style={{ borderColor: S.border }}>
        <div className="flex items-center gap-3">
          {/* status selector */}
          <div className="flex gap-1.5">
            {Object.entries(STATUS_ATA).map(([key, conf]) => (
              <button key={key} onClick={() => f('status', key)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                style={form.status === key
                  ? { backgroundColor: conf.color + '25', borderColor: conf.color + '60', color: conf.color }
                  : { borderColor: S.ib, color: S.muted }}>
                {conf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI button */}
          <button onClick={handleAI} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50"
            style={aiDone
              ? { backgroundColor: '#10b98118', borderColor: '#10b98140', color: '#10b981' }
              : { backgroundColor: brandColor + '15', borderColor: brandColor + '40', color: brandColor }}>
            {aiLoading ? (
              <><svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10"/>
              </svg>Agente COO…</>
            ) : aiDone ? '✓ Gerado!' : '🤖 Agente COO'}
          </button>

          <button onClick={() => printAta(form, clientName)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={{ borderColor: S.ib, color: S.muted }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
            onMouseLeave={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.ib }}>
            ↓ PDF
          </button>

          {form.id && (
            <button onClick={() => onDelete(form.id)}
              className="text-xs text-red-500 hover:text-red-400 px-2 py-1.5 transition-colors">
              Excluir
            </button>
          )}

          <button onClick={handleSave} disabled={saving || !form.titulo}
            className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            style={{ backgroundColor: isDirty ? brandColor : S.ib }}>
            {saving ? 'Salvando…' : isDirty ? 'Salvar' : 'Salvo'}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="px-8 py-2 text-xs text-red-400 border-b" style={{ borderColor: S.border, backgroundColor: '#1a0808' }}>
          {aiError}
        </div>
      )}

      {/* editor body */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

        {/* top row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Título da reunião">
              <Inp value={form.titulo || ''} onChange={v => f('titulo', v)}
                placeholder="Ex: Alinhamento mensal — Março/26" brandColor={brandColor} />
            </Field>
          </div>
          <Field label="Data">
            <input type="date" value={form.data_reuniao || ''} onChange={e => f('data_reuniao', e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-all"
              style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff', colorScheme: 'dark' }}
              onFocus={e => { e.target.style.borderColor = brandColor }}
              onBlur={e => { e.target.style.borderColor = S.ib }}
            />
          </Field>
        </div>

        <Field label="Participantes">
          <Inp value={form.participantes || ''} onChange={v => f('participantes', v)}
            placeholder="Ex: Matheus (RC), Ana (cliente), João (tráfego)" brandColor={brandColor} />
        </Field>

        <Field label="Pauta / Notas da reunião">
          <Txt value={form.pauta || ''} onChange={v => f('pauta', v)}
            placeholder="Anote os tópicos discutidos, contextos, números mencionados…
Use este campo como rascunho — o Agente COO vai estruturar tudo."
            rows={6} brandColor={brandColor} />
        </Field>

        {/* AI resumo */}
        {form.resumo_ia && (
          <div className="rounded-xl border p-4" style={{ borderColor: brandColor + '30', backgroundColor: brandColor + '08' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: brandColor }}>
              🤖 Resumo executivo
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#c0c0d0' }}>{form.resumo_ia}</p>
          </div>
        )}

        <Field label="Decisões">
          <Txt value={form.decisoes || ''} onChange={v => f('decisoes', v)}
            placeholder="• Decisão 1
• Decisão 2
• Decisão 3"
            rows={4} brandColor={brandColor} />
        </Field>

        {/* Plano de ação */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>
              Plano de Ação ({(form.acoes || []).length})
            </label>
            <button onClick={addAcao}
              className="text-xs px-3 py-1 rounded-lg border transition-all"
              style={{ borderColor: S.ib, color: S.muted }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
              onMouseLeave={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.ib }}>
              + Adicionar tarefa
            </button>
          </div>

          {(form.acoes || []).length === 0 ? (
            <div className="rounded-xl border border-dashed py-8 text-center" style={{ borderColor: S.ib }}>
              <p className="text-sm mb-2" style={{ color: S.faint }}>Nenhuma tarefa ainda</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={addAcao} className="text-xs transition-colors" style={{ color: S.muted }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = S.muted}>
                  + Adicionar manualmente
                </button>
                <span style={{ color: S.faint }}>ou</span>
                <button onClick={handleAI} disabled={aiLoading}
                  className="text-xs transition-colors" style={{ color: brandColor }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  🤖 Gerar com Agente COO
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(form.acoes || []).map(acao => (
                <AcaoRow key={acao.id} acao={acao} brandColor={brandColor}
                  onChange={updated => updateAcao(acao.id, updated)}
                  onDelete={() => deleteAcao(acao.id)} />
              ))}
              <button onClick={addAcao}
                className="w-full py-2.5 text-xs flex items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors"
                style={{ borderColor: S.ib, color: S.faint }}
                onMouseEnter={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = '#3a3a48' }}
                onMouseLeave={e => { e.currentTarget.style.color = S.faint; e.currentTarget.style.borderColor = S.ib }}>
                + Adicionar tarefa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const EMPTY_ATA = {
  titulo: '', data_reuniao: new Date().toISOString().slice(0, 10),
  participantes: '', pauta: '', decisoes: '', acoes: [], resumo_ia: '', status: 'rascunho',
}

export default function ATA() {
  const { client, brandColor } = useClient()
  const [atas, setAtas]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [allClients, setAllClients] = useState([])

  useEffect(() => {
    supabase.from('clients').select('id,name,slug').then(({ data }) => setAllClients(data || []))
  }, [])

  const fetchAtas = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase
      .from('atas').select('*')
      .eq('client_id', client.id)
      .order('data_reuniao', { ascending: false })
    setAtas(data || [])
    setLoading(false)
  }, [client])

  useEffect(() => { fetchAtas() }, [fetchAtas])

  async function handleSave(form) {
    const payload = { ...form, client_id: form.client_id || client?.id }
    if (form.id) {
      await supabase.from('atas').update(payload).eq('id', form.id)
    } else {
      const { data } = await supabase.from('atas').insert(payload).select().single()
      if (data) { setSelected(data); setCreating(false) }
    }
    await fetchAtas()
  }

  async function handleSyncImport(ataData) {
    await supabase.from('atas').insert(ataData)
  }

  const importedFiles = atas.map(a => a.source_file).filter(Boolean)

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta ATA?')) return
    await supabase.from('atas').delete().eq('id', id)
    setSelected(null)
    await fetchAtas()
  }

  function handleNew() {
    setSelected({ ...EMPTY_ATA })
    setCreating(true)
  }

  const activeAta = selected || (atas[0] || null)

  // total pendentes do mês
  const totalPendentes = atas.flatMap(a => a.acoes || []).filter(a => a.status === 'pendente').length

  if (!client) return (
    <div className="flex items-center justify-center h-full">
      <p style={{ color: S.muted }} className="text-sm">Selecione um cliente</p>
    </div>
  )

  return (
    <div className="flex h-full" style={{ backgroundColor: S.bg }}>

      {/* ── Sidebar ── */}
      <aside className="w-72 shrink-0 border-r flex flex-col" style={{ borderColor: S.border, backgroundColor: S.card }}>

        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: S.border }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-white">ATAs</h2>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setSyncOpen(true)} title="Importar da pasta"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:opacity-80"
                style={{ backgroundColor: S.ib, color: S.muted }}>
                📁
              </button>
              <button onClick={handleNew}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm transition-all hover:opacity-80"
                style={{ backgroundColor: brandColor }}>+</button>
            </div>
          </div>
          <p className="text-[11px]" style={{ color: S.muted }}>
            {atas.length} reunião{atas.length !== 1 ? 'ões' : ''}
            {totalPendentes > 0 && ` · ${totalPendentes} tarefa${totalPendentes !== 1 ? 's' : ''} pendente${totalPendentes !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="rounded-xl border p-4 animate-pulse" style={{ borderColor: S.border }}>
                <div className="h-3.5 rounded w-3/4 mb-2" style={{ backgroundColor: S.ib }} />
                <div className="h-2.5 rounded w-1/3" style={{ backgroundColor: S.faint }} />
              </div>
            ))
          ) : atas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-xs" style={{ color: S.faint }}>Nenhuma ATA ainda</p>
              <button onClick={handleNew} className="text-xs mt-2 transition-colors" style={{ color: brandColor }}>
                + Criar primeira
              </button>
            </div>
          ) : atas.map(ata => (
            <AtaCard key={ata.id} ata={ata} brandColor={brandColor}
              active={activeAta?.id === ata.id}
              onClick={() => { setSelected(ata); setCreating(false) }} />
          ))}
        </div>
      </aside>

      {/* ── Sync Panel ── */}
      {syncOpen && (
        <SyncPanel
          clients={allClients}
          importedFiles={importedFiles}
          brandColor={brandColor}
          onImport={async (ataData) => { await handleSyncImport(ataData) }}
          onClose={() => { setSyncOpen(false); fetchAtas() }}
        />
      )}

      {/* ── Editor ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {activeAta ? (
          <AtaEditor
            key={activeAta.id || 'new'}
            ata={activeAta}
            brandColor={brandColor}
            clientName={client.name}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-4xl">📋</p>
            <div className="text-center">
              <p className="text-white font-semibold mb-1">Nenhuma ATA selecionada</p>
              <p className="text-sm mb-4" style={{ color: S.muted }}>Crie uma nova ATA de reunião</p>
              <button onClick={handleNew}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: brandColor }}>
                + Nova ATA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
