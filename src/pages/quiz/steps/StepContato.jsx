import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, TextInput,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

export default function StepContato({ answers, onChange, onNext, onBack, loading }) {
  const valid =
    answers.nome_completo?.trim() &&
    answers.email?.trim() &&
    answers.email?.includes('@')

  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">✉️</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          Quase lá!
        </span>
      </div>

      <StepTitle>Seus dados de contato</StepTitle>
      <StepSubtitle>
        Para enviarmos o diagnóstico e entrarmos em contato com os próximos passos.
      </StepSubtitle>

      <FieldGroup>
        <Label required>Nome completo</Label>
        <TextInput
          value={answers.nome_completo}
          onChange={(v) => onChange('nome_completo', v)}
          placeholder="Seu nome..."
        />
      </FieldGroup>

      <FieldGroup>
        <Label required>E-mail</Label>
        <TextInput
          type="email"
          value={answers.email}
          onChange={(v) => onChange('email', v)}
          placeholder="seu@email.com.br"
        />
      </FieldGroup>

      <FieldGroup>
        <Label>WhatsApp</Label>
        <TextInput
          type="tel"
          value={answers.whatsapp}
          onChange={(v) => onChange('whatsapp', v)}
          placeholder="(11) 99999-9999"
        />
      </FieldGroup>

      <div className="mt-6 flex justify-between items-center">
        <BtnSecondary onClick={onBack}>Voltar</BtnSecondary>
        <BtnPrimary onClick={onNext} disabled={!valid} loading={loading}>
          {loading ? 'Enviando...' : 'Enviar diagnóstico'}
        </BtnPrimary>
      </div>
    </StepCard>
  )
}
