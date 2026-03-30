import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, RadioGroup, CheckboxGroup,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

const SIM_NAO = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
]

const CANAIS_AQUISICAO = [
  { value: 'transacoes', label: 'Transações (novos compradores)' },
  { value: 'popup_site', label: 'Pop-up de captação no site' },
  { value: 'popup_blog', label: 'Pop-up de captação no blog' },
  { value: 'landing_page', label: 'Landing Page + Mídia Paga' },
  { value: 'midia_paga', label: 'Mídia Paga — botão de cadastro nativo' },
  { value: 'gamificacao', label: 'Gamificações (ex: Roleta)' },
  { value: 'indicacoes', label: 'Indicações — MemberGetMember' },
  { value: 'post_instagram', label: 'Post fixado no Instagram + Automação' },
  { value: 'barra_newsletter', label: 'Barra de Newsletter' },
  { value: 'botao_whatsapp', label: 'Botão de WhatsApp' },
]

export default function StepA3_KPIsCaptacao({ answers, onChange, onNext, onBack }) {
  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🎯</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          KPI — Captação
        </span>
      </div>

      <StepTitle>Como está a captação de leads?</StepTitle>
      <StepSubtitle>
        Entender de onde vêm os leads ajuda a definir as melhores estratégias de crescimento.
      </StepSubtitle>

      <FieldGroup>
        <Label>Possuem meta de captação de leads (diária / mensal)?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.meta_captacao}
          onChange={(v) => onChange('meta_captacao', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Quais canais de aquisição de leads estão ativos hoje?</Label>
        <CheckboxGroup
          options={CANAIS_AQUISICAO}
          value={answers.canais_aquisicao || []}
          onChange={(v) => onChange('canais_aquisicao', v)}
        />
      </FieldGroup>

      <div className="mt-6 flex justify-between items-center">
        <BtnSecondary onClick={onBack}>Voltar</BtnSecondary>
        <BtnPrimary onClick={onNext}>Continuar</BtnPrimary>
      </div>
    </StepCard>
  )
}
