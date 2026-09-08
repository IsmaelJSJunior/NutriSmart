import React from 'react';
import {
  Stethoscope,
  User,
  Activity,
  Calendar,
  MessageSquare,
  Utensils,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';

interface LandingViewProps {
  onSelectNutri?: () => void;
  onSelectPatient?: () => void;
  onOpenNutriLogin?: () => void;
  onOpenPatientLogin?: () => void;
  onInjectMock?: () => void;
  patientCount?: number;
  unreadCount?: number;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSelectNutri,
  onSelectPatient,
  onOpenNutriLogin,
  onOpenPatientLogin,
  unreadCount = 0,
}) => {
  const handleNutri = onOpenNutriLogin || onSelectNutri || (() => {});
  const handlePatient = onOpenPatientLogin || onSelectPatient || (() => {});

  return (
    <div className="relative z-10 w-full max-w-4xl mx-auto my-auto flex flex-col items-center justify-center select-none animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Brand Hero Header - Clear, Prominent & Highlighted */}
      <div className="relative z-10 text-center mb-3 sm:mb-5">
        <div className="flex justify-center mb-2 sm:mb-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shrink-0 border-0 ring-0 shadow-none cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:drop-shadow-[0_10px_20px_rgba(16,185,129,0.25)]">
            <img src="/logo.png" alt="NutriSmart Logo" className="w-full h-full object-cover rounded-full border-0 transition-transform duration-300 ease-out" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight flex items-center justify-center gap-0.5">
          <span>Nutri</span>
          <span className="text-emerald-600">Smart</span>
        </h1>
        <p className="mt-1.5 text-[10px] sm:text-xs md:text-sm lg:text-base text-slate-500 font-medium leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis w-full max-w-2xl mx-auto px-2">
          Prescrição personalizada, cálculo antropométrico e acompanhamento clínico contínuo.
        </p>
      </div>

      {/* Main Access Cards - Compact Grid with No Unused Dead Space */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        {/* Nutri Access Card */}
        <div
          onClick={handleNutri}
          className="group relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-emerald-100/90 shadow-sm hover:shadow-md hover:border-emerald-300 hover:scale-[1.01] transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-98"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/90 flex items-center justify-center text-emerald-600 shadow-2xs border border-emerald-200/50 shrink-0 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Profissional
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[9px] sm:text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <MessageSquare className="w-2.5 h-2.5" /> {unreadCount}
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors mt-0.5 truncate">
                  Portal da Nutricionista
                </h2>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug font-medium line-clamp-2">
              Consultas, cálculo de IMC, anamnese detalhada, dietas personalizadas e agenda clínica.
            </p>

            {/* Feature Tags */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700">
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-emerald-50/60 p-1.5 rounded-xl border border-slate-100 transition-colors">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Prescrição Clínica</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-sky-50/60 p-1.5 rounded-xl border border-slate-100 transition-colors">
                <Activity className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="truncate">Carências</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-indigo-50/60 p-1.5 rounded-xl border border-slate-100 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Agenda</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-amber-50/60 p-1.5 rounded-xl border border-slate-100 transition-colors">
                <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Receitas</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Entrar <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
              Dra. Maria Eduarda
            </span>
          </div>
        </div>

        {/* Patient Access Card */}
        <div
          onClick={handlePatient}
          className="group relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sky-100/90 shadow-sm hover:shadow-md hover:border-sky-300 hover:scale-[1.01] transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-98"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-100/90 flex items-center justify-center text-sky-600 shadow-2xs border border-sky-200/50 shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                  Paciente
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-sky-700 transition-colors mt-0.5 truncate">
                  Portal do Paciente
                </h2>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug font-medium line-clamp-2">
              Plano alimentar, prescrição de treinos, metas de peso e canal direto de conversa com a nutri.
            </p>

            {/* Feature Tags */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700">
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-sky-50/60 p-1.5 rounded-xl border border-slate-100 transition-colors">
                <Activity className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="truncate">Evolução</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-emerald-50/60 p-1.5 rounded-xl border border-slate-100 transition-colors">
                <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Cardápio</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-indigo-50/60 p-1.5 rounded-xl border border-slate-100 transition-colors">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Chat</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-amber-50/60 p-1.5 rounded-xl border border-slate-100 transition-colors">
                <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Receitas</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-sky-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Entrar <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
              Acompanhamento
            </span>
          </div>
        </div>
      </div>

      {/* Subtle Sophisticated Footer */}
      <div className="mt-5 sm:mt-6 text-center">
        <p className="text-[11px] sm:text-xs font-medium text-slate-400 tracking-wide">
          © 2026 NutriSmart • Todos os direitos reservados • v1.0
        </p>
      </div>
    </div>
  );
};


