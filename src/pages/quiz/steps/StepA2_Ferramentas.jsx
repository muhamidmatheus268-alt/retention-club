import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, CheckboxGroup, RadioGroup, NumberInput, TextInput,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

const FERRAMENTAS = [
  { value: 'mailbiz', label: 'Mailbiz' },
  { value: 'rdstation', label: 'RD Station' },
  { value: 'activecampaign', label: 'ActiveCampaign' },
  { value: 'voxuy', label: 'VoxUy' },
  { value: 'cartstack', label: 'Cartstack' },
  { value: 'klaviyo', label: 'Klaviyo (Shopify)' },
  { value: 'edrone', label: 'Edrone' },
  { value: 'martz', label: 'Martz (WhatsApp)' },
  { value: 'outra', label: 'Outra' },
]

const SIM_NAO = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
]

export default function StepA2_Ferramentas({ answers, onChange, onNext, onBack }) {
  const valid = answers.ferramentas?.length > 0

  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🛠️</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          Ferramentas & Operacional
        </span>
      </div>

      <StepTitle>Ferramentas utilizadas e operação atual</StepTitle>
      <StepSubtitle>
        Nos ajuda a entender com o que você já tem familiaridade.
      </StepSubtitle>

      <FieldGroup>
        <Label required>Quais ferramentas utilizam / já utilizaram?</Label>
        <CheckboxGroup
          options={FERRAMENTAS}
          value={answers.ferramentas || []}
          onChange={(v) => onChange('ferramentas', v)}
        />
      </FieldGroup>

      {answers.ferramentas?.includes('outra') && (
        <FieldGroup>
          <Label>Qual outra ferramenta?</Label>
          <TextInput
            value={answers.ferramenta_outra}
            onChange={(v) => onChange('ferramenta_outra', v)}
            placeholder="Nome da ferramenta..."
          />
        </FieldGroup>
      )}

      <FieldGroup>
        <Label>O e-mail de disparo é o mesmo do SAC?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.email_disparo_igual_sac}
          onChange={(v) => onChange('email_disparo_igual_sac', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Frequência de disparos por semana</Label>
        <NumberInput
          value={answers.frequencia_disparos}
          onChange={(v) => onChange('frequencia_disparos', v)}
          placeholder="Ex: 3"
          min={0}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Possuem calendário próprio de CRM?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.calendario_crm}
          onChange={(v) => onChange('calendario_crm', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Possuem Grupo VIP de WhatsApp?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.grupo_vip_whatsapp}
          onChange={(v) => onChange('grupo_vip_whatsapp', v)}
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
