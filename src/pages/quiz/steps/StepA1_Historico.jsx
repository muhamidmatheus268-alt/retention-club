import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, Textarea, CheckboxGroup, RadioGroup,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

const CANAIS = [
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'outros', label: 'Outros' },
]

const O_QUE_TRABALHADO = [
  { value: 'disparos', label: 'Apenas disparos (campanhas manuais)' },
  { value: 'automacoes', label: 'Automações (fluxos automáticos)' },
  { value: 'ambos', label: 'Ambos' },
]

export default function StepA1_Historico({ answers, onChange, onNext, onBack }) {
  const valid = answers.canais?.length > 0 && answers.o_que_trabalhado

  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">📋</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          Histórico — Path A
        </span>
      </div>

      <StepTitle>Como foi o trabalho de CRM até aqui?</StepTitle>
      <StepSubtitle>
        Queremos entender o que já foi feito para partir do ponto certo.
      </StepSubtitle>

      <FieldGroup>
        <Label>O que fazem hoje para fomentar a recompra?</Label>
        <Textarea
          value={answers.fomentacao_recompra}
          onChange={(v) => onChange('fomentacao_recompra', v)}
          placeholder="Ex: enviamos e-mails esporádicos, usamos WhatsApp para follow-up..."
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Como funciona o pós-venda? O que acontece depois que um cliente compra?</Label>
        <Textarea
          value={answers.pos_venda}
          onChange={(v) => onChange('pos_venda', v)}
          placeholder="Ex: recebem e-mail de confirmação, nenhum contato adicional..."
        />
      </FieldGroup>

      <FieldGroup>
        <Label required>Quais canais foram trabalhados?</Label>
        <CheckboxGroup
          options={CANAIS}
          value={answers.canais || []}
          onChange={(v) => onChange('canais', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label required>O que foi trabalhado nestes canais?</Label>
        <RadioGroup
          options={O_QUE_TRABALHADO}
          value={answers.o_que_trabalhado}
          onChange={(v) => onChange('o_que_trabalhado', v)}
        />
      </FieldGroup>

      <div className="mt-6 flex justify-between items-center">
        <BtnSecondary onClick={onBack}>Voltar</BtnSecondary>
        <BtnPrimary onClick={onNext} disabled={!valid}>
          Continuar
        </BtnPrimary>
      </div>
    </StepCard>
  )
}
