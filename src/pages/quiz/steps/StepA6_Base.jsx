import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, SelectInput, RadioGroup, NumberInput, Textarea,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

const TAMANHO_BASE = [
  { value: 'menos_1k', label: 'Menos de 1.000 contatos' },
  { value: '1k_5k', label: '1.000 – 5.000 contatos' },
  { value: '5k_20k', label: '5.000 – 20.000 contatos' },
  { value: '20k_50k', label: '20.000 – 50.000 contatos' },
  { value: 'mais_50k', label: 'Mais de 50.000 contatos' },
  { value: 'nao_sei', label: 'Não sei informar' },
]

const SIM_NAO = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
]

export default function StepA6_Base({ answers, onChange, onNext, onBack }) {
  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🗃️</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          Sobre a Base
        </span>
      </div>

      <StepTitle>Situação atual da base de contatos</StepTitle>
      <StepSubtitle>
        A qualidade da base é a fundação de todo o trabalho de CRM.
      </StepSubtitle>

      <FieldGroup>
        <Label>Qual o tamanho aproximado da base?</Label>
        <SelectInput
          value={answers.tamanho_base}
          onChange={(v) => onChange('tamanho_base', v)}
          options={TAMANHO_BASE}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Existe separação entre base geral e base de ativos?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.separacao_base}
          onChange={(v) => onChange('separacao_base', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Já houve limpeza de base em algum momento?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.limpeza_base}
          onChange={(v) => onChange('limpeza_base', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Quantos leads chegam em média por mês?</Label>
        <NumberInput
          value={answers.leads_mes}
          onChange={(v) => onChange('leads_mes', v)}
          placeholder="Ex: 500"
          min={0}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Já criaram alguma LP específica para captação de lead?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.lp_captacao}
          onChange={(v) => onChange('lp_captacao', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Existe algum padrão de clusterização atualmente?</Label>
        <RadioGroup
          options={SIM_NAO}
          value={answers.clusterizacao}
          onChange={(v) => onChange('clusterizacao', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Existem listas que podemos inserir na plataforma e ainda não temos?</Label>
        <Textarea
          value={answers.listas_adicionais}
          onChange={(v) => onChange('listas_adicionais', v)}
          placeholder="Ex: clientes do WhatsApp, base da plataforma anterior, clientes do PDV..."
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
