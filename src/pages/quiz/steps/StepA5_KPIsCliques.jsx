import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, CheckboxGroup, RadioGroup,
  BtnPrimary, BtnSecondary,
} from '../components/ui'

const PADROES = [
  { value: 'texto_ctr', label: 'E-mails em texto têm mais CTR' },
  { value: 'qtd_artes', label: 'Quantidade de artes por e-mail influencia' },
  { value: 'artes_preco', label: 'Artes com preço têm melhor performance' },
  { value: 'nenhum', label: 'Ainda não identificamos padrões' },
]

const TEMAS = [
  { value: 'apenas_oferta', label: 'Apenas oferta' },
  { value: 'apenas_conteudo', label: 'Apenas conteúdo' },
  { value: 'mix', label: 'Mix de ofertas + conteúdo' },
]

export default function StepA5_KPIsCliques({ answers, onChange, onNext, onBack }) {
  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🖱️</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          KPI — Taxa de Cliques
        </span>
      </div>

      <StepTitle>Comportamento e padrões de clique</StepTitle>
      <StepSubtitle>
        Identificar padrões é essencial para otimizar os próximos envios.
      </StepSubtitle>

      <FieldGroup>
        <Label>Já identificaram algum padrão de comportamento? (selecione os que se aplicam)</Label>
        <CheckboxGroup
          options={PADROES}
          value={answers.padroes_comportamento || []}
          onChange={(v) => onChange('padroes_comportamento', v)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Como trabalham a variação de temas nos envios?</Label>
        <RadioGroup
          options={TEMAS}
          value={answers.variacao_temas}
          onChange={(v) => onChange('variacao_temas', v)}
        />
      </FieldGroup>

      <div className="mt-6 flex justify-between items-center">
        <BtnSecondary onClick={onBack}>Voltar</BtnSecondary>
        <BtnPrimary onClick={onNext}>Continuar</BtnPrimary>
      </div>
    </StepCard>
  )
}
