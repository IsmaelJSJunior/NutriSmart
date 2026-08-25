import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Dumbbell,
  Pill,
  Activity,
  Utensils,
  Calendar,
  User,
  Scale,
  Maximize2,
  FileText,
  MessageCircle,
} from 'lucide-react';
import { ReportRecord } from '../types';
import { copyToClipboard, calculateIMC } from '../lib/utils';
import { BlockCopyButton } from './BlockCopyButton';

interface PatientFullReportModalProps {
  report: ReportRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToChat?: (patientCode: string) => void;
}

export const PatientFullReportModal: React.FC<PatientFullReportModalProps> = ({
  report,
  isOpen,
  onClose,
  onNavigateToChat,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Scroll lock & Escape key
  useEffect(() => {
    if (!isOpen || !report) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, report]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  if (!isOpen || !report) return null;

  const { formData } = report;
  const mealPlanText = report.aiData?.mealPlan || report.aiMealPlan || '';
  const trainingText = report.aiData?.training || '';
  const supplementsText = report.aiData?.supplements || '';
  const deficienciasText = report.aiData?.deficiencias || '';

  const imc = calculateIMC(formData.peso, formData.altura);

  const handleCopyFullWhatsApp = async () => {
    const fullText = `*NUTRISMART • FICHA CLÍNICA & PRESCRIÇÃO*
👤 *Paciente:* ${formData.nome}
🎯 *Objetivo:* ${formData.objetivo}
📅 *Data:* ${new Date(report.date).toLocaleDateString('pt-BR')}
🔑 *Código:* ${report.patientCode}

═════════════════════════════
🥗 *PLANO ALIMENTAR:*
${mealPlanText}

═════════════════════════════
💪 *TREINO & ATIVIDADE:*
${trainingText}

═════════════════════════════
💊 *SUPLEMENTAÇÃO:*
${supplementsText}

═════════════════════════════
🔬 *CARÊNCIAS & SINTOMAS:*
${deficienciasText}

═════════════════════════════
_NutriSmart • Dra. Maria Eduarda_`;

    const success = await copyToClipboard(fullText);
    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-md transition-all duration-200 ease-out select-none ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 relative transition-all duration-200 ease-out transform overflow-hidden ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Ficha Clínica • {formData.nome}
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  {report.patientCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Consulta emitida em {new Date(report.date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToChat && (
              <button
                onClick={() => {
                  handleClose();
                  setTimeout(() => onNavigateToChat(report.patientCode), 230);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                title="Abrir chat direto"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
            )}

            <button
              onClick={handleCopyFullWhatsApp}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                copiedAll
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
              title="Copiar para WhatsApp"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedAll ? 'Copiado!' : 'WhatsApp'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 text-white transition ml-1"
              title="Fechar Ficha"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Peso / Altura
              </span>
              <span className="text-sm font-extrabold text-slate-800">
                {formData.peso} kg • {formData.altura} cm
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                IMC Instantâneo
              </span>
              <span className={`text-sm font-extrabold ${imc.colorClass}`}>
                {imc.value} ({imc.classification})
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Objetivo Clínico
              </span>
              <span className="text-sm font-extrabold text-emerald-600 truncate block">
                {formData.objetivo}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Estratégia / Meta
              </span>
              <span className="text-sm font-bold text-slate-800">
                {formData.tipoDieta || 'Personalizada'} ({formData.calorias || '1800'} kcal)
              </span>
            </div>
          </div>

          {/* Section 1: Plano Alimentar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Utensils className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Plano Alimentar Prescrito
                </h4>
              </div>
              <BlockCopyButton title="Plano Alimentar" content={mealPlanText} />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs sm:text-sm font-mono text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-100 max-h-72 overflow-y-auto">
              {mealPlanText || 'Nenhum cardápio registrado.'}
            </div>
          </div>

          {/* Section 2: Treino e Atividade */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Dumbbell className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Prescrição de Treino & Movimento
                </h4>
              </div>
              <BlockCopyButton title="Treino" content={trainingText} />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs sm:text-sm font-mono text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-100">
              {trainingText || 'Nenhum treino específico cadastrado.'}
            </div>
          </div>

          {/* Grid: Suplementação & Rastreamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Suplementação */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Pill className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Suplementação & Fitoterapia
                  </h4>
                </div>
                <BlockCopyButton title="Suplementos" content={supplementsText} />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-100 min-h-[90px]">
                {supplementsText || 'Sem suplementação indicada.'}
              </div>
            </div>

            {/* Carências & Sintomas */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Rastreamento Clínico & Queixas
                  </h4>
                </div>
                <BlockCopyButton title="Carências" content={deficienciasText} />
              </div>

              <div className="bg-amber-50/70 p-4 rounded-xl text-xs font-mono text-amber-900 whitespace-pre-wrap leading-relaxed border border-amber-200/80 min-h-[90px]">
                {deficienciasText || 'Sem queixas relatadas.'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-semibold">
            NutriSmart • Dra. Maria Eduarda
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
          >
            Fechar Visualizador
          </button>
        </div>
      </div>
    </div>
  );
};
