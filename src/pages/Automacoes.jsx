import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useClient } from '../contexts/ClientContext'

const STATUS = {
  planejada:     { label: 'Planejada',     color: '#6b7280' },
  em_construcao: { label: 'Em construção', color: '#f59e0b' },
  ativa:         { label: 'Ativa',         color: '#10b981' },
  pausada:       { label: 'Pausada',       color: '#ef4444' },
}
const GATILHOS = ['Evento', 'Custom', 'Turno', 'Journey', 'Campanha', 'API', 'Manual']

const S = {
  bg: '#13131f', card: '#17171f', panel: '#111118',
  border: '#1e1e2a', ib: '#2a2a38',
  input: '#0c0c10', muted: '#555568', faint: '#444455',
}

const EMPTY = {
  nome: '', fluxo: '', canal: 'Email', momento: '', gatilho: 'Evento',
  status_automacao: 'planejada',
  assunto: '', preheader: '', texto_hero: '', texto_corpo: '', cta: '',
  notas_cliente: '', pendencias: '',
}

/* ── 25 fluxos / ~80 réguas ── */
const AUTOMATION_TEMPLATES = [
  // 1. Boas-vindas Pós-1ª Compra
  { fluxo: 'Boas-vindas Pós-1ª Compra', nome: 'Email 1 — Confirmação + boas-vindas',      canal: 'Email',    momento: 'D+0 — imediato',       gatilho: 'Evento' },
  { fluxo: 'Boas-vindas Pós-1ª Compra', nome: 'WhatsApp 1 — Boas-vindas calorosas',        canal: 'WhatsApp', momento: 'D+1 — 10h',            gatilho: 'Evento' },
  { fluxo: 'Boas-vindas Pós-1ª Compra', nome: 'Email 2 — História da marca + conteúdo',    canal: 'Email',    momento: 'D+3 — 10h',            gatilho: 'Journey' },
  { fluxo: 'Boas-vindas Pós-1ª Compra', nome: 'Email 3 — Convite para programa / clube',   canal: 'Email',    momento: 'D+7 — 10h',            gatilho: 'Journey' },

  // 2. Abandono de Carrinho
  { fluxo: 'Abandono de Carrinho', nome: 'Email 1 — Lembrete do carrinho',                 canal: 'Email',    momento: '1h após abandono',      gatilho: 'Evento' },
  { fluxo: 'Abandono de Carrinho', nome: 'WhatsApp 1 — Urgência carrinho',                 canal: 'WhatsApp', momento: '4h após abandono',      gatilho: 'Evento' },
  { fluxo: 'Abandono de Carrinho', nome: 'Email 2 — Última chance + incentivo',            canal: 'Email',    momento: '24h após abandono',     gatilho: 'Journey' },

  // 3. Abandono de Checkout
  { fluxo: 'Abandono de Checkout', nome: 'Email 1 — Recuperação imediata',                 canal: 'Email',    momento: '30min após abandono',   gatilho: 'Evento' },
  { fluxo: 'Abandono de Checkout', nome: 'WhatsApp 1 — Finalize seu pedido',               canal: 'WhatsApp', momento: '3h após abandono',      gatilho: 'Evento' },
  { fluxo: 'Abandono de Checkout', nome: 'Email 2 — Última chance + cupom',                canal: 'Email',    momento: '24h após abandono',     gatilho: 'Journey' },

  // 4. Abandono de Navegação
  { fluxo: 'Abandono de Navegação', nome: 'Email 1 — Produto que você viu',                canal: 'Email',    momento: '2h após visualização',  gatilho: 'Evento' },
  { fluxo: 'Abandono de Navegação', nome: 'WhatsApp 1 — Retorne e compre',                 canal: 'WhatsApp', momento: '24h após visualização', gatilho: 'Journey' },

  // 5. Pós-compra / NPS
  { fluxo: 'Pós-compra / NPS', nome: 'Email 1 — Pedido confirmado + rastreio',             canal: 'Email',    momento: 'D+1 — 10h',            gatilho: 'Evento' },
  { fluxo: 'Pós-compra / NPS', nome: 'Email 2 — Pós-entrega + NPS',                        canal: 'Email',    momento: 'D+7 — 10h',            gatilho: 'Journey' },
  { fluxo: 'Pós-compra / NPS', nome: 'WhatsApp 1 — Avaliação do produto',                  canal: 'WhatsApp', momento: 'D+10 — 11h',           gatilho: 'Journey' },
  { fluxo: 'Pós-compra / NPS', nome: 'Email 3 — Incentivo próxima compra',                 canal: 'Email',    momento: 'D+20 — 10h',           gatilho: 'Journey' },

  // 6. Recompra Inteligente
  { fluxo: 'Recompra Inteligente', nome: 'Email 1 — Antecipação recompra',                 canal: 'Email',    momento: 'D-5 previsto',          gatilho: 'Custom' },
  { fluxo: 'Recompra Inteligente', nome: 'WhatsApp 1 — Lembrete recompra',                  canal: 'WhatsApp', momento: 'D previsto — 10h',      gatilho: 'Custom' },
  { fluxo: 'Recompra Inteligente', nome: 'Email 2 — Última chamada + incentivo',            canal: 'Email',    momento: 'D+5 previsto',          gatilho: 'Journey' },

  // 7. Win-back — Inativos 90 dias
  { fluxo: 'Win-back — Inativos 90d', nome: 'Email 1 — Sentimos sua falta',                canal: 'Email',    momento: 'D+90 sem compra',       gatilho: 'Custom' },
  { fluxo: 'Win-back — Inativos 90d', nome: 'WhatsApp 1 — Oferta exclusiva retorno',       canal: 'WhatsApp', momento: 'D+97 sem compra',       gatilho: 'Journey' },
  { fluxo: 'Win-back — Inativos 90d', nome: 'Email 2 — Cupom agressivo',                   canal: 'Email',    momento: 'D+104 sem compra',      gatilho: 'Journey' },
  { fluxo: 'Win-back — Inativos 90d', nome: 'Email 3 — Reativação final',                  canal: 'Email',    momento: 'D+120 sem compra',      gatilho: 'Journey' },

  // 8. Win-back — Inativos 180 dias
  { fluxo: 'Win-back — Inativos 180d', nome: 'Email 1 — Despedida / oferta derradeira',    canal: 'Email',    momento: 'D+180 sem compra',      gatilho: 'Custom' },
  { fluxo: 'Win-back — Inativos 180d', nome: 'WhatsApp 1 — Última chance',                 canal: 'WhatsApp', momento: 'D+187 sem compra',      gatilho: 'Journey' },

  // 9. Aniversário
  { fluxo: 'Aniversário', nome: 'Email 1 — Teaser 7 dias antes',                           canal: 'Email',    momento: '7d antes aniversário',  gatilho: 'Turno' },
  { fluxo: 'Aniversário', nome: 'Email 2 — Presente de aniversário',                        canal: 'Email',    momento: 'Dia do aniversário — 8h', gatilho: 'Turno' },
  { fluxo: 'Aniversário', nome: 'WhatsApp 1 — Parabéns + cupom',                            canal: 'WhatsApp', momento: 'Dia do aniversário — 9h', gatilho: 'Turno' },

  // 10. Clientes VIP
  { fluxo: 'Clientes VIP', nome: 'Email 1 — Boas-vindas ao clube VIP',                     canal: 'Email',    momento: 'Ao atingir status VIP', gatilho: 'Custom' },
  { fluxo: 'Clientes VIP', nome: 'Email 2 — Acesso antecipado + novidades',                 canal: 'Email',    momento: 'Mensal — dia 1 — 10h',  gatilho: 'Turno' },
  { fluxo: 'Clientes VIP', nome: 'WhatsApp 1 — Benefícios exclusivos',                      canal: 'WhatsApp', momento: 'Mensal — dia 15 — 10h', gatilho: 'Turno' },

  // 11. Cashback
  { fluxo: 'Cashback', nome: 'Email 1 — Notificação de cashback gerado',                   canal: 'Email',    momento: 'Ao gerar cashback',     gatilho: 'Evento' },
  { fluxo: 'Cashback', nome: 'WhatsApp 1 — Lembrete 7d antes expirar',                      canal: 'WhatsApp', momento: '7d antes expirar',      gatilho: 'Turno' },
  { fluxo: 'Cashback', nome: 'Email 2 — Urgência expiração cashback',                       canal: 'Email',    momento: '2d antes expirar',      gatilho: 'Journey' },

  // 12. Clube / Assinatura
  { fluxo: 'Clube / Assinatura', nome: 'Email 1 — Boas-vindas assinante',                  canal: 'Email',    momento: 'Ao assinar — imediato', gatilho: 'Evento' },
  { fluxo: 'Clube / Assinatura', nome: 'Email 2 — Lembrete renovação',                      canal: 'Email',    momento: '5d antes renovação',    gatilho: 'Turno' },
  { fluxo: 'Clube / Assinatura', nome: 'WhatsApp 1 — Confirmação renovação',                canal: 'WhatsApp', momento: 'Dia da renovação — 9h', gatilho: 'Turno' },

  // 13. Alerta de Promoção / Flash Sale
  { fluxo: 'Alerta de Promoção', nome: 'Email 1 — Oferta especial ativada',                canal: 'Email',    momento: 'Início da promo',       gatilho: 'Campanha' },
  { fluxo: 'Alerta de Promoção', nome: 'WhatsApp 1 — Urgência — últimas horas',             canal: 'WhatsApp', momento: '24h antes do fim',      gatilho: 'Campanha' },

  // 14. Back in Stock
  { fluxo: 'Back in Stock', nome: 'Email 1 — Produto de volta',                            canal: 'Email',    momento: 'Produto disponível',    gatilho: 'Evento' },
  { fluxo: 'Back in Stock', nome: 'WhatsApp 1 — Corra, estoque limitado',                   canal: 'WhatsApp', momento: '2h após reabastecimento', gatilho: 'Journey' },

  // 15. Cross-sell / Upsell
  { fluxo: 'Cross-sell / Upsell', nome: 'Email 1 — Complemente sua compra',                canal: 'Email',    momento: 'D+3 pós-compra',        gatilho: 'Journey' },
  { fluxo: 'Cross-sell / Upsell', nome: 'WhatsApp 1 — Sugestão personalizada',              canal: 'WhatsApp', momento: 'D+7 pós-compra',        gatilho: 'Journey' },
  { fluxo: 'Cross-sell / Upsell', nome: 'Email 2 — Kit completo / bundle',                  canal: 'Email',    momento: 'D+14 pós-compra',       gatilho: 'Journey' },

  // 16. Pré-lançamento
  { fluxo: 'Pré-lançamento', nome: 'Email 1 — Teaser — algo vem aí',                       canal: 'Email',    momento: '15d antes lançamento',  gatilho: 'Campanha' },
  { fluxo: 'Pré-lançamento', nome: 'Email 2 — Contagem regressiva',                         canal: 'Email',    momento: '7d antes lançamento',   gatilho: 'Campanha' },
  { fluxo: 'Pré-lançamento', nome: 'WhatsApp 1 — Amanhã é o dia',                           canal: 'WhatsApp', momento: '1d antes lançamento',   gatilho: 'Campanha' },
  { fluxo: 'Pré-lançamento', nome: 'Email 3 — Produto lançado — acesse agora',              canal: 'Email',    momento: 'Dia do lançamento — 8h', gatilho: 'Campanha' },

  // 17. Pós-review
  { fluxo: 'Pós-review', nome: 'Email 1 — Obrigado pela avaliação positiva',               canal: 'Email',    momento: 'Ao receber review 4-5★', gatilho: 'Evento' },
  { fluxo: 'Pós-review', nome: 'WhatsApp 1 — Resolução review negativo',                    canal: 'WhatsApp', momento: 'Ao receber review 1-3★', gatilho: 'Evento' },

  // 18. Expiração de Cupom
  { fluxo: 'Expiração de Cupom', nome: 'Email 1 — Seu cupom expira em breve',              canal: 'Email',    momento: '3d antes expirar',      gatilho: 'Turno' },
  { fluxo: 'Expiração de Cupom', nome: 'WhatsApp 1 — Urgência — cupom expira amanhã',       canal: 'WhatsApp', momento: '1d antes expirar',      gatilho: 'Turno' },

  // 19. Recuperação de Boleto
  { fluxo: 'Recuperação de Boleto', nome: 'WhatsApp 1 — Boleto gerado, pague agora',       canal: 'WhatsApp', momento: '2h após emissão',       gatilho: 'Evento' },
  { fluxo: 'Recuperação de Boleto', nome: 'Email 1 — Seu boleto vence em breve',            canal: 'Email',    momento: '24h após emissão',      gatilho: 'Journey' },
  { fluxo: 'Recuperação de Boleto', nome: 'WhatsApp 2 — Última chance — boleto vence hoje', canal: 'WhatsApp', momento: '48h após emissão',      gatilho: 'Journey' },

  // 20. Programa de Indicação
  { fluxo: 'Programa de Indicação', nome: 'Email 1 — Convite para indicar amigos',         canal: 'Email',    momento: 'D+15 pós-2ª compra',    gatilho: 'Custom' },
  { fluxo: 'Programa de Indicação', nome: 'Email 2 — Indicação realizada — obrigado',       canal: 'Email',    momento: 'Ao indicar — imediato', gatilho: 'Evento' },
  { fluxo: 'Programa de Indicação', nome: 'Email 3 — Amigo comprou — sua recompensa',       canal: 'Email',    momento: 'Ao indicado comprar',   gatilho: 'Evento' },

  // 21. Sequência de Nutrição (leads sem compra)
  { fluxo: 'Nutrição de Leads', nome: 'Email 1 — Conteúdo educacional',                    canal: 'Email',    momento: 'D+3 sem compra',        gatilho: 'Journey' },
  { fluxo: 'Nutrição de Leads', nome: 'Email 2 — Prova social + depoimentos',               canal: 'Email',    momento: 'D+7 sem compra',        gatilho: 'Journey' },
  { fluxo: 'Nutrição de Leads', nome: 'Email 3 — Oferta especial para primeiro pedido',     canal: 'Email',    momento: 'D+14 sem compra',       gatilho: 'Journey' },
  { fluxo: 'Nutrição de Leads', nome: 'WhatsApp 1 — Fale com nosso time',                   canal: 'WhatsApp', momento: 'D+21 sem compra',       gatilho: 'Journey' },

  // 22. Datas Comemorativas
  { fluxo: 'Datas Comemorativas', nome: 'Email 1 — Antecipação de data',                   canal: 'Email',    momento: '7d antes da data',      gatilho: 'Campanha' },
  { fluxo: 'Datas Comemorativas', nome: 'WhatsApp 1 — Urgência — poucos dias',              canal: 'WhatsApp', momento: '3d antes da data',      gatilho: 'Campanha' },
  { fluxo: 'Datas Comemorativas', nome: 'Email 2 — Última chance',                          canal: 'Email',    momento: '1d antes da data',      gatilho: 'Campanha' },

  // 23. Reengajamento de Base Fria
  { fluxo: 'Reengajamento de Base', nome: 'Email 1 — Pesquisa de preferência',             canal: 'Email',    momento: 'Seleção manual de lista', gatilho: 'Campanha' },
  { fluxo: 'Reengajamento de Base', nome: 'WhatsApp 1 — Novidades que você vai amar',       canal: 'WhatsApp', momento: '3d após pesquisa',       gatilho: 'Journey' },
  { fluxo: 'Reengajamento de Base', nome: 'Email 2 — Oferta personalizada',                 canal: 'Email',    momento: '7d após pesquisa',       gatilho: 'Journey' },

  // 24. Downsell
  { fluxo: 'Downsell', nome: 'Email 1 — Alternativa de entrada',                           canal: 'Email',    momento: 'Ao recusar oferta',     gatilho: 'Evento' },
  { fluxo: 'Downsell', nome: 'WhatsApp 1 — Nova proposta mais acessível',                   canal: 'WhatsApp', momento: '2d após recusa',        gatilho: 'Journey' },
  { fluxo: 'Downsell', nome: 'Email 2 — Produto de entrada / kit menor',                    canal: 'Email',    momento: '5d após recusa',        gatilho: 'Journey' },

  // 25. Programa de Fidelidade / Pontos
  { fluxo: 'Programa de Fidelidade', nome: 'Email 1 — Parabéns, você subiu de nível',      canal: 'Email',    momento: 'Ao atingir novo nível', gatilho: 'Custom' },
  { fluxo: 'Programa de Fidelidade', nome: 'Email 2 — Extrato de pontos mensal',            canal: 'Email',    momento: 'Mensal — dia 1 — 10h',  gatilho: 'Turno' },
  { fluxo: 'Programa de Fidelidade', nome: 'WhatsApp 1 — Use seus pontos antes de expirar', canal: 'WhatsApp', momento: '5d antes expirar pts',  gatilho: 'Turno' },
].map((t, i) => ({
  ...EMPTY,
  ...t,
  template_key: `tpl_${i + 1}`,
}))

/* ── small atoms ── */
function CanalBadge({ canal }) {
  const isEmail = canal === 'Email'
  const isWpp = canal === 'WhatsApp'
  const isBoth = !isEmail && !isWpp

  if (isBoth) return (
    <div className="flex gap-0.5">
      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ backgroundColor: '#1e3a5f30', color: '#60a5fa', border: '1px solid #60a5fa30' }}>E</span>
      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ backgroundColor: '#12502430', color: '#25d366', border: '1px solid #25d36630' }}>W</span>
    </div>
  )
  return (
    <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
      style={isEmail
        ? { backgroundColor: '#1e3a5f30', color: '#60a5fa', border: '1px solid #60a5fa30' }
        : { backgroundColor: '#12502430', color: '#25d366', border: '1px solid #25d36630' }}>
      {isEmail ? 'E' : 'W'}
    </span>
  )
}

function GatilhoBadge({ gatilho }) {
  const map = {
    Evento:   '#818cf8', Custom:   '#4ade80', Turno:    '#fb923c',
    Journey:  '#a78bfa', Campanha: '#f87171', API:      '#38bdf8', Manual: '#9ca3af',
  }
  const color = map[gatilho] || '#9ca3af'
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ backgroundColor: color + '18', color }}>
      {gatilho || 'Evento'}
    </span>
  )
}

function StatusDot({ value, onChange }) {
  const keys = Object.keys(STATUS)
  const conf = STATUS[value] || STATUS.planejada
  return (
    <button onClick={e => { e.stopPropagation(); onChange(keys[(keys.indexOf(value) + 1) % keys.length]) }}
      title={conf.label}
      className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
      style={{ backgroundColor: conf.color + '20', border: `1px solid ${conf.color}50` }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.color }} />
    </button>
  )
}

function ScriptIcon({ hasScript, brandColor, onClick }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick() }} title="Ver/editar script"
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
      style={hasScript
        ? { backgroundColor: brandColor + '20', color: brandColor, border: `1px solid ${brandColor}40` }
        : { backgroundColor: S.border, color: S.faint, border: `1px solid ${S.ib}` }}>
      <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
        <rect x="1" y="0.5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M3.5 4h5M3.5 6.5h5M3.5 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

/* ── table row ── */
function AutoRow({ msg, brandColor, onEdit, onStatusChange, onScript }) {
  const hasScript = !!(msg.assunto || msg.texto_corpo || msg.cta)
  return (
    <div className="flex items-center border-t group" style={{ borderColor: S.border }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#111118'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>

      <div className="w-48 shrink-0 px-4 py-2.5 cursor-pointer" onClick={onEdit}>
        <p className="text-sm text-white font-medium truncate leading-tight">
          {msg.momento || <span style={{ color: S.faint, fontSize: '10px' }}>sem momento</span>}
        </p>
        {msg.nome && <p className="text-[10px] truncate mt-0.5" style={{ color: S.muted }}>{msg.nome}</p>}
      </div>

      <div className="w-14 shrink-0 px-2 py-2.5 flex justify-center">
        <CanalBadge canal={msg.canal} />
      </div>

      <div className="w-24 shrink-0 px-2 py-2.5">
        <GatilhoBadge gatilho={msg.gatilho} />
      </div>

      <div className="flex-1 min-w-0 px-4 py-2.5">
        {msg.assunto ? (
          <div className="flex items-start gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: brandColor + '80' }} />
            <div className="min-w-0">
              <p className="text-sm text-white truncate leading-tight">{msg.assunto}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: S.muted }}>
                {msg.fluxo}{msg.nome ? ` · ${msg.nome}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <button onClick={onScript} className="text-xs hover:opacity-80 transition-opacity" style={{ color: S.faint }}>
            Sem script — adicionar →
          </button>
        )}
      </div>

      <div className="w-16 shrink-0 px-2 py-2.5 flex justify-center">
        <ScriptIcon hasScript={hasScript} brandColor={brandColor} onClick={onScript} />
      </div>

      <div className="w-16 shrink-0 px-2 py-2.5 flex justify-center">
        <StatusDot value={msg.status_automacao} onChange={onStatusChange} />
      </div>
    </div>
  )
}

/* ── fluxo section ── */
function FluxoSection({ name, msgs, brandColor, onNewRow, onEdit, onStatusChange, onScript }) {
  const [open, setOpen] = useState(true)
  const activeCount = msgs.filter(m => m.status_automacao === 'ativa').length
  const pct = msgs.length > 0 ? Math.round(activeCount / msgs.length * 100) : 0
  const pctColor = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6b7280'

  return (
    <div className="rounded-xl border overflow-hidden mb-3" style={{ borderColor: S.border }}>
      <div className="flex items-center gap-3 px-4 py-3 select-none cursor-pointer transition-colors"
        style={{ backgroundColor: S.panel }}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#151520'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = S.panel}>
        <span className="text-[10px] w-3 shrink-0" style={{ color: S.faint }}>{open ? '▲' : '▼'}</span>
        <span className="text-xs font-bold uppercase tracking-widest flex-1" style={{ color: '#9898b0' }}>{name}</span>
        <div className="flex items-center gap-3">
          <div className="w-28 h-1 rounded-full overflow-hidden" style={{ backgroundColor: S.ib }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: pctColor }} />
          </div>
          <span className="text-xs font-bold w-9 text-right" style={{ color: pctColor }}>{pct}%</span>
          <span className="text-[11px] w-12 text-right" style={{ color: S.faint }}>{activeCount}/{msgs.length}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onNewRow(name) }}
          className="w-6 h-6 rounded flex items-center justify-center text-sm transition-all hover:opacity-80 ml-1"
          style={{ backgroundColor: S.ib, color: S.muted }}>+</button>
      </div>

      {open && (
        <>
          <div className="flex items-center border-t border-b"
            style={{ backgroundColor: '#0c0c14', borderColor: S.border }}>
            <div className="w-48 shrink-0 px-4 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Momento</span>
            </div>
            <div className="w-14 shrink-0 px-2 py-1.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Canal</span>
            </div>
            <div className="w-24 shrink-0 px-2 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Gatilho</span>
            </div>
            <div className="flex-1 px-4 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Comunicação</span>
            </div>
            <div className="w-16 shrink-0 px-2 py-1.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Script</span>
            </div>
            <div className="w-16 shrink-0 px-2 py-1.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>Status</span>
            </div>
          </div>

          {msgs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs" style={{ color: S.faint }}>Nenhuma mensagem. Clique em + para adicionar.</p>
            </div>
          ) : msgs.map(msg => (
            <AutoRow key={msg.id} msg={msg} brandColor={brandColor}
              onEdit={() => onEdit(msg)}
              onStatusChange={v => onStatusChange(msg.id, v)}
              onScript={() => onScript(msg)} />
          ))}

          <div className="border-t" style={{ borderColor: S.border }}>
            <button onClick={() => onNewRow(name)}
              className="w-full py-2.5 text-xs flex items-center justify-center gap-1.5 transition-colors"
              style={{ color: S.faint }}
              onMouseEnter={e => e.currentTarget.style.color = S.muted}
              onMouseLeave={e => e.currentTarget.style.color = S.faint}>
              + Adicionar linha
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── row modal (info fields) ── */
function RowModal({ msg, allFluxos, brandColor, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY, ...msg })
  const [saving, setSaving] = useState(false)
  function f(k, v) { setForm(p => ({ ...p, [k]: v })) }
  async function save() {
    if (!form.nome) return
    setSaving(true); await onSave(form); setSaving(false)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl border w-full max-w-lg flex flex-col modal-panel"
        style={{ backgroundColor: S.card, borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.7)', maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: S.ib }}>
          <p className="text-white font-bold">{msg.id ? 'Editar régua' : 'Nova régua'}</p>
          <button onClick={onClose} className="text-[#555568] hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MField label="Fluxo">
              <MInput value={form.fluxo} onChange={v => f('fluxo', v)}
                placeholder="Ex: Onboarding Pós-1ª Compra" brandColor={brandColor} list="fluxo-opts" />
              <datalist id="fluxo-opts">{allFluxos.map(x => <option key={x} value={x} />)}</datalist>
            </MField>
            <MField label="Nome da comunicação">
              <MInput value={form.nome} onChange={v => f('nome', v)}
                placeholder="Ex: Email 1 — Boas-vindas" brandColor={brandColor} />
            </MField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Momento / Timing">
              <MInput value={form.momento} onChange={v => f('momento', v)}
                placeholder="Ex: D+0, D+3 — 10h" brandColor={brandColor} />
            </MField>
            <MField label="Gatilho">
              <select value={form.gatilho || 'Evento'} onChange={e => f('gatilho', e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none transition-all"
                style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}>
                {GATILHOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </MField>
          </div>
          <MField label="Canal">
            <div className="flex gap-2">
              {[{ k: 'Email', l: '✉ Email' }, { k: 'WhatsApp', l: '📱 WhatsApp' }].map(o => (
                <button key={o.k} onClick={() => f('canal', o.k)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
                  style={form.canal === o.k
                    ? { backgroundColor: brandColor, borderColor: brandColor, color: '#fff' }
                    : { borderColor: S.ib, color: S.muted }}>
                  {o.l}
                </button>
              ))}
            </div>
          </MField>
          <MField label="Status">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS).map(([key, conf]) => (
                <button key={key} onClick={() => f('status_automacao', key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={form.status_automacao === key
                    ? { backgroundColor: conf.color, borderColor: conf.color, color: '#fff' }
                    : { borderColor: S.ib, color: S.muted }}>
                  {conf.label}
                </button>
              ))}
            </div>
          </MField>
          <MField label="Pendências / O que falta">
            <MTextarea value={form.pendencias || ''} onChange={v => f('pendencias', v)}
              placeholder="Ex: Aprovação do cliente, setup na plataforma, criar segmento…"
              rows={2} brandColor={brandColor} />
          </MField>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0" style={{ borderColor: S.ib }}>
          <div>{msg.id && <button onClick={() => onDelete(msg.id)} className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors">Excluir</button>}</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors" style={{ borderColor: S.ib, color: S.muted }}>Cancelar</button>
            <button onClick={save} disabled={saving || !form.nome}
              className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: brandColor }}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── script modal ── */
function ScriptModal({ msg, brandColor, onClose, onSave }) {
  const [form, setForm] = useState({ ...msg })
  const [saving, setSaving] = useState(false)
  function f(k, v) { setForm(p => ({ ...p, [k]: v })) }
  async function save() { setSaving(true); await onSave(form); setSaving(false) }
  const isEmail = form.canal !== 'WhatsApp'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl border w-full max-w-2xl max-h-[92vh] flex flex-col modal-panel"
        style={{ backgroundColor: S.card, borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: S.ib }}>
          <div>
            <p className="text-white font-bold text-sm">{form.nome || 'Script'}</p>
            <p className="text-[11px] mt-0.5" style={{ color: S.muted }}>
              {form.fluxo}{form.momento ? ` · ${form.momento}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-[#555568] hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: S.ib }}>
            <div className="px-4 py-2.5 border-b" style={{ backgroundColor: '#0e0e18', borderColor: S.ib }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: S.faint }}>
                {isEmail ? '✉ Script do Email' : '📱 Script do WhatsApp'}
              </p>
            </div>
            <div className="p-4 space-y-4" style={{ backgroundColor: '#0a0a12' }}>
              {isEmail && (
                <>
                  <MField label="Assunto">
                    <MInput value={form.assunto} onChange={v => f('assunto', v)}
                      placeholder='"[firstname], você vai adorar isso"' brandColor={brandColor} />
                  </MField>
                  <MField label="Pré-header">
                    <MInput value={form.preheader} onChange={v => f('preheader', v)}
                      placeholder="Complementa o assunto no inbox" brandColor={brandColor} />
                  </MField>
                  <MField label="Texto Hero">
                    <MTextarea value={form.texto_hero} onChange={v => f('texto_hero', v)}
                      placeholder="Headline principal" rows={2} brandColor={brandColor} />
                  </MField>
                </>
              )}
              <MField label="Corpo">
                <MTextarea value={form.texto_corpo} onChange={v => f('texto_corpo', v)}
                  placeholder="Corpo da mensagem…" rows={5} brandColor={brandColor} />
              </MField>
              <MField label="CTA">
                <MInput value={form.cta} onChange={v => f('cta', v)}
                  placeholder="Ex: Compre agora com 10% off" brandColor={brandColor} />
              </MField>
            </div>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#2a1f10' }}>
            <div className="px-4 py-2.5 border-b" style={{ backgroundColor: '#120f08', borderColor: '#2a1f10' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6a5025' }}>
                📋 O que preciso do cliente?
              </p>
            </div>
            <div className="p-4" style={{ backgroundColor: '#0e0b06' }}>
              <MTextarea value={form.notas_cliente} onChange={v => f('notas_cliente', v)}
                placeholder="Ex: Aprovação do layout, fotos do produto, lista de SKUs…"
                rows={3} brandColor={brandColor} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: S.ib }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors" style={{ borderColor: S.ib, color: S.muted }}>Cancelar</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: brandColor }}>
            {saving ? 'Salvando…' : 'Salvar script'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── helpers ── */
function MField({ label, children }) {
  return <div><label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: S.faint }}>{label}</label>{children}</div>
}
function MInput({ value, onChange, placeholder, brandColor, list }) {
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} list={list}
    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none transition-all"
    style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
    onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
    onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }} />
}
function MTextarea({ value, onChange, placeholder, rows = 3, brandColor }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none transition-all"
    style={{ backgroundColor: S.input, border: `1px solid ${S.ib}`, color: '#fff' }}
    onFocus={e => { e.target.style.borderColor = brandColor; e.target.style.boxShadow = `0 0 0 3px ${brandColor}18` }}
    onBlur={e => { e.target.style.borderColor = S.ib; e.target.style.boxShadow = '' }} />
}

/* ── seed confirm modal ── */
function SeedModal({ brandColor, onConfirm, onClose, seeding }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget && !seeding) onClose() }}>
      <div className="rounded-2xl border w-full max-w-md p-8 text-center modal-panel"
        style={{ backgroundColor: S.card, borderColor: S.ib, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl"
          style={{ backgroundColor: brandColor + '18', border: `1px solid ${brandColor}30` }}>⚡</div>
        <h2 className="text-white font-bold text-lg mb-2">Inicializar {AUTOMATION_TEMPLATES.length} Réguas</h2>
        <p className="text-sm mb-1" style={{ color: S.muted }}>
          Serão criados <strong className="text-white">25 fluxos</strong> com <strong className="text-white">{AUTOMATION_TEMPLATES.length} réguas</strong> pré-configuradas
          para este cliente.
        </p>
        <p className="text-xs mb-6" style={{ color: S.faint }}>
          Todos começam com status <span style={{ color: '#6b7280' }}>Planejada</span>. Você atualiza conforme implanta.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={seeding}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-40"
            style={{ borderColor: S.ib, color: S.muted }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={seeding}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 hover:opacity-90"
            style={{ backgroundColor: brandColor }}>
            {seeding ? 'Criando…' : '🚀 Inicializar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── main ── */
function AutoContent() {
  const { client, brandColor } = useClient()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState('Geral')
  const [rowModal, setRowModal]       = useState(null)
  const [scriptModal, setScriptModal] = useState(null)
  const [showSeed, setShowSeed]       = useState(false)
  const [seeding, setSeeding]         = useState(false)

  const load = useCallback(async () => {
    if (!client) return
    setLoading(true)
    const { data } = await supabase.from('automacoes').select('*')
      .eq('client_id', client.id).order('created_at')
    setList(data || [])
    setLoading(false)
  }, [client])

  useEffect(() => { load() }, [load])

  async function seedTemplates() {
    if (!client) return
    setSeeding(true)
    const rows = AUTOMATION_TEMPLATES.map(t => ({ ...t, client_id: client.id }))
    // Insert in batches of 20 to avoid payload limits
    for (let i = 0; i < rows.length; i += 20) {
      await supabase.from('automacoes').insert(rows.slice(i, i + 20))
    }
    setShowSeed(false)
    setSeeding(false)
    await load()
  }

  const allFluxos = [...new Set(list.map(a => a.fluxo || 'Sem fluxo'))]
  const filtered  = channel === 'Geral' ? list : list.filter(a => a.canal === channel)
  const grouped   = filtered.reduce((acc, a) => {
    const k = a.fluxo || 'Sem fluxo'
    ;(acc[k] = acc[k] || []).push(a)
    return acc
  }, {})

  const total  = list.length
  const ativas = list.filter(a => a.status_automacao === 'ativa').length
  const pend   = list.filter(a => a.status_automacao !== 'ativa').length
  const pct    = total > 0 ? Math.round(ativas / total * 100) : 0

  async function saveRow(form) {
    if (!client || !form.nome) return
    const p = { client_id: client.id, ...form }
    if (form.id) await supabase.from('automacoes').update(p).eq('id', form.id)
    else          await supabase.from('automacoes').insert(p)
    setRowModal(null); await load()
  }

  async function saveScript(form) {
    const { assunto, preheader, texto_hero, texto_corpo, cta, notas_cliente } = form
    await supabase.from('automacoes').update({ assunto, preheader, texto_hero, texto_corpo, cta, notas_cliente }).eq('id', form.id)
    setScriptModal(null); await load()
  }

  async function statusChange(id, newStatus) {
    await supabase.from('automacoes').update({ status_automacao: newStatus }).eq('id', id)
    setList(l => l.map(a => a.id === id ? { ...a, status_automacao: newStatus } : a))
  }

  async function del(id) {
    if (!window.confirm('Excluir esta régua?')) return
    await supabase.from('automacoes').delete().eq('id', id)
    setRowModal(null); await load()
  }

  if (!client) return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm" style={{ color: S.muted }}>Selecione um cliente</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Automações CRM</h1>
          <p className="text-sm mt-0.5" style={{ color: S.muted }}>Matriz de réguas automatizadas</p>
        </div>
        <div className="flex items-center gap-2">
          {total === 0 && !loading && (
            <button onClick={() => setShowSeed(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              style={{ backgroundColor: '#1e1e2a', border: `1px solid ${S.ib}` }}>
              ⚡ Inicializar {AUTOMATION_TEMPLATES.length} templates
            </button>
          )}
          <button onClick={() => setRowModal({ ...EMPTY })}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColor }}>
            + Nova régua
          </button>
        </div>
      </div>

      {/* stats */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Réguas',         value: total,    color: '#8b8ba0', bar: false },
            { label: 'Implantadas',    value: ativas,   color: '#10b981', bar: false },
            { label: 'Pendentes',      value: pend,     color: '#f59e0b', bar: false },
            { label: 'CRM Implantado', value: `${pct}%`,color: brandColor, bar: true  },
          ].map((s, i) => (
            <div key={i} className="rounded-xl px-4 py-3 border" style={{ backgroundColor: S.bg, borderColor: S.border }}>
              <p className="font-bold text-2xl leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: S.faint }}>{s.label}</p>
              {s.bar && (
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: S.ib }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: brandColor }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* channel tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl"
        style={{ backgroundColor: '#0c0c10', border: `1px solid ${S.border}` }}>
        {[
          { key: 'Geral',    label: '⚡ Geral'    },
          { key: 'Email',    label: '✉ Email'     },
          { key: 'WhatsApp', label: '📱 WhatsApp' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setChannel(tab.key)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={channel === tab.key ? { backgroundColor: brandColor, color: '#fff' } : { color: S.muted }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* content */}
      {loading ? (
        <p className="text-center py-16 text-sm" style={{ color: S.muted }}>Carregando…</p>
      ) : Object.keys(grouped).length === 0 && total === 0 ? (
        <div className="text-center py-20 rounded-2xl border" style={{ borderColor: S.border, backgroundColor: S.panel }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-4xl"
            style={{ backgroundColor: brandColor + '12', border: `1px solid ${brandColor}20` }}>⚡</div>
          <h2 className="text-white font-bold text-lg mb-2">Nenhuma automação ainda</h2>
          <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: S.muted }}>
            Inicie com os <strong className="text-white">{AUTOMATION_TEMPLATES.length} templates pré-configurados</strong> (25 fluxos)
            ou crie réguas manualmente.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setShowSeed(true)}
              className="px-6 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: brandColor }}>
              🚀 Inicializar {AUTOMATION_TEMPLATES.length} templates
            </button>
            <button onClick={() => setRowModal({ ...EMPTY })}
              className="px-6 py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: S.ib, color: S.muted }}>
              + Manual
            </button>
          </div>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: S.muted }}>Nenhuma mensagem de {channel}.</p>
        </div>
      ) : Object.entries(grouped).map(([fluxoName, msgs]) => (
        <FluxoSection
          key={fluxoName}
          name={fluxoName}
          msgs={msgs}
          brandColor={brandColor}
          onNewRow={fluxo => setRowModal({ ...EMPTY, fluxo })}
          onEdit={row => setRowModal({ ...row })}
          onStatusChange={statusChange}
          onScript={row => setScriptModal({ ...row })}
        />
      ))}

      {rowModal    && <RowModal    msg={rowModal}    allFluxos={allFluxos} brandColor={brandColor} onClose={() => setRowModal(null)}    onSave={saveRow}    onDelete={del} />}
      {scriptModal && <ScriptModal msg={scriptModal} brandColor={brandColor}              onClose={() => setScriptModal(null)} onSave={saveScript} />}
      {showSeed    && <SeedModal   brandColor={brandColor} seeding={seeding} onConfirm={seedTemplates} onClose={() => setShowSeed(false)} />}
    </div>
  )
}

export default function Automacoes() {
  return <AutoContent />
}
