/* Email preview — renders a visual approximation of what the email looks like
   in inbox + open. Shows subject, preheader, from, and a simple body. */

const S = { muted: '#555568', faint: '#333340' }

export default function EmailPreview({ assunto, preheader, texto_hero, texto_corpo, cta, clientName, brandColor = '#E8642A', mode = 'inbox' }) {
  const hasContent = assunto || preheader || texto_hero || texto_corpo

  if (!hasContent) {
    return (
      <div className="rounded-xl border p-5 text-center" style={{ backgroundColor: '#0c0c10', borderColor: '#1e1e2a' }}>
        <p className="text-xs" style={{ color: S.muted }}>
          Preencha o email para ver o preview visual
        </p>
      </div>
    )
  }

  if (mode === 'inbox') {
    return (
      <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: '#fff', borderColor: '#2a2a38' }}>
        <div className="px-4 py-2 border-b flex items-center gap-2" style={{ backgroundColor: '#f5f5f5', borderColor: '#e5e7eb' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brandColor }} />
          <span className="text-[11px] font-semibold" style={{ color: '#111' }}>Inbox preview</span>
          <span className="text-[10px] ml-auto" style={{ color: '#999' }}>agora mesmo</span>
        </div>
        <div className="px-4 py-3 flex gap-3">
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: brandColor }}>
            {(clientName || 'M').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold" style={{ color: '#111' }}>{clientName || 'Marca'}</span>
              <span className="text-[10px]" style={{ color: '#999' }}>• para você</span>
            </div>
            <p className="text-sm font-semibold leading-snug" style={{ color: '#111' }}>
              {assunto || <span style={{ color: '#bbb' }}>[Sem assunto]</span>}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#666' }}>
              {preheader || <span style={{ color: '#bbb' }}>[Sem preheader]</span>}
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* full mode — renders the email body */
  return (
    <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: '#fff', borderColor: '#2a2a38' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ backgroundColor: '#f5f5f5', borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
            style={{ backgroundColor: brandColor }}>
            {(clientName || 'M').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold truncate" style={{ color: '#111' }}>{assunto || '[Sem assunto]'}</p>
            <p className="text-[10px] truncate" style={{ color: '#666' }}>
              <span className="font-semibold">{clientName || 'Marca'}</span> &lt;contato@{(clientName || 'marca').toLowerCase().replace(/\s+/g, '')}.com&gt;
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6" style={{ backgroundColor: '#fafafa' }}>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #eee' }}>
          {/* Hero bar */}
          <div className="px-6 py-4" style={{ backgroundColor: brandColor, color: '#fff' }}>
            <p className="text-xs font-bold tracking-widest uppercase opacity-80">{clientName || 'Marca'}</p>
          </div>

          {/* Hero text */}
          {texto_hero && (
            <div className="px-6 py-6 text-center">
              <h1 className="font-bold leading-tight" style={{ color: '#111', fontSize: '22px' }}>
                {texto_hero}
              </h1>
            </div>
          )}

          {/* Body */}
          {texto_corpo && (
            <div className="px-6 pb-6 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#333' }}>
              {texto_corpo}
            </div>
          )}

          {/* CTA */}
          {cta && (
            <div className="px-6 pb-6 text-center">
              <button
                className="px-6 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: brandColor, fontSize: '13px' }}>
                {cta}
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 border-t text-[10px] text-center" style={{ borderColor: '#eee', color: '#999' }}>
            Você recebeu porque está na nossa base · <span style={{ textDecoration: 'underline' }}>descadastrar</span>
          </div>
        </div>
      </div>
    </div>
  )
}
