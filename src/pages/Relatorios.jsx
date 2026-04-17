import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const S = {
  bg: '#0c0c10', card: '#111118', panel: '#13131f',
  border: '#1e1e2a', ib: '#2a2a38',
  input: '#080810', muted: '#555568', faint: '#444455',
}

const TIPOS = [
  { key: 'segunda',   label: 'Feedback de Segunda',  emoji: '📊', desc: 'Baseado na PLAND — recorrente' },
  { key: 'semanal',   label: 'Revisão Semanal',       emoji: '📅', desc: 'Revisão de projetos da semana' },
  { key: 'quinzenal', label: 'Otimização Quinzenal',  emoji: '⚡', desc: 'Feedback de automações' },
  { key: 'mensal',    label: 'Acompanhamento Mensal', emoji: '📈', desc: 'MoM / YoY análise' },
]

const PLATFORMS = [
  { key: 'pland',      label: 'PlanD',       color: '#6366f1' },
  { key: 'klaviyo',    label: 'Klaviyo',     color: '#f59e0b' },
  { key: 'meta',       label: 'Meta Ads',    color: '#3b82f6' },
  { key: 'google_ads', label: 'Google Ads',  color: '#10b981' },
  { key: 'shopify',    label: 'Shopify',     color: '#84cc16' },
  { key: 'outros',     label: 'Outros',      color: '#8b8ba0' },
]

const EMPTY_PRINTS = Object.fromEntries(PLATFORMS.map(p => [p.key, ['']]))

const EMPTY_FORM = {
  tipo: 'segunda',
  titulo: '',
  notas: '',
  analise_ia: '',
  data_referencia: new Date().toISOString().split('T')[0],
  mes: new Date().getMonth() + 1,
  ano: new Date().getFullYear(),
  platform_prints: EMPTY_PRINTS,
}

function fmtBRL(v) { if (!v) return ''; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }
function fmtPct(v) { if (!v) return ''; return `${Number(v).toFixed(1)}%` }
function fmtInt(v) { if (!v) return ''; return Number(v).toLocaleString('pt-BR') }

/* ══════════════════ PDF PREVIEW ══════════════════ */
function ReportPreview({ report, client, brandColor, biData, onClose }) {
  const printRef = useRef()
  const tipo = TIPOS.find(t => t.key === report.tipo)
  const prints = report.platform_prints || {}
  const allPrints = PLATFORMS.flatMap(p => (prints[p.key] || []).filter(Boolean).map(url => ({ url, platform: p })))

  function handlePrint() {
    const printContent = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${report.titulo || tipo?.label} — ${client?.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; background: #fff; color: #111; }
        .report-wrap { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
        .header-left h1 { font-size: 22px; font-weight: 800; color: #111; margin-bottom: 4px; }
        .header-left p { font-size: 13px; color: #666; }
        .badge { display: inline-block; background: ${brandColor}22; color: ${brandColor}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 20px; margin-bottom: 8px; }
        .rc-logo { font-size: 13px; font-weight: 800; color: #111; }
        .rc-logo span { color: ${brandColor}; }
        .section { margin-bottom: 28px; }
        .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 12px; border-left: 3px solid ${brandColor}; padding-left: 10px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .kpi-card { background: #f8f8fb; border-radius: 10px; padding: 14px 16px; }
        .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 6px; }
        .kpi-val { font-size: 20px; font-weight: 800; color: #111; }
        .notas { font-size: 14px; line-height: 1.7; color: #333; white-space: pre-wrap; }
        .imgs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .img-card { border-radius: 8px; overflow: hidden; border: 1px solid #eee; }
        .img-card img { width: 100%; display: block; }
        .img-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #888; padding: 6px 10px; background: #f5f5f5; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
        .importante { background: #fffbf0; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
        .importante p { font-size: 13px; color: #92400e; line-height: 1.6; }
        .importante strong { color: #78350f; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .kpi-card { -webkit-print-color-adjust: exact; }
        }
      </style>
      </head><body>
      <div class="report-wrap">
        <div class="header">
          <div class="header-left">
            <div class="badge">${tipo?.label}</div>
            <h1>Relatório CRM | ${client?.name}</h1>
            <p>${report.data_referencia ? new Date(report.data_referencia + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p>
          </div>
          <div class="rc-logo"><span>→</span>r0cket · Retention Club</div>
        </div>

        <div class="importante">
          <p>Dentro desse relatório você terá uma visão completa da performance de CRM. Os dados apresentados são de campanha e automação (email, WhatsApp e SMS). <strong>Comparativo (MTD):</strong> os dados atuais são comparados com os do período anterior.</p>
        </div>

        ${biData ? `
        <div class="section">
          <div class="section-title">Dados Gerais — CRM</div>
          <div class="kpi-grid">
            ${[
              { label: 'Receita CRM', val: fmtBRL(biData.receita) },
              { label: 'Meta', val: fmtBRL(biData.meta_receita) },
              { label: 'Ticket Médio', val: fmtBRL(biData.ticket_medio) },
              { label: 'Taxa Abertura', val: fmtPct(biData.taxa_abertura) },
              { label: 'Taxa Conversão', val: fmtPct(biData.taxa_conversao) },
              { label: 'Enviados', val: fmtInt(biData.emails_enviados) },
            ].map(k => `<div class="kpi-card"><div class="kpi-label">${k.label}</div><div class="kpi-val">${k.val || '—'}</div></div>`).join('')}
          </div>
        </div>

        ${(biData.novos_clientes || biData.clientes_recorrentes) ? `
        <div class="section">
          <div class="section-title">Aquisição & Retenção</div>
          <div class="kpi-grid">
            ${[
              { label: 'Novos Clientes', val: fmtInt(biData.novos_clientes) },
              { label: 'Recorrentes', val: fmtInt(biData.clientes_recorrentes) },
              { label: 'Taxa de Recompra', val: fmtPct(biData.taxa_recompra) },
              { label: 'CAC', val: fmtBRL(biData.cac) },
              { label: 'LTV Projetado', val: fmtBRL(biData.ltv_projetado) },
            ].map(k => `<div class="kpi-card"><div class="kpi-label">${k.label}</div><div class="kpi-val">${k.val || '—'}</div></div>`).join('')}
          </div>
        </div>` : ''}
        ` : ''}

        ${(report.analise_ia || report.notas) ? `
        <div class="section">
          <div class="section-title">Análise & Observações</div>
          <div class="notas">${(report.analise_ia || '') + (report.analise_ia && report.notas ? '\n\n' : '') + (report.notas || '')}</div>
        </div>` : ''}

        ${allPrints.length > 0 ? `
        <div class="section">
          <div class="section-title">Prints das Plataformas</div>
          <div class="imgs-grid">
            ${allPrints.slice(0, 8).map(({ url, platform }) => `
              <div class="img-card">
                <div class="img-label">${platform.label}</div>
                <img src="${url}" alt="${platform.label}" />
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        <div class="footer">
          <span>Retention Club · Sistema de CRM</span>
          <span>Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
      </body></html>
    `)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b shrink-0"
        style={{ backgroundColor: '#0e0e14', borderColor: S.border }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-sm transition-colors hover:text-white" style={{ color: S.muted }}>
            ← Voltar
          </button>
          <span className="text-[#333340]">|</span>
          <span className="text-white text-sm font-semibold">{report.titulo || tipo?.label}</span>
        </div>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: brandColor }}>
          🖨 Gerar PDF
        </button>
      </div>

      {/* Preview canvas */}
      <div className="flex-1 overflow-auto py-8 px-4" style={{ backgroundColor: '#1a1a1a' }}>
        <div ref={printRef} className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: '#fff', color: '#111', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          {/* Report header */}
          <div className="flex items-start justify-between px-10 pt-8 pb-6"
            style={{ borderBottom: '2px solid #f0f0f2' }}>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3"
                style={{ backgroundColor: brandColor + '20', color: brandColor }}>
                {tipo?.label}
              </span>
              <h1 className="text-2xl font-black text-gray-900 mb-1">{report.titulo || `Relatório CRM`}</h1>
              <p className="text-gray-500 text-sm">
                {client?.name} · {report.data_referencia ? new Date(report.data_referencia + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-black text-gray-900 text-sm">
                <span style={{ color: brandColor }}>→</span>r0cket
              </p>
              <p className="text-gray-400 text-xs">Retention Club</p>
            </div>
          </div>

          <div className="px-10 py-6 space-y-6">
            {/* Importante */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#fffbf0', border: '1px solid #fde68a' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#92400e' }}>⚠ Importante</p>
              <p className="text-sm leading-relaxed" style={{ color: '#78350f' }}>
                Este relatório apresenta a performance do CRM. <strong>Comparativo (MTD):</strong> dados comparados com o período anterior.
                As métricas incluem email, WhatsApp e automações de retenção.
              </p>
            </div>

            {/* BI KPIs */}
            {biData && (
              <>
                <PreviewSection title="Dados Gerais — CRM" brandColor={brandColor}>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Receita CRM', val: fmtBRL(biData.receita) },
                      { label: 'Meta', val: fmtBRL(biData.meta_receita) },
                      { label: 'Ticket Médio', val: fmtBRL(biData.ticket_medio) },
                      { label: 'Taxa Abertura', val: fmtPct(biData.taxa_abertura) },
                      { label: 'Taxa Conversão', val: fmtPct(biData.taxa_conversao) },
                      { label: 'Enviados', val: fmtInt(biData.emails_enviados) },
                    ].map(k => (
                      <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: '#f8f8fb' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#888' }}>{k.label}</p>
                        <p className="text-xl font-black text-gray-900">{k.val || '—'}</p>
                      </div>
                    ))}
                  </div>
                </PreviewSection>

                {(biData.novos_clientes || biData.clientes_recorrentes) && (
                  <PreviewSection title="Aquisição & Retenção" brandColor={brandColor}>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Novos Clientes', val: fmtInt(biData.novos_clientes) },
                        { label: 'Recorrentes', val: fmtInt(biData.clientes_recorrentes) },
                        { label: '% Recompra', val: fmtPct(biData.taxa_recompra) },
                        { label: 'CAC', val: fmtBRL(biData.cac) },
                        { label: 'LTV 12m', val: fmtBRL(biData.ltv_projetado) },
                      ].map(k => (
                        <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: '#f8f8fb' }}>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#888' }}>{k.label}</p>
                          <p className="text-xl font-black text-gray-900">{k.val || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </PreviewSection>
                )}
              </>
            )}

            {/* Analysis */}
            {(report.analise_ia || report.notas) && (
              <PreviewSection title="Análise & Observações" brandColor={brandColor}>
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                  {report.analise_ia}{report.analise_ia && report.notas && '\n\n'}{report.notas}
                </p>
              </PreviewSection>
            )}

            {/* Platform prints */}
            {allPrints.length > 0 && (
              <PreviewSection title="Prints das Plataformas" brandColor={brandColor}>
                <div className="grid grid-cols-2 gap-4">
                  {allPrints.slice(0, 8).map(({ url, platform }, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                        style={{ backgroundColor: '#f5f5f7', color: '#666' }}>
                        {platform.label}
                      </div>
                      <img src={url} alt={platform.label} className="w-full"
                        onError={e => { e.target.style.display='none' }} />
                    </div>
                  ))}
                </div>
              </PreviewSection>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid #f0f0f2' }}>
              <p className="text-xs text-gray-400">Retention Club · Sistema de CRM</p>
              <p className="text-xs text-gray-400">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewSection({ title, brandColor, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div style={{ width: 3, height: 16, backgroundColor: brandColor, borderRadius: 2 }} />
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
      </div>
      {children}
    </div>
  )
}

/* ══════════════════ AI ANALYSIS ══════════════════ */
async function generateAIAnalysis(biData, client, tipo) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY não configurado no .env')

  const metrics = biData ? `
- Receita CRM: ${fmtBRL(biData.receita) || 'não informado'}
- Meta: ${fmtBRL(biData.meta_receita) || 'não informado'}
- Taxa de Abertura: ${fmtPct(biData.taxa_abertura) || 'não informado'}
- Taxa de Cliques: ${fmtPct(biData.taxa_cliques) || 'não informado'}
- Taxa de Conversão: ${fmtPct(biData.taxa_conversao) || 'não informado'}
- Ticket Médio: ${fmtBRL(biData.ticket_medio) || 'não informado'}
- Emails Enviados: ${fmtInt(biData.emails_enviados) || 'não informado'}
- Novos Clientes: ${fmtInt(biData.novos_clientes) || 'não informado'}
- Clientes Recorrentes: ${fmtInt(biData.clientes_recorrentes) || 'não informado'}
- Taxa de Recompra: ${fmtPct(biData.taxa_recompra) || 'não informado'}
- CAC: ${fmtBRL(biData.cac) || 'não informado'}
- LTV Projetado: ${fmtBRL(biData.ltv_projetado) || 'não informado'}
- RPE: ${fmtBRL(biData.rpe) || 'não informado'}
- RPA: ${fmtBRL(biData.rpa) || 'não informado'}` : 'Dados de BI não disponíveis para este período.'

  const prompt = `Você é um especialista sênior em CRM, email marketing e retenção de clientes para e-commerce.

Cliente: ${client?.name || 'cliente'}
Tipo de relatório: ${TIPOS.find(t => t.key === tipo)?.label}

Métricas do período:
${metrics}

Gere uma análise executiva profissional em português com exatamente 3 seções:

**📊 Performance Geral**
[2-3 frases sobre os resultados gerais, destacando receita, taxas e comparativo esperado]

**✅ Pontos Fortes**
[2-3 bullet points com o que está funcionando bem]

**🎯 Próximos Passos**
[2-3 ações concretas e prioritárias para o próximo período]

Seja direto, técnico e orientado a dados. Não use linguagem genérica.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
  const data = await res.json()
  return data.content[0].text
}

/* ══════════════════ MAIN ══════════════════ */
function RelContent() {
  const { client, brandColor } = useClient()
  const now = new Date()
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState('todos')
  const [preview, setPreview]   = useState(null)
  const [biData, setBiData]     = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError]   = useState('')
  const [activePlatform, setActivePlatform] = useState('pland')

  const fetchList = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase.from('relatorios').select('*')
      .eq('client_id', client.id).order('data_referencia', { ascending: false })
    setList(data || [])
    setLoading(false)
  }, [client])

  useEffect(() => { fetchList() }, [fetchList])

  // Fetch BI data when mes/ano changes in form
  useEffect(() => {
    if (!client || !form.mes || !form.ano) return
    supabase.from('bi_email_metrics').select('*')
      .eq('client_id', client.id)
      .eq('mes', form.mes)
      .eq('ano', form.ano)
      .single()
      .then(({ data }) => setBiData(data || null))
  }, [client, form.mes, form.ano])

  function openNew() {
    setForm({ ...EMPTY_FORM, data_referencia: now.toISOString().split('T')[0], mes: now.getMonth() + 1, ano: now.getFullYear() })
    setActivePlatform('pland')
    setAiError('')
    setModal('new')
  }

  function openEdit(r) {
    setForm({
      tipo: r.tipo || 'segunda',
      titulo: r.titulo || '',
      notas: r.notas || '',
      analise_ia: r.analise_ia || '',
      data_referencia: r.data_referencia || '',
      mes: r.mes || now.getMonth() + 1,
      ano: r.ano || now.getFullYear(),
      platform_prints: r.platform_prints || EMPTY_PRINTS,
    })
    setActivePlatform('pland')
    setAiError('')
    setModal(r)
  }

  async function save() {
    if (!client) return
    setSaving(true)
    const cleanPrints = Object.fromEntries(
      PLATFORMS.map(p => [p.key, (form.platform_prints[p.key] || []).filter(u => u.trim())])
    )
    const payload = {
      client_id: client.id,
      tipo: form.tipo,
      titulo: form.titulo,
      notas: form.notas,
      analise_ia: form.analise_ia,
      data_referencia: form.data_referencia,
      mes: form.mes,
      ano: form.ano,
      platform_prints: cleanPrints,
      // legacy compat
      imagens: Object.values(cleanPrints).flat(),
    }
    if (modal?.id) await supabase.from('relatorios').update(payload).eq('id', modal.id)
    else await supabase.from('relatorios').insert(payload)
    setSaving(false)
    setModal(null)
    await fetchList()
  }

  async function del(id) {
    if (!window.confirm('Excluir relatório?')) return
    await supabase.from('relatorios').delete().eq('id', id)
    setModal(null)
    await fetchList()
  }

  async function handleGenerateAI() {
    setAiLoading(true)
    setAiError('')
    try {
      const text = await generateAIAnalysis(biData, client, form.tipo)
      setForm(f => ({ ...f, analise_ia: text }))
    } catch (err) {
      setAiError(err.message || 'Erro ao gerar análise')
    } finally {
      setAiLoading(false)
    }
  }

  /* Auto-generate entire report (título + notas + análise IA) from BI + calendar */
  async function handleGenerateFullReport() {
    if (!client) return
    setAiLoading(true); setAiError('')
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          mes: form.mes,
          ano: form.ano,
          tipo: form.tipo,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError((data.error || 'Erro') + (data.detail ? ': ' + data.detail.slice(0, 200) : ''))
      } else if (data.report) {
        setForm(f => ({
          ...f,
          titulo:     data.report.titulo     || f.titulo,
          notas:      data.report.notas      || f.notas,
          analise_ia: data.report.analise_ia || f.analise_ia,
        }))
      }
    } catch (e) {
      setAiError('Erro de conexão: ' + e.message)
    }
    setAiLoading(false)
  }

  function updatePrint(platform, index, value) {
    setForm(f => {
      const prints = { ...f.platform_prints }
      const arr = [...(prints[platform] || [''])]
      arr[index] = value
      prints[platform] = arr
      return { ...f, platform_prints: prints }
    })
  }
  function addPrint(platform) {
    setForm(f => {
      const prints = { ...f.platform_prints }
      prints[platform] = [...(prints[platform] || ['']), '']
      return { ...f, platform_prints: prints }
    })
  }
  function removePrint(platform, index) {
    setForm(f => {
      const prints = { ...f.platform_prints }
      prints[platform] = prints[platform].filter((_, i) => i !== index)
      if (prints[platform].length === 0) prints[platform] = ['']
      return { ...f, platform_prints: prints }
    })
  }

  const filtered = filter === 'todos' ? list : list.filter(r => r.tipo === filter)

  if (!client) return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm" style={{ color: S.muted }}>Selecione um cliente</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Relatórios</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Feedbacks, revisões e acompanhamentos</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: brandColor }}>
          + Novo relatório
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
        {['todos', ...TIPOS.map(t => t.key)].map(k => {
          const t = TIPOS.find(t => t.key === k)
          return (
            <button key={k} onClick={() => setFilter(k)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filter === k ? { backgroundColor: brandColor, color: '#fff' } : { color: S.muted }}>
              {k === 'todos' ? 'Todos' : t?.emoji + ' ' + t?.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center py-16 text-sm" style={{ color: S.muted }}>Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border" style={{ borderColor: S.border }}>
          <p className="text-5xl mb-4">📋</p>
          <p className="text-white font-bold mb-1">Nenhum relatório ainda</p>
          <p className="text-sm mb-6" style={{ color: S.muted }}>Crie relatórios periódicos para este cliente.</p>
          <button onClick={openNew}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColor }}>
            + Criar primeiro
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const tipo = TIPOS.find(t => t.key === r.tipo)
            const dt = r.data_referencia ? new Date(r.data_referencia + 'T12:00').toLocaleDateString('pt-BR') : null
            const totalPrints = Object.values(r.platform_prints || {}).flat().filter(Boolean).length
            return (
              <div key={r.id} className="rounded-2xl border transition-all"
                style={{ backgroundColor: S.card, borderColor: S.border }}>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: brandColor + '18' }}>
                    {tipo?.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: brandColor }}>{tipo?.label}</span>
                      {dt && <span className="text-xs" style={{ color: S.faint }}>{dt}</span>}
                      {r.analise_ia && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#6366f120', color: '#818cf8' }}>🤖 IA</span>}
                      {totalPrints > 0 && <span className="text-[10px]" style={{ color: S.faint }}>🖼 {totalPrints} prints</span>}
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{r.titulo || tipo?.desc}</p>
                    {r.notas && <p className="text-xs mt-0.5 truncate" style={{ color: S.muted }}>{r.notas}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { openEdit(r) }}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: S.ib, color: S.muted }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.color = S.muted }}>
                      Editar
                    </button>
                    <button onClick={async () => {
                      // fetch biData for preview
                      let bd = null
                      if (r.mes && r.ano) {
                        const { data } = await supabase.from('bi_email_metrics').select('*')
                          .eq('client_id', client.id).eq('mes', r.mes).eq('ano', r.ano).single()
                        bd = data
                      }
                      setPreview({ report: r, biData: bd })
                    }}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold transition-opacity hover:opacity-80"
                      style={{ backgroundColor: brandColor + 'dd' }}>
                      Preview →
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════ MODAL ══════════ */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="rounded-2xl border w-full max-w-2xl max-h-[92vh] flex flex-col modal-panel"
            style={{ backgroundColor: S.card, borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: S.ib }}>
              <p className="text-white font-bold">{modal?.id ? 'Editar relatório' : 'Novo relatório'}</p>
              <button onClick={() => setModal(null)} className="text-[#555568] hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ✨ Auto-gerador completo */}
              <div className="rounded-xl border p-4"
                style={{ background: `linear-gradient(135deg, ${brandColor}10, transparent)`, borderColor: brandColor + '40' }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">✨ Gerar relatório completo com IA</p>
                    <p className="text-[11px] mt-0.5" style={{ color: S.muted }}>
                      Preenche título, notas e análise usando Diagnóstico + Calendário + Cérebro
                    </p>
                  </div>
                  <button onClick={handleGenerateFullReport} disabled={aiLoading}
                    className="px-4 py-2 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                    style={{ backgroundColor: brandColor }}>
                    {aiLoading ? '⏳ Gerando…' : '✨ Gerar tudo'}
                  </button>
                </div>
                {aiError && <p className="text-xs text-red-400 mt-2">{aiError}</p>}
              </div>

              {/* Tipo */}
              <FL label="Tipo">
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS.map(t => (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, tipo: t.key }))}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold border text-left transition-all"
                      style={form.tipo === t.key
                        ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' }
                        : { borderColor: S.ib, color: S.muted }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </FL>

              {/* Titulo + date */}
              <div className="grid grid-cols-2 gap-3">
                <FL label="Título">
                  <FInp value={form.titulo} onChange={v => setForm(f => ({ ...f, titulo: v }))}
                    placeholder="Ex: Revisão semana 12/03" brandColor={brandColor} />
                </FL>
                <FL label="Data de Referência">
                  <input type="date" value={form.data_referencia}
                    onChange={e => setForm(f => ({ ...f, data_referencia: e.target.value }))}
                    className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
                    style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
                    onFocus={e => { e.target.style.borderColor = brandColor }}
                    onBlur={e => { e.target.style.borderColor = S.ib }} />
                </FL>
              </div>

              {/* Mes/ano (for linking to BI) */}
              <div className="grid grid-cols-2 gap-3">
                <FL label="Mês de referência BI">
                  <select value={form.mes} onChange={e => setForm(f => ({ ...f, mes: Number(e.target.value) }))}
                    className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
                    style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}>
                    {MONTH_NAMES.map((nm, i) => <option key={i} value={i + 1}>{nm}</option>)}
                  </select>
                </FL>
                <FL label="Ano">
                  <select value={form.ano} onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))}
                    className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
                    style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}>
                    {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </FL>
              </div>

              {/* BI data indicator */}
              <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: biData ? brandColor + '12' : '#0d0d14', border: `1px solid ${biData ? brandColor + '30' : S.border}` }}>
                <span className="text-sm">{biData ? '✅' : '⚠️'}</span>
                <p className="text-xs" style={{ color: biData ? brandColor : S.muted }}>
                  {biData
                    ? `Dados BI carregados: Receita ${fmtBRL(biData.receita)}, Abertura ${fmtPct(biData.taxa_abertura)}`
                    : `Sem dados de BI para ${MONTH_SHORT[form.mes - 1]}/${form.ano} — o relatório ficará sem KPIs automáticos`}
                </p>
              </div>

              {/* Análise IA */}
              <FL label="Análise / Notas">
                <div className="flex items-center justify-between mb-2">
                  <span />
                  <button onClick={handleGenerateAI} disabled={aiLoading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                    style={{ backgroundColor: '#6366f120', color: '#818cf8', border: '1px solid #6366f130' }}>
                    {aiLoading ? '⏳ Gerando…' : '🤖 Gerar análise com IA'}
                  </button>
                </div>
                {aiError && <p className="text-xs text-red-400 mb-2">{aiError}</p>}
                {form.analise_ia && (
                  <div className="mb-2 rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundColor: '#6366f110', border: '1px solid #6366f120', color: '#c4c4f0' }}>
                    <span className="font-bold text-[#818cf8]">🤖 IA · </span>
                    {form.analise_ia}
                  </div>
                )}
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={4} placeholder="Observações adicionais, insights manuais…"
                  className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none resize-none"
                  style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
                  onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}15` }}
                  onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }} />
              </FL>

              {/* Platform prints */}
              <FL label="Prints das plataformas">
                {/* Platform tabs */}
                <div className="flex gap-1 mb-3 p-1 rounded-xl flex-wrap"
                  style={{ backgroundColor: S.bg, border: `1px solid ${S.border}` }}>
                  {PLATFORMS.map(p => {
                    const count = (form.platform_prints[p.key] || []).filter(Boolean).length
                    return (
                      <button key={p.key} onClick={() => setActivePlatform(p.key)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative"
                        style={activePlatform === p.key
                          ? { backgroundColor: p.color, color: '#fff' }
                          : { color: S.muted }}>
                        {p.label}
                        {count > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                            style={{ backgroundColor: p.color, color: '#fff' }}>{count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* URLs for active platform */}
                <div className="space-y-2">
                  {(form.platform_prints[activePlatform] || ['']).map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <FInp value={url}
                        onChange={v => updatePrint(activePlatform, i, v)}
                        placeholder={`URL do print ${i + 1} (${PLATFORMS.find(p => p.key === activePlatform)?.label})`}
                        brandColor={brandColor} />
                      {(form.platform_prints[activePlatform] || []).length > 1 && (
                        <button onClick={() => removePrint(activePlatform, i)}
                          className="text-[#555568] hover:text-red-400 px-2 transition-colors">×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addPrint(activePlatform)}
                    className="text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ color: PLATFORMS.find(p => p.key === activePlatform)?.color }}>
                    + Adicionar print
                  </button>
                </div>
              </FL>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t shrink-0" style={{ borderColor: S.ib }}>
              <div>{modal?.id && <button onClick={() => del(modal.id)} className="text-red-500 hover:text-red-400 text-sm font-medium">Excluir</button>}</div>
              <div className="flex gap-3">
                <button onClick={() => setModal(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border"
                  style={{ borderColor: S.ib, color: S.muted }}>
                  Cancelar
                </button>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: brandColor }}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ PREVIEW ══════════ */}
      {preview && (
        <ReportPreview
          report={preview.report}
          client={client}
          brandColor={brandColor}
          biData={preview.biData}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}

function FL({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#444455' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
function FInp({ value, onChange, placeholder, brandColor }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all"
      style={{ backgroundColor: '#080810', border: '1px solid #2a2a38', color: '#fff' }}
      onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}15` }}
      onBlur={e => { e.target.style.borderColor = '#2a2a38'; e.target.style.boxShadow = '' }} />
  )
}

export default function Relatorios() {
  return <RelContent />
}
