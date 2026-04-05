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
    </div>
  )
}

export default function Cerebro() {
  return <CerebroContent />
}
