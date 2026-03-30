export default function StepObrigado({ answers }) {
  return (
    <div className="step-enter text-center py-8">
      {/* Glow ring */}
      <div className="relative inline-flex items-center justify-center mb-8">
        <div className="absolute w-28 h-28 rounded-full bg-[#E8642A]/20 blur-2xl" />
        <div className="relative w-20 h-20 rounded-full bg-[#E8642A]/15 border border-[#E8642A]/30 flex items-center justify-center text-4xl">
          🎉
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
        Diagnóstico enviado!
      </h1>

      <p className="text-white/50 text-base mb-2 max-w-md mx-auto">
        Obrigado,{' '}
        <span className="text-white font-medium">
          {answers.nome_completo || answers.responsavel || 'você'}
        </span>
        !
      </p>

      <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed mb-10">
        Recebemos todas as informações e em breve entraremos em contato para apresentar as KPIs, o plano de ação e como iremos começar.
      </p>

      {/* What happens next */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 max-w-md mx-auto text-left">
        <p className="text-xs font-semibold text-[#E8642A] uppercase tracking-widest mb-4">
          O que acontece agora
        </p>
        <ul className="space-y-3">
          {[
            'Analisamos seu diagnóstico',
            'Definimos as estratégias ideais para o seu cenário',
            'Apresentamos os KPIs e o plano de ação',
            'Iniciamos as campanhas e configurações técnicas',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/60">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#E8642A]/20 border border-[#E8642A]/40 text-[#E8642A] text-xs flex items-center justify-center font-bold mt-0.5">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
