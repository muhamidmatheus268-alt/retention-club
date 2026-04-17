import { useState, useEffect, useRef } from 'react'
import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'
import { supabase } from '../lib/supabase'

const PLACEHOLDER = `Escreva aqui tudo sobre este cliente para a IA usar ao gerar sugestões de calendário. Exemplos:

## Marca
Nome: Denavita
Tom de voz: acolhedor, empoderador, feminino
Público: mulheres 30-55 anos interessadas em saúde e bem-estar

## Produtos
- Suplemento Colágeno: R$ 129 — pele, cabelo e unhas
- Kit Detox 30 dias: R$ 249 — emagrecimento saudável
- Vitamina D3 + K2: R$ 89 — imunidade e ossos

## Segmentações usadas
- Ativos 90d — compraram nos últimos 90 dias
- Reengajamento — sem compra há 90-180 dias
- VIPs — mais de 2 compras
- Toda base

## Exemplos de assuntos que performaram bem
- "[firstname], seu corpo agradece"
- "O segredo que 12.000 mulheres já descobriram"
- "Últimas unidades do kit favorito"

## Regras
- Tom sempre positivo e encorajador
- Nunca usar CAPS LOCK no assunto
- Preheader deve complementar o assunto, não repetir
`

function CerebroContent() {
  const { client, brandColor } = useClient()
  const [brain, setBrain] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiModal, setAiModal]     = useState(null) // { mode, data, error }
  const [hint, setHint]           = useState('')

  async function runAI(mode) {
    setAiLoading(true); setAiModal({ mode, data: null, error: '' })
    try {
      const res = await fetch('/api/enrich-brain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, mode, current_brain: brain, hint }),
      })
      const data = await res.json()
      if (!res.ok) { setAiModal({ mode, data: null, error: data.error || 'Erro' }); setAiLoading(false); return }
      setAiModal({ mode, data, error: '' })
    } catch (e) { setAiModal({ mode, data: null, error: e.message }) }
    setAiLoading(false)
  }

  function applyRewrite() {
    if (!aiModal?.data?.brain) return
    setBrain(aiModal.data.brain)
    autoSave(aiModal.data.brain)
    setAiModal(null)
  }

  useEffect(() => {
    if (!client) return
    setLoading(true)
    supabase.from('clients').select('brain').eq('id', client.id).single()
      .then(({ data }) => {
        setBrain(data?.brain || '')
        setLoading(false)
      })
  }, [client?.id])

  function handleChange(val) {
    setBrain(val)
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(val), 1500)
  }

  async function autoSave(val) {
    if (!client) return
    setSaving(true)
    await supabase.from('clients').update({ brain: val }).eq('id', client.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSave() {
    clearTimeout(saveTimer.current)
    autoSave(brain)
  }

  if (!client) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[#555568] text-sm">Selecione um cliente</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-white font-bold text-xl tracking-tight flex items-center gap-2">
          🧠 Cérebro do Projeto
        </h1>
        <p className="text-[#555568] text-sm mt-1">
          Tudo que a IA precisa saber sobre <strong className="text-[#8b8ba0]">{client.name}</strong> para gerar sugestões certeiras no calendário.
        </p>
      </div>

      {/* AI toolbar */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <button onClick={() => runAI('review')} disabled={aiLoading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50"
          style={{ borderColor: '#6366f140', color: '#818cf8', backgroundColor: '#6366f110' }}>
          🔍 Revisar com IA
        </button>
        <button onClick={() => runAI('rewrite')} disabled={aiLoading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`, boxShadow: `0 2px 8px ${brandColor}40` }}>
          ✨ Reestruturar com IA
        </button>
        <input type="text" value={hint} onChange={e => setHint(e.target.value)}
          placeholder="Dica opcional (ex: marca de moda sustentável)"
          className="flex-1 min-w-[200px] text-xs rounded-lg px-3 py-2 focus:outline-none"
          style={{ backgroundColor: '#0c0c10', border: '1px solid #1e1e2a', color: '#fff' }} />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e1e2a' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: '#111118', borderColor: '#1e1e2a' }}>
          <span className="text-xs font-semibold text-[#555568] uppercase tracking-widest">Contexto da marca</span>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-[#555568]">Salvando…</span>}
            {saved && <span className="text-xs text-emerald-500">✓ Salvo</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              Salvar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64" style={{ backgroundColor: '#0c0c10' }}>
            <span className="text-[#555568] text-sm">Carregando…</span>
          </div>
        ) : (
          <textarea
            value={brain}
            onChange={e => handleChange(e.target.value)}
            placeholder={PLACEHOLDER}
            className="w-full resize-none outline-none text-sm font-mono leading-relaxed"
            style={{
              backgroundColor: '#0c0c10',
              color: '#c8c8d8',
              caretColor: brandColor,
              padding: '20px',
              minHeight: '60vh',
              border: 'none',
            }}
          />
        )}
      </div>

      <p className="text-xs text-[#333340] mt-3 text-center">
        Salvo automaticamente • Usado pela IA ao clicar em ✨ Sugerir no calendário
      </p>

      {/* ─── AI Modal ─── */}
      {aiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAiModal(null) }}>
          <div className="rounded-2xl border w-full max-w-2xl max-h-[92vh] flex flex-col modal-panel"
            style={{ backgroundColor: '#111118', borderColor: '#2a2a38', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#2a2a38' }}>
              <p className="text-white font-bold">
                {aiModal.mode === 'review' ? '🔍 Revisão do Cérebro' : '✨ Cérebro reestruturado'}
              </p>
              <button onClick={() => setAiModal(null)} className="text-[#555568] hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {aiLoading && (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 animate-spin"
                    style={{ background: `conic-gradient(${brandColor}, transparent)`, maskImage: 'radial-gradient(circle, transparent 55%, #000 56%)', WebkitMaskImage: 'radial-gradient(circle, transparent 55%, #000 56%)' }} />
                  <p className="text-sm text-white font-semibold">IA analisando Cérebro…</p>
                </div>
              )}
              {aiModal.error && (
                <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#f87171' }}>{aiModal.error}</div>
              )}

              {/* Review mode */}
              {aiModal.mode === 'review' && aiModal.data?.review && (
                <>
                  <div className="rounded-xl border p-3" style={{ backgroundColor: '#0c0c10', borderColor: '#2a2a38' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#555568' }}>Completude</p>
                      <p className="text-lg font-bold" style={{ color: brandColor }}>{aiModal.data.review.completude_pct}%</p>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#1e1e2a' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${aiModal.data.review.completude_pct}%`, backgroundColor: brandColor }} />
                    </div>
                    <p className="text-xs mt-2" style={{ color: '#c4c4d0' }}>{aiModal.data.review.frase_resumo}</p>
                  </div>

                  {aiModal.data.review.pontos_faltando?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#555568' }}>O que falta</p>
                      <ul className="rounded-xl border p-3 space-y-1.5" style={{ backgroundColor: '#0c0c10', borderColor: '#2a2a38' }}>
                        {aiModal.data.review.pontos_faltando.map((p, i) => (
                          <li key={i} className="flex gap-2 text-sm" style={{ color: '#c4c4d0' }}>
                            <span className="shrink-0" style={{ color: '#f59e0b' }}>●</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiModal.data.review.sugestoes_concretas?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#555568' }}>Sugestões</p>
                      <div className="space-y-2">
                        {aiModal.data.review.sugestoes_concretas.map((s, i) => (
                          <div key={i} className="rounded-lg border p-3" style={{ backgroundColor: '#0c0c10', borderColor: '#2a2a38' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: brandColor }}>{s.secao}</p>
                            <p className="text-xs leading-relaxed" style={{ color: '#c4c4d0' }}>{s.sugestao}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Rewrite mode */}
              {aiModal.mode === 'rewrite' && aiModal.data?.brain && (
                <>
                  <p className="text-xs" style={{ color: '#555568' }}>Preview do novo Cérebro. Clique "Aplicar" para substituir o atual.</p>
                  <pre className="rounded-xl border p-4 text-xs font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto"
                    style={{ backgroundColor: '#0c0c10', borderColor: '#2a2a38', color: '#c8c8d8' }}>
                    {aiModal.data.brain}
                  </pre>
                </>
              )}
            </div>
            {aiModal.mode === 'rewrite' && aiModal.data?.brain && (
              <div className="flex items-center justify-end gap-2 px-6 py-3 border-t shrink-0" style={{ borderColor: '#2a2a38', backgroundColor: '#0f0f17' }}>
                <button onClick={() => setAiModal(null)}
                  className="px-4 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#2a2a38', color: '#555568' }}>
                  Cancelar
                </button>
                <button onClick={applyRewrite}
                  className="px-4 py-1.5 rounded-lg text-white text-sm font-semibold hover:opacity-90"
                  style={{ backgroundColor: brandColor }}>
                  Aplicar ao Cérebro
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Cerebro() {
  return <CerebroContent />
}
