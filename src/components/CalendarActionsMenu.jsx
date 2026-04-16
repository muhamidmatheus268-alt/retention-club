import { useState, useRef, useEffect } from 'react'

/* Menu de ações do calendário — agrupa AI + utilitários */

const GROUPS = [
  {
    title: 'Geração com IA',
    items: [
      { key: 'gen_month',   icon: '✨', label: 'Gerar mês inteiro',    desc: 'Com Cérebro + feriados BR' },
      { key: 'gen_week',    icon: '⚡', label: 'Gerar próxima semana', desc: 'Escopo menor, rápido' },
      { key: 'playbook',    icon: '🎨', label: 'Playbooks',             desc: 'Black Friday, Mães, Lançamento…' },
      { key: 'postmortem',  icon: '📊', label: 'Análise do mês (IA)',  desc: 'Insights e recomendações' },
    ],
  },
  {
    title: 'Utilitários',
    items: [
      { key: 'clone_prev',  icon: '🔁', label: 'Replicar mês anterior', desc: 'Duplica entradas do mês passado' },
      { key: 'recurring',   icon: '🔂', label: 'Criar recorrente',      desc: 'Newsletter semanal, etc.' },
      { key: 'bulk',        icon: '📋', label: 'Modo seleção múltipla', desc: 'Editar em lote' },
    ],
  },
  {
    title: 'Importar / Exportar',
    items: [
      { key: 'import_csv',  icon: '📥', label: 'Importar CSV',    desc: 'Cole ou faça upload' },
      { key: 'export_csv',  icon: '📤', label: 'Exportar CSV',    desc: 'Planilha do mês' },
      { key: 'export_ical', icon: '🗓', label: 'Exportar iCal',    desc: 'Google/Apple Calendar' },
    ],
  },
]

export default function CalendarActionsMenu({ onAction, brandColor = '#E8642A' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(key) {
    setOpen(false)
    onAction(key)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Ações do calendário"
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5 hover:opacity-90"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
          boxShadow: `0 2px 8px ${brandColor}40`,
        }}
      >
        ✨ Ações <span className="opacity-70">▾</span>
      </button>

      {open && (
        <div className="drop-enter absolute right-0 top-full mt-2 rounded-xl border shadow-2xl z-50 min-w-[280px] overflow-hidden"
          style={{ backgroundColor: '#13131d', borderColor: '#2a2a38' }}>
          {GROUPS.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? 'border-t' : ''} style={{ borderColor: '#1e1e2a' }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] px-3 pt-2.5 pb-1.5"
                style={{ color: '#3a3a4a' }}>
                {group.title}
              </p>
              {group.items.map(item => (
                <button key={item.key} onClick={() => pick(item.key)}
                  className="w-full flex items-start gap-3 px-3 py-2 text-left transition-colors"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffffff08'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                  <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium leading-tight">{item.label}</p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: '#555568' }}>{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
