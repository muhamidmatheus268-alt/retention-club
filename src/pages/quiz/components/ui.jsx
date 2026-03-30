// ─── Reusable UI primitives ───────────────────────────────────────────────────

export function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-white/40 font-medium tracking-wide uppercase">
          Etapa {current} de {total}
        </span>
        <span className="text-xs text-[#E8642A] font-semibold">{pct}%</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#E8642A] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function StepCard({ children }) {
  return (
    <div className="step-enter bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 sm:p-8 glow-orange">
      {children}
    </div>
  )
}

export function StepTitle({ children }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 leading-snug">
      {children}
    </h2>
  )
}

export function StepSubtitle({ children }) {
  return (
    <p className="text-white/50 text-sm mb-6 leading-relaxed">{children}</p>
  )
}

export function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-white/80 mb-2">
      {children}
      {required && <span className="text-[#E8642A] ml-1">*</span>}
    </label>
  )
}

export function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm transition-colors"
    />
  )
}

export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm transition-colors resize-none"
    />
  )
}

export function NumberInput({ value, onChange, placeholder, min = 0 }) {
  return (
    <input
      type="number"
      value={value || ''}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm transition-colors"
    />
  )
}

export function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
              selected
                ? 'bg-[#E8642A]/15 border-[#E8642A]/60 text-[#E8642A]'
                : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06] hover:border-white/20'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                selected ? 'border-[#E8642A]' : 'border-white/30'
              }`}
            >
              {selected && (
                <span className="w-2 h-2 rounded-full bg-[#E8642A]" />
              )}
            </span>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function CheckboxGroup({ options, value = [], onChange }) {
  const toggle = (val) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val))
    } else {
      onChange([...value, val])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
              selected
                ? 'bg-[#E8642A]/15 border-[#E8642A]/60 text-[#E8642A]'
                : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06] hover:border-white/20'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                selected ? 'border-[#E8642A] bg-[#E8642A]' : 'border-white/30'
              }`}
            >
              {selected && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0F1629] border border-white/10 rounded-xl px-4 py-3 text-white text-sm transition-colors appearance-none cursor-pointer"
    >
      <option value="" disabled className="text-white/30">
        Selecione...
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#0F1629]">
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function FieldGroup({ children }) {
  return <div className="mb-5">{children}</div>
}

export function BtnPrimary({ onClick, disabled, children, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 bg-[#E8642A] hover:bg-[#d4571f] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-7 py-3 rounded-full text-sm transition-all"
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : null}
      {children}
      {!loading && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      )}
    </button>
  )
}

export function BtnSecondary({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm font-medium transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
      </svg>
      {children}
    </button>
  )
}
