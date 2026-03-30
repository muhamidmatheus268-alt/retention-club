import {
  StepCard, StepTitle, StepSubtitle,
  FieldGroup, Label, TextInput, BtnPrimary,
} from '../components/ui'

export default function StepIntro({ answers, onChange, onNext }) {
  const valid = answers.empresa?.trim() && answers.responsavel?.trim()

  return (
    <StepCard>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">👋</span>
        <span className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest">
          Boas-vindas
        </span>
      </div>

      <StepTitle>Vamos começar com o básico</StepTitle>
      <StepSubtitle>
        Essas informações nos ajudam a personalizar o diagnóstico para o seu negócio.
      </StepSubtitle>

      <FieldGroup>
        <Label required>Nome da empresa</Label>
        <TextInput
          value={answers.empresa}
          onChange={(v) => onChange('empresa', v)}
          placeholder="Ex: Safine, Amar, Loja XYZ..."
        />
      </FieldGroup>

      <FieldGroup>
        <Label required>Seu nome (responsável)</Label>
        <TextInput
          value={answers.responsavel}
          onChange={(v) => onChange('responsavel', v)}
          placeholder="Ex: Ana, Bruno..."
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Segmento / nicho</Label>
        <TextInput
          value={answers.segmento}
          onChange={(v) => onChange('segmento', v)}
          placeholder="Ex: Moda feminina, Cosméticos, Pet..."
        />
      </FieldGroup>

      <div className="mt-6 flex justify-end">
        <BtnPrimary onClick={onNext} disabled={!valid}>
          Começar diagnóstico
        </BtnPrimary>
      </div>
    </StepCard>
  )
}
