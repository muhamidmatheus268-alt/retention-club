import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, RadioGroup, TextInput,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

const SIM_NAO = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
]

export default function StepA4_KPIsEngajamento({ answers, onChange, onNext, onBack }) {
  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">📬</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          KPI — Abertura & Entrega
        </span>
      </div>

      <StepTitle>Taxa de abertura e entrega de e-mails</StepTitle>
      <StepSubtitle>
        Esses dados mostram a saúde da sua comunicação atual com a base.
      </StepSubtitle>

      <FieldGroup>
        <Label>Existem padrões de comunicação / linha editorial definida?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.linha_editorial}
          onChange={(v) => onChange('linha_editorial', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Existe um padrão de remetente definido?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.padrao_remetente}
          onChange={(v) => onChange('padrao_remetente', v)}
        />
      </FieldGroup>

      {answers.padrao_remetente === 'sim' && (
        <FieldGroup>
          <Label>Qual é o padrão usado?</Label>
          <TextInput
            value={answers.padrao_remetente_exemplo}
            onChange={(v) => onChange('padrao_remetente_exemplo', v)}
            placeholder="Ex: Bru da Safine, Ananda da Amar..."
          />
        </FieldGroup>
      )}

      <FieldGroup>
        <Label>Fazem Teste A/B de assunto ou horário?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.teste_ab}
          onChange={(v) => onChange('teste_ab', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Utilizam logo/avatar no remetente?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.logo_remetente}
          onChange={(v) => onChange('logo_remetente', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Têm a reputação de domínio mapeada?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.reputacao_dominio}
          onChange={(v) => onChange('reputacao_dominio', v)}
        />
      </FieldGroup>

      <div className="mt-6 flex justify-between items-center">
        <BtnSecondary onClick={onBack}>Voltar</BtnSecondary>
        <BtnPrimary onClick={onNext}>Continuar</BtnPrimary>
      </div>
    </StepCard>
  )
}
