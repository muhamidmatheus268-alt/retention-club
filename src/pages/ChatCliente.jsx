import { useState, useEffect, useRef } from 'react'
import { useClient } from '../contexts/ClientContext'
import { useToast } from '../contexts/ToastContext'

const S = { bg: '#0c0c10', card: '#111118', border: '#1e1e2a', ib: '#2a2a38', muted: '#555568', faint: '#333340', input: '#0a0a0f' }

const SUGGESTIONS = [
  'Qual foi a melhor campanha do mês passado?',
  'Quantos disparos tenho agendados para esta semana?',
  'Resume as últimas ATAs em 3 bullets',
  'Qual segmentação está mais saturada?',
  'Como está a saúde da base?',
  'Quais tarefas estão atrasadas?',
  'Sugira 3 temas de calendário para a próxima semana',
  'Compare abertura e conversão dos últimos 3 meses',
]

/* Simple markdown renderer for code/bold/lists */
function mdRender(text) {
  if (!text) return null
  const lines = text.split('\n')
  const out = []
  let inList = false
  lines.forEach((l, i) => {
    if (/^\s*[-*]\s+/.test(l)) {
      if (!inList) { out.push(<ul key={`ul${i}`} style={{ listStyle: 'disc', paddingLeft: 18, marginBottom: 8 }}>{[]}</ul>); inList = true }
      const last = out[out.length - 1]
      last.props.children.push(<li key={i} dangerouslySetInnerHTML={{ __html: formatInline(l.replace(/^\s*[-*]\s+/, '')) }} />)
    } else {
      inList = false
      if (l.trim() === '') out.push(<br key={i} />)
      else out.push(<p key={i} style={{ marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: formatInline(l) }} />)
    }
  })
  return out
}
function formatInline(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:#0a0a0f;padding:1px 5px;border-radius:4px;font-family:ui-monospace,monospace;font-size:11px;color:#c4c4d0">$1</code>')
}

export default function ChatCliente() {
  const { client, brandColor } = useClient()
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const endRef = useRef(null)
  const textRef = useRef(null)

  /* Load / save to localStorage per client */
  const storageKey = client ? `rc_chat_${client.id}` : null

  useEffect(() => {
    if (!storageKey) return
    try {
      const prev = JSON.parse(localStorage.getItem(storageKey) || '[]')
      setMessages(prev)
    } catch { setMessages([]) }
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, storageKey])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(prompt) {
    const content = (prompt ?? input).trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user', content, ts: Date.now() }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, messages: next.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro')
        setMessages(m => [...m, { role: 'assistant', content: `⚠ ${data.error || 'Erro'}${data.detail ? '\n' + data.detail : ''}`, ts: Date.now(), error: true }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: data.reply, ts: Date.now(), sources: data.sources_used }])
      }
    } catch (e) {
      toast.error('Erro de conexão: ' + e.message)
      setMessages(m => [...m, { role: 'assistant', content: '⚠ Erro de conexão.', ts: Date.now(), error: true }])
    }
    setLoading(false)
    textRef.current?.focus()
  }

  function clearChat() {
    if (messages.length === 0) return
    if (!window.confirm('Limpar histórico desta conversa?')) return
    setMessages([])
    toast.info('Histórico limpo')
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!client) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm" style={{ color: S.muted }}>Selecione um cliente</p></div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: S.border, backgroundColor: S.card }}>
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: brandColor }}>💬</span>
          <div>
            <p className="text-sm font-bold text-white">Chat com a IA</p>
            <p className="text-[11px]" style={{ color: S.muted }}>
              Perguntas em linguagem natural sobre {client.name}. A IA consulta seus dados automaticamente.
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: S.ib, color: S.muted }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
            onMouseLeave={e => { e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.ib }}>
            🗑 Limpar
          </button>
        )}
      </div>

      {/* Messages / welcome */}
      <div className="flex-1 overflow-y-auto px-6 py-6" style={{ backgroundColor: S.bg }}>
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ backgroundColor: brandColor + '18', border: `1px solid ${brandColor}30` }}>
              ✨
            </div>
            <h2 className="text-xl font-bold text-white mb-1">O que você quer saber sobre {client.name}?</h2>
            <p className="text-sm mb-6" style={{ color: S.muted }}>
              A IA tem acesso a: calendário, diagnóstico, ATAs, automações, acompanhamento, contas e Cérebro.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-xs rounded-lg border px-3 py-2.5 transition-all"
                  style={{ backgroundColor: S.card, borderColor: S.border, color: '#c4c4d0' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = brandColor + '60'; e.currentTarget.style.backgroundColor = S.input }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.backgroundColor = S.card }}>
                  💭 {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <span className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs mt-0.5"
                    style={{ backgroundColor: brandColor }}>✨</span>
                )}
                <div className={`rounded-2xl px-4 py-2.5 max-w-[82%]`}
                  style={m.role === 'user'
                    ? { backgroundColor: brandColor, color: '#fff' }
                    : { backgroundColor: S.card, border: `1px solid ${m.error ? '#ef444440' : S.border}`, color: '#c4c4d0' }}>
                  <div className="text-sm leading-relaxed">
                    {m.role === 'user' ? m.content : mdRender(m.content)}
                  </div>
                  {m.sources?.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-[10px] flex gap-1 flex-wrap"
                      style={{ borderColor: S.ib, color: S.faint }}>
                      <span>fontes:</span>
                      {m.sources.map(s => (
                        <span key={s} className="px-1.5 py-0.5 rounded" style={{ backgroundColor: S.input, color: '#6b6b80' }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: brandColor }}>✨</span>
                <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: S.card, border: `1px solid ${S.border}` }}>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: brandColor, animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: brandColor, animationDelay: '200ms' }} />
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: brandColor, animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-6 py-3" style={{ borderColor: S.border, backgroundColor: S.card }}>
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Pergunte algo sobre este cliente… (Shift+Enter para nova linha)"
            className="flex-1 text-sm rounded-xl px-4 py-2.5 focus:outline-none resize-none transition-all"
            style={{ backgroundColor: S.input, border: `1px solid ${S.border}`, color: '#fff', maxHeight: 180 }}
            onFocus={e => { e.target.style.borderColor = brandColor + '80' }}
            onBlur={e => { e.target.style.borderColor = S.border }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            style={{ backgroundColor: brandColor }}>
            {loading ? '…' : 'Enviar'}
          </button>
        </div>
        <p className="max-w-3xl mx-auto text-[10px] mt-2" style={{ color: S.faint }}>
          A IA usa: calendário, diagnóstico, ATAs, automações, tarefas, contas e Cérebro deste cliente. Conversas salvas localmente.
        </p>
      </div>
    </div>
  )
}
