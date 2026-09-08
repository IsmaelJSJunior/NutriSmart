import React, { useState, useEffect } from 'react';
import { ShieldCheck, HeartPulse } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number; // exactly 4000ms
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 4000,
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
    const loadDuration = durationMs - 500; // Load 0% to 100% in first 3.5s

    const intervalId = setInterval(() => {
      const now = performance.now();
      const elapsed = now - startTime;

      if (elapsed < loadDuration) {
        const pct = Math.min(99, (elapsed / loadDuration) * 100);
        setProgress(pct);

        const nextIdx = Math.min(
          statusMessages.length - 2,
          Math.floor((pct / 100) * (statusMessages.length - 1))
        );
        setStatusIndex(nextIdx);
      } else {
        clearInterval(intervalId);
        setProgress(100);
        setStatusIndex(statusMessages.length - 1);

        // Hold at 100% for 150ms, then fade out smoothly
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            onFinish();
          }, 400);
        }, 150);
      }
    }, 16);

    return () => clearInterval(intervalId);
  }, [durationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 text-slate-800 transition-all duration-500 ease-out select-none overflow-hidden ${
        isFadingOut ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Clean Light Radial Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#ffffff_0%,_#f8fafc_60%,_#f1f5f9_100%)] pointer-events-none" />

      {/* Main Content Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
        {/* Emblem Logo */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-0 ring-0 shadow-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-transform duration-700 hover:scale-105">
            <img
              src="/logo.png"
              alt="NutriSmart Logo"
              className="w-full h-full object-cover rounded-full border-0"
            />
          </div>
        </div>

        {/* Brand Typography */}
        <div className="mb-7">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 flex items-center justify-center gap-1">
            <span>Nutri</span>
            <span className="text-emerald-600 drop-shadow-sm">
              Smart
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide mt-2 flex items-center justify-center gap-1.5 leading-relaxed max-w-xs">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Prescrição personalizada, cálculo antropométrico e acompanhamento clínico contínuo.</span>
          </p>
        </div>

        {/* Progress Bar Component */}
        <div className="w-full max-w-xs space-y-3">
          <div className="w-full bg-white/90 rounded-full h-2.5 overflow-hidden border border-emerald-200/80 shadow-inner">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 h-full rounded-full transition-all duration-75 ease-out shadow-[0_2px_10px_rgba(16,185,129,0.35)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dynamic Status Text & Percentage */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5 min-h-[18px]">
            <span className="text-emerald-700 font-semibold truncate mr-2">
              {statusMessages[statusIndex]}
            </span>
            <span className="font-mono text-slate-700 font-bold shrink-0">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Clinical Security Tag - Clean Frosted Light Finish */}
        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold bg-white/90 border border-emerald-100/90 px-4 py-1.5 rounded-full shadow-sm shadow-emerald-500/5 backdrop-blur-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Ambiente Clínico Seguro & Criptografado</span>
        </div>
      </div>
    </div>
  );
};



