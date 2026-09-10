import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Trophy,
  Flame,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWaterIntake } from '../hooks/useFirestoreData';
import { WaterIntakeRecord } from '../types';

interface WaterIntakePanelProps {
  patientCode: string;
  patientName: string;
  defaultGoalMl: number;
}

const CUP_PRESETS = [200, 250, 300, 500];

export const WaterIntakePanel: React.FC<WaterIntakePanelProps> = ({
  patientCode,
  patientName,
  defaultGoalMl,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const { intake, saveWaterIntake } = useWaterIntake(patientCode, todayIso);

  const [selectedCup, setSelectedCup] = useState<number>(250);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  const goalMl = intake?.goalMl || defaultGoalMl || 2500;
  const currentMl = intake?.currentMl || 0;
  const percentage = Math.min(100, Math.round((currentMl / goalMl) * 100));
  const remainingMl = Math.max(0, goalMl - currentMl);
  const isCompleted = currentMl >= goalMl && goalMl > 0;

  useEffect(() => {
    if (intake?.cupSizeMl) {
      setSelectedCup(intake.cupSizeMl);
    }
  }, [intake?.cupSizeMl]);

  useEffect(() => {
    if (isCompleted && !hasCelebrated) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#38bdf8', '#06b6d4', '#0284c7', '#3b82f6', '#10b981'],
      });
      setHasCelebrated(true);
    } else if (!isCompleted && hasCelebrated) {
      setHasCelebrated(false);
    }
  }, [isCompleted, hasCelebrated]);

  const handleAddWater = async (amount: number) => {
    const newCurrent = Math.max(0, currentMl + amount);
    const updatedRecord: WaterIntakeRecord = {
      id: `${patientCode.toUpperCase()}_${todayIso}`,
      patientCode: patientCode.toUpperCase(),
      date: todayIso,
      currentMl: newCurrent,
      goalMl: goalMl,
      cupSizeMl: selectedCup,
      updatedAt: new Date().toISOString(),
    };
    await saveWaterIntake(updatedRecord);
  };

  const handleResetDay = async () => {
    const updatedRecord: WaterIntakeRecord = {
      id: `${patientCode.toUpperCase()}_${todayIso}`,
      patientCode: patientCode.toUpperCase(),
      date: todayIso,
      currentMl: 0,
      goalMl: goalMl,
      cupSizeMl: selectedCup,
      updatedAt: new Date().toISOString(),
    };
    await saveWaterIntake(updatedRecord);
    setHasCelebrated(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Hydration Dashboard Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-8 border border-sky-100 shadow-md relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-400/10 via-cyan-400/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Title and Daily Date */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Ingestão Hídrica Diária
                </h2>
                {isCompleted && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                    <Trophy className="w-3 h-3 text-emerald-600" />
                    Meta Batida!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Acompanhamento e registro em tempo real para{' '}
                <strong className="text-sky-700 font-bold">{patientName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              Hoje,{' '}
              {new Date().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            {currentMl > 0 && (
              <button
                type="button"
                onClick={handleResetDay}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer active:scale-95 text-xs font-bold flex items-center gap-1"
                title="Zerar registro de hoje"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Zerar</span>
              </button>
            )}
          </div>
        </div>

        {/* Hydration Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-6 relative z-10">
          {/* Card 1: Meta Diária */}
          <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 p-4 rounded-2xl border border-sky-100/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Meta Recomendada
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                {goalMl.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm font-bold text-slate-500">ml</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Calculada no seu prontuário clínico
            </span>
          </div>

          {/* Card 2: Consumo Atual */}
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50/60 p-4 rounded-2xl border border-sky-200/80 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 block mb-1 flex items-center gap-1">
              <Droplets className="w-3 h-3 text-sky-600" />
              Consumo Ingerido
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-sky-900 tracking-tight">
                {currentMl.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm font-bold text-sky-700">ml</span>
            </div>
            <span className="text-[10px] text-sky-600 font-bold block mt-1">
              {percentage}% da meta diária concluída
            </span>
          </div>

          {/* Card 3: Restante */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isCompleted
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-75 block mb-1">
              {isCompleted ? 'Status' : 'Faltam para a Meta'}
            </span>
            <div className="flex items-baseline gap-1.5">
              {isCompleted ? (
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight flex items-center gap-1.5">
                  <CheckCircle2 className="w-6 h-6" /> Concluído!
                </span>
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                    {remainingMl.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-sm font-bold text-slate-500">ml</span>
                </>
              )}
            </div>
            <span className="text-[10px] opacity-75 font-medium block mt-1">
              {isCompleted ? 'Excelente hidratação hoje!' : 'Continue bebendo ao longo do dia'}
            </span>
          </div>
        </div>

        {/* Dynamic Water Progress Bar */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              Progresso Diário
            </span>
            <span className="font-mono text-sky-700">{percentage}%</span>
          </div>

          <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 transition-all duration-500 ease-out shadow-xs relative"
              style={{ width: `${Math.min(100, Math.max(currentMl > 0 ? 3 : 0, percentage))}%` }}
            >
              {percentage > 10 && (
                <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none rounded-full" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 px-1">
            <span>0 ml</span>
            <span>{(goalMl / 2).toLocaleString('pt-BR')} ml</span>
            <span>{goalMl.toLocaleString('pt-BR')} ml</span>
          </div>
        </div>

        {/* Cup Preset Selection & Action Controls */}
        <div className="mt-8 pt-6 border-t border-slate-100 relative z-10 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              Tamanho do Copo / Recipiente
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CUP_PRESETS.map((size) => {
                const isSelected = selectedCup === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedCup(size)}
                    className={`py-2.5 px-3 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/30'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Droplets className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-sky-500'}`} />
                    <span>{size} ml</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleAddWater(selectedCup)}
              className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span>Beber 1 Copo (+{selectedCup} ml)</span>
            </button>

            {currentMl > 0 && (
              <button
                type="button"
                onClick={() => handleAddWater(-selectedCup)}
                className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                title="Desfazer ou subtrair o último copo"
              >
                <Minus className="w-4 h-4 text-slate-500" />
                <span>Desfazer (-{selectedCup} ml)</span>
              </button>
            )}
          </div>
        </div>

        {/* Motivational Nutritional Tip */}
        <div className="mt-6 flex items-start gap-3 p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl text-xs text-sky-800 leading-relaxed relative z-10">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p>
            <strong>Dica da Dra. Maria Eduarda:</strong> A hidratação adequada estimula a taxa metabólica basal, melhora o trânsito intestinal e otimiza a absorção de nutrientes do seu plano alimentar. Não espere sentir sede para beber água!
          </p>
        </div>
      </div>
    </div>
  );
};
