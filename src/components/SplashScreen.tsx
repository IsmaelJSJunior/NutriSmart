import React, { useState, useEffect } from 'react';
import { Leaf, ShieldCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number; // default 4000ms
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 4200,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [statusIndex, setStatusIndex] = useState<number>(0);

  const statusMessages = [
    'Inicializando ambiente clínico...',
    'Carregando prontuários e protocolos nutricionais...',
    'Calibrando calculadoras antropométricas e IMC...',
    'Sincronizando módulos de prescrição e agenda...',
    'Ambiente pronto! Abrindo NutriSmart...',
  ];

  useEffect(() => {
    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      // Determine status message index based on progress
      const nextIdx = Math.min(
        statusMessages.length - 1,
        Math.floor((pct / 100) * statusMessages.length)
      );
      setStatusIndex(nextIdx);

      // Trigger fade out in the last 450ms
      if (elapsed >= durationMs - 500 && !isFadingOut) {
        setIsFadingOut(true);
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          onFinish();
        }, 400);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [durationMs, onFinish, isFadingOut]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl text-white transition-all duration-500 ease-out select-none ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
        {/* Animated Brand Logo Icon with breathing glow */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 animate-pulse-glow">
            <div className="w-full h-full bg-slate-900/90 rounded-[22px] backdrop-blur-md flex items-center justify-center">
              <Leaf className="w-10 h-10 text-emerald-400 fill-emerald-400/20 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
            </div>
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-sm shadow-emerald-400" />
          </span>
        </div>

        {/* Brand Typography */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-1">
            <span>Nutri</span>
            <span className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">Smart</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide mt-1.5 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Inteligência Clínica & Prescrição Personalizada</span>
          </p>
        </div>

        {/* Progress Bar Component */}
        <div className="w-full max-w-xs space-y-3">
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/60 shadow-inner">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 h-full rounded-full transition-all duration-75 ease-out shadow-[0_0_10px_rgba(16,185,129,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dynamic Status Text & Percentage */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-0.5 min-h-[18px]">
            <span className="text-emerald-400/90 font-semibold truncate mr-2">
              {statusMessages[statusIndex]}
            </span>
            <span className="font-mono text-slate-300 font-bold shrink-0">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Clinical Security Tag */}
        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-full backdrop-blur-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Ambiente Clínico Seguro & Criptografado</span>
        </div>
      </div>
    </div>
  );
};

