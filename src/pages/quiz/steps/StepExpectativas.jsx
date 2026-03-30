import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, Textarea,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

export default function StepExpectativas({ answers, onChange, onNext, onBack }) {
  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🎯</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          Alinhamento
        </span>
      </div>

      <StepTitle>Expectativas e objetivos</StepTitle>
      <StepSubtitle>
        Essas respostas guiam toda a nossa estratégia e definem o que o sucesso significa para você.
      </StepSubtitle>

      <FieldGroup>
        <Label>Quais são os objetivos com o trabalho de CRM?</Label>
        <Textarea
          value={answers.objetivos_crm}
          onChange={(v) => onChange('objetivos_crm', v)}
          placeholder="Ex: aumentar a recompra em 20%, reduzir CAC, crescer a base..."
          rows={3}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>O que você espera do trabalho?</Label>
        <Textarea
          value={answers.expectativa_trabalho}
          onChange={(v) => onChange('expectativa_trabalho', v)}
          placeholder="Ex: comunicação mais consistente, automações rodando, ROI mensurável..."
          rows={3}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Qual indicador você considera para saber se está indo bem?</Label>
        <Textarea
          value={answers.indicador_sucesso}
          onChange={(v) => onChange('indicador_sucesso', v)}
          placeholder="Ex: receita gerada pelo CRM, taxa de abertura acima de 30%, ROI positivo..."
          rows={2}
        />
      </FieldGroup>

      <div className="mt-6 flex justify-between items-center">
        <BtnSecondary onClick={onBack}>Voltar</BtnSecondary>
        <BtnPrimary onClick={onNext}>Continuar</BtnPrimary>
      </div>
    </StepCard>
  )
}
