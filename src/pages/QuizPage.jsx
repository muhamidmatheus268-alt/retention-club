import { useState, useCallback } from 'react'
import { ProgressBar } from './quiz/components/ui'
import { supabase } from '../lib/supabase'

import StepIntro from './quiz/steps/StepIntro'
import StepHistoricoCheck from './quiz/steps/StepHistoricoCheck'
import StepA1_Historico from './quiz/steps/StepA1_Historico'
import StepA2_Ferramentas from './quiz/steps/StepA2_Ferramentas'
import StepA3_KPIsCaptacao from './quiz/steps/StepA3_KPIsCaptacao'
import StepA4_KPIsEngajamento from './quiz/steps/StepA4_KPIsEngajamento'
import StepA5_KPIsCliques from './quiz/steps/StepA5_KPIsCliques'
import StepA6_Base from './quiz/steps/StepA6_Base'
import StepB1_Contexto from './quiz/steps/StepB1_Contexto'
import StepExpectativas from './quiz/steps/StepExpectativas'
import StepContato from './quiz/steps/StepContato'
import StepObrigado from './quiz/steps/StepObrigado'

// ─── Config ───────────────────────────────────────────────────────────────────
const WEB3FORMS_KEY = '6d70de1f-9c16-4ed7-a939-a649c226182d'
const NOTIFICATION_EMAIL = 'matheusmuhamid@ecommercerocket.com.br'

// ─── Step flow definition ─────────────────────────────────────────────────────
const STEP_FLOW = {
  intro: { next: () => 'historico_check' },
  historico_check: { next: (a) => (a.tem_crm === 'sim' ? 'a_historico' : 'b_contexto') },
  // PATH A
  a_historico: { next: () => 'a_ferramentas' },
  a_ferramentas: { next: () => 'a_kpis_captacao' },
  a_kpis_captacao: { next: () => 'a_kpis_engajamento' },
  a_kpis_engajamento: { next: () => 'a_kpis_cliques' },
  a_kpis_cliques: { next: () => 'a_base' },
  a_base: { next: () => 'expectativas' },
  // PATH B
  b_contexto: { next: () => 'expectativas' },
  // COMMON
  expectativas: { next: () => 'contato' },
  contato: { next: () => 'obrigado' },
  obrigado: { next: null },
}

// ─── Progress calculation ─────────────────────────────────────────────────────
const PATH_A = ['intro','historico_check','a_historico','a_ferramentas','a_kpis_captacao','a_kpis_engajamento','a_kpis_cliques','a_base','expectativas','contato']
const PATH_B = ['intro','historico_check','b_contexto','expectativas','contato']

function getProgress(step, answers) {
  const path = answers.tem_crm === 'nao' ? PATH_B : PATH_A
  const idx = path.indexOf(step)
  const current = idx === -1 ? 1 : idx + 1
  return { current, total: path.length }
}

// ─── Email builder ────────────────────────────────────────────────────────────
function formatEmailBody(answers) {
  const bool = (v) => (v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : v || '—')
  const arr  = (v) => (Array.isArray(v) && v.length > 0 ? v.join(' | ') : '—')
  const txt  = (v) => v?.trim() || '—'
  const line = (label, value) => `${label}: ${value}`
  const sep  = '─────────────────────────────'

  const isPathA = answers.tem_crm === 'sim'

  let body = `
DIAGNÓSTICO CRM — ${txt(answers.empresa).toUpperCase()}
${sep}

📋 DADOS BÁSICOS
${line('Empresa', txt(answers.empresa))}
${line('Responsável', txt(answers.responsavel))}
${line('Segmento', txt(answers.segmento))}
${line('Já trabalhou com CRM', bool(answers.tem_crm))}
`

  if (isPathA) {
    body += `
${sep}
📜 HISTÓRICO
${line('O que fazem para fomentar recompra', txt(answers.fomentacao_recompra))}
${line('Como funciona o pós-venda', txt(answers.pos_venda))}
${line('Canais trabalhados', arr(answers.canais))}
${line('O que foi trabalhado', txt(answers.o_que_trabalhado))}

${sep}
🛠️ FERRAMENTAS & OPERACIONAL
${line('Ferramentas', arr(answers.ferramentas))}${answers.ferramenta_outra ? ` (outra: ${answers.ferramenta_outra})` : ''}
${line('E-mail disparo = SAC', bool(answers.email_disparo_igual_sac))}
${line('Frequência disparos/semana', answers.frequencia_disparos || '—')}
${line('Calendário de CRM', bool(answers.calendario_crm))}
${line('Grupo VIP WhatsApp', bool(answers.grupo_vip_whatsapp))}

${sep}
🎯 KPI — CAPTAÇÃO
${line('Meta de captação de leads', bool(answers.meta_captacao))}
${line('Canais de aquisição ativos', arr(answers.canais_aquisicao))}

${sep}
📬 KPI — ABERTURA & ENTREGA
${line('Linha editorial definida', bool(answers.linha_editorial))}
${line('Padrão de remetente', bool(answers.padrao_remetente))}${answers.padrao_remetente_exemplo ? ` → ${answers.padrao_remetente_exemplo}` : ''}
${line('Fazem Teste A/B', bool(answers.teste_ab))}
${line('Logo no remetente', bool(answers.logo_remetente))}
${line('Reputação de domínio mapeada', bool(answers.reputacao_dominio))}

${sep}
🖱️ KPI — TAXA DE CLIQUES
${line('Padrões de comportamento', arr(answers.padroes_comportamento))}
${line('Variação de temas', txt(answers.variacao_temas))}

${sep}
🗃️ SOBRE A BASE
${line('Tamanho da base', txt(answers.tamanho_base))}
${line('Separação base geral / ativos', bool(answers.separacao_base))}
${line('Limpeza de base já realizada', bool(answers.limpeza_base))}
${line('Leads por mês (média)', answers.leads_mes || '—')}
${line('LP específica para captação', bool(answers.lp_captacao))}
${line('Clusterização existente', bool(answers.clusterizacao))}
${line('Listas adicionais disponíveis', txt(answers.listas_adicionais))}
`
  } else {
    body += `
${sep}
🚀 CONTEXTO — PRIMEIRO CRM
${line('Por que buscou CRM agora', txt(answers.motivo_busca_crm))}
${line('Por que ainda não havia iniciado', txt(answers.motivo_nao_iniciou))}
${line('Configuração técnica existente', bool(answers.configuracao_tecnica))}
`
  }

  body += `
${sep}
🎯 EXPECTATIVAS
${line('Objetivos com CRM', txt(answers.objetivos_crm))}
${line('O que espera do trabalho', txt(answers.expectativa_trabalho))}
${line('Indicador de sucesso', txt(answers.indicador_sucesso))}

${sep}
✉️ CONTATO
${line('Nome', txt(answers.nome_completo))}
${line('E-mail', txt(answers.email))}
${line('WhatsApp', txt(answers.whatsapp))}

${sep}
`
  return body
}

async function sendEmail(answers) {
  const html = formatEmailBody(answers)
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `Novo Diagnóstico CRM — ${answers.empresa || 'sem nome'}`,
      from_name: answers.nome_completo || answers.responsavel || 'Funil CRM',
      email: NOTIFICATION_EMAIL,
      message: html,
    }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || 'Erro ao enviar')
}

async function saveToSupabase(answers) {
  const { empresa, responsavel, email, whatsapp, segmento, tem_crm, ...rest } = answers
  await supabase.from('quiz_respostas').insert({
    empresa: empresa || null,
    responsavel: responsavel || null,
    email: email || null,
    whatsapp: whatsapp || null,
    segmento: segmento || null,
    tem_crm: tem_crm || null,
    answers_json: rest,
  })
}

// ─── QuizPage ──────────────────────────────────────────────────────────────────
export default function QuizPage() {
  const [step, setStep] = useState('intro')
  const [history, setHistory] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)

  const onChange = useCallback((key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }, [])

  const goNext = useCallback(async () => {
    if (step === 'contato') {
      setLoading(true)
      try {
        await sendEmail(answers)
      } catch (e) {
        console.warn('Email error:', e.message)
        // Still proceed — don't block the user
      }
      try {
        await saveToSupabase(answers)
      } catch (e) {
        console.warn('Supabase error:', e.message)
        // Still proceed — don't block the user
      }
      setLoading(false)
    }
    const nextStep = STEP_FLOW[step]?.next(answers)
    if (nextStep) {
      setHistory((h) => [...h, step])
      setStep(nextStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step, answers])

  const goBack = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setStep(prev)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [history])

  const { current, total } = getProgress(step, answers)
  const showProgress = step !== 'intro' && step !== 'obrigado'

  const stepProps = { answers, onChange, onNext: goNext, onBack: goBack }

  return (
    <div className="min-h-screen bg-[#070B14] relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#E8642A]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#E8642A]/4 blur-[100px]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-5 px-6 flex items-center justify-center border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm tracking-tight">
              Retention Club
            </span>
            <span className="text-white/20 text-sm">|</span>
            <span className="text-white/40 text-xs font-medium">
              Diagnóstico CRM
            </span>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-lg">
            {showProgress && (
              <ProgressBar current={current} total={total} />
            )}
            {step === 'intro'              && <StepIntro              {...stepProps} />}
            {step === 'historico_check'    && <StepHistoricoCheck     {...stepProps} />}
            {step === 'a_historico'        && <StepA1_Historico       {...stepProps} />}
            {step === 'a_ferramentas'      && <StepA2_Ferramentas     {...stepProps} />}
            {step === 'a_kpis_captacao'    && <StepA3_KPIsCaptacao    {...stepProps} />}
            {step === 'a_kpis_engajamento' && <StepA4_KPIsEngajamento {...stepProps} />}
            {step === 'a_kpis_cliques'     && <StepA5_KPIsCliques     {...stepProps} />}
            {step === 'a_base'             && <StepA6_Base            {...stepProps} />}
            {step === 'b_contexto'         && <StepB1_Contexto        {...stepProps} />}
            {step === 'expectativas'       && <StepExpectativas       {...stepProps} />}
            {step === 'contato'            && <StepContato            {...stepProps} loading={loading} />}
            {step === 'obrigado'           && <StepObrigado           answers={answers} />}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 text-center">
          <p className="text-white/20 text-xs">
            Retention Club © {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  )
}
