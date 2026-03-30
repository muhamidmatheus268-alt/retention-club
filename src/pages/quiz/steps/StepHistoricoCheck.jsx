import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, RadioGroup, BtnPrimary, BtnSecondary,
} from '../components/ui'

const OPTIONS = [
  { value: 'sim', label: 'Sim, já trabalhamos com CRM antes' },
  { value: 'nao', label: 'Não, é a primeira vez' },
]

export default function StepHistoricoCheck({ answers, onChange, onNext, onBack }) {
  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🗂️</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          Histórico
        </span>
      </div>

      <StepTitle>Já foi trabalhado CRM nesta empresa?</StepTitle>
      <StepSubtitle>
        Isso define o caminho do diagnóstico — não há resposta certa ou errada.
      </StepSubtitle>

      <FieldGroup>
        <RadioGroup
          options={OPTIONS}
          value={answers.tem_crm}
          onChange={(v) => onChange('tem_crm', v)}
        />
      </FieldGroup>

      <div className="mt-6 flex justify-between items-center">
        <BtnSecondary onClick={onBack}>Voltar</BtnSecondary>
        <BtnPrimary onClick={onNext} disabled={!answers.tem_crm}>
          Continuar
        </BtnPrimary>
      </div>
    </StepCard>
  )
}
