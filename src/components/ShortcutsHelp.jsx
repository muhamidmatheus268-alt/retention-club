import { useState, useEffect } from 'react'

const SHORTCUTS = [
  {
    section: 'Navegação',
    items: [
      { keys: ['⌘', 'K'], alt: ['Ctrl', 'K'], label: 'Abrir busca / command palette' },
      { keys: ['Esc'],              label: 'Fechar modais e menus' },
      { keys: ['↑', '↓'],           label: 'Navegar resultados' },
      { keys: ['↵'],                label: 'Confirmar / abrir seleção' },
    ],
  },
  {
    section: 'Dashboard',
    items: [
      { keys: ['N'],                label: 'Novo cliente' },
      { keys: ['/'],                label: 'Focar busca' },
    ],
  },
  {
    section: 'Calendário',
    items: [
      { keys: ['J'],                label: 'Mês anterior' },
      { keys: ['K'],                label: 'Próximo mês' },
      { keys: ['T'],                label: 'Ir para hoje' },
    ],
  },
  {
    section: 'IA rápida (via ⌘K + termo)',
    items: [
      { keys: ['⌘K'],               label: '"gerar mes" → calendário com IA' },
      { keys: ['⌘K'],               label: '"gerar relatorio" → relatório completo' },
      { keys: ['⌘K'],               label: '"tarefas" → sugere 6 tarefas' },
      { keys: ['⌘K'],               label: '"diagnostico" → análise IA' },
      { keys: ['⌘K'],               label: '"segmentar" → segmentações' },
      { keys: ['⌘K'],               label: '"stack" → analisa integrações' },
    ],
  },
  {
    section: 'Ajuda',
    items: [
      { keys: ['?'],                label: 'Mostrar esta lista' },
    ],
  },
]

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e) {
      /* '?' key (Shift+/) — ignore when typing */
      const tag = (e.target?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
      if (isTyping) return

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      if (open && e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}>

      <div className="w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl modal-panel"
        style={{ backgroundColor: '#13131d', borderColor: '#2a2a38' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 h-12 border-b" style={{ borderColor: '#2a2a38' }}>
          <h2 className="text-sm font-semibold text-white">Atalhos de teclado</h2>
          <button onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555568] hover:text-white hover:bg-[#ffffff08] transition-colors">
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {SHORTCUTS.map(group => (
            <div key={group.section}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: '#3a3a4a' }}>
                {group.section}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-[#9999b0]">{item.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.keys.map((k, j) => (
                        <kbd key={j} className="text-[11px] font-mono px-1.5 py-0.5 rounded border min-w-[22px] text-center"
                          style={{ borderColor: '#2a2a38', color: '#c4c4d0', backgroundColor: '#0a0a0f' }}>
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-2.5 border-t text-[11px]"
          style={{ borderColor: '#2a2a38', color: '#555568', backgroundColor: '#0f0f17' }}>
          Pressione <kbd className="font-mono px-1 py-0.5 rounded border mx-0.5" style={{ borderColor: '#2a2a38' }}>?</kbd> a qualquer momento para abrir esta lista.
        </div>
      </div>
    </div>
  )
}
