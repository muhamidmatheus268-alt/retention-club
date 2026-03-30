import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, Textarea, RadioGroup,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

const CONFIG_OPCOES = [
  { value: 'sim', label: 'Sim, já há alguma configuração técnica' },
  { value: 'nao', label: 'Não, trabalharemos do zero' },
]

export default function StepB1_Contexto({ answers, onChange, onNext, onBack }) {
  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🚀</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          Contexto — Primeiro CRM
        </span>
      </div>

      <StepTitle>Ótimo! Vamos entender melhor o contexto</StepTitle>
      <StepSubtitle>
        Começar do zero é uma vantagem — fazemos tudo certo desde o início.
      </StepSubtitle>

      <FieldGroup>
        <Label>O que te levou a procurar o trabalho de CRM agora?</Label>
        <Textarea
          value={answers.motivo_busca_crm}
          onChange={(v) => onChange('motivo_busca_crm', v)}
          placeholder="Ex: quero aumentar a recompra, perdi vendas por não ter follow-up, indicação..."
          rows={3}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Por que o CRM ainda não havia sido iniciado?</Label>
        <Textarea
          value={answers.motivo_nao_iniciou}
          onChange={(v) => onChange('motivo_nao_iniciou', v)}
          placeholder="Ex: falta de tempo, não sabia por onde começar, custo..."
          rows={3}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Já existe alguma configuração técnica inicial?</Label>
        <RadioGroup
          options={CONFIG_OPCOES}
          value={answers.configuracao_tecnica}
          onChange={(v) => onChange('configuracao_tecnica', v)}
        />
      </FieldGroup>

      <div className="mt-6 flex justify-between items-center">
        <BtnSecondary onClick={onBack}>Voltar</BtnSecondary>
        <BtnPrimary onClick={onNext}>Continuar</BtnPrimary>
      </div>
    </StepCard>
  )
}
