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
  Sparkles,
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
    <div className="w-full h-full max-h-full flex flex-col items-center justify-between px-3.5 py-2 sm:px-6 sm:py-4 relative z-10 overflow-hidden select-none">
      <div className="max-w-4xl w-full flex-1 flex flex-col justify-between my-auto min-h-0">
        {/* Brand Hero Header - Ultra Compact */}
        <div className="text-center pt-1 pb-1 sm:py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50/90 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold text-emerald-700 mb-1 sm:mb-2 shadow-2xs">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Nutrição Clínica & Inteligência Artificial</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight">
            Nutri<span className="text-emerald-500">Smart</span>
          </h1>

          <p className="mt-1 text-[11px] sm:text-xs md:text-sm text-slate-500 max-w-lg mx-auto font-medium leading-snug line-clamp-2 sm:line-clamp-none">
            Prescrição personalizada, cálculo antropométrico e acompanhamento clínico contínuo.
          </p>
        </div>

        {/* Main Access Cards - Simultaneous High-Impact Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 my-auto flex-1 max-h-[calc(100dvh-11rem)] items-stretch">
          {/* Nutri Access Card */}
          <div
            onClick={handleNutri}
            className="group relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-emerald-100/80 shadow-sm shadow-slate-200 hover:shadow-lg hover:border-emerald-300 hover:scale-[1.01] transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-98"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-2xs border border-emerald-200/50 shrink-0 group-hover:scale-105 transition-transform">
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
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors mt-0.5 truncate">
                    Portal da Nutricionista
                  </h2>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-500 leading-snug font-medium line-clamp-2">
                Consultas, cálculo de IMC, anamnese detalhada, dietas personalizadas e agenda clínica.
              </p>

              <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-600">
                <div className="flex items-center gap-1 bg-slate-50/90 p-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <ClipboardList className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Prescrição IA</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50/90 p-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <Activity className="w-3 h-3 text-sky-600 shrink-0" />
                  <span className="truncate">Carências</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50/90 p-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span className="truncate">Agenda</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50/90 p-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Receitas</span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
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
            className="group relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-sky-100/80 shadow-sm shadow-slate-200 hover:shadow-lg hover:border-sky-300 hover:scale-[1.01] transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-98"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-sky-100/80 flex items-center justify-center text-sky-600 shadow-2xs border border-sky-200/50 shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                    Paciente
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-sky-700 transition-colors mt-0.5 truncate">
                    Portal do Paciente
                  </h2>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-500 leading-snug font-medium line-clamp-2">
                Plano alimentar, prescrição de treinos, metas de peso e canal direto de conversa com a nutri.
              </p>

              <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-600">
                <div className="flex items-center gap-1 bg-slate-50/90 p-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <Activity className="w-3 h-3 text-sky-600 shrink-0" />
                  <span className="truncate">Evolução</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50/90 p-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <Utensils className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Cardápio</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50/90 p-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <MessageSquare className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span className="truncate">Chat & Fotos</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50/90 p-1.5 rounded-lg sm:rounded-xl border border-slate-100">
                  <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Receitas</span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-sky-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Entrar <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
                Acompanhamento
              </span>
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="text-center py-1 shrink-0">
          <p className="text-[10px] sm:text-xs font-medium text-slate-400">
            NutriSmart • v1.00
          </p>
        </div>
      </div>
    </div>
  );
};

