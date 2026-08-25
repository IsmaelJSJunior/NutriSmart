import React, { useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Printer,
  Share2,
  Copy,
  Check,
  Dumbbell,
  Pill,
  Activity,
  Utensils,
  Wand2,
  Save,
  MessageCircle,
  AlertCircle,
  FileCheck,
  Edit3,
  Loader2,
} from 'lucide-react';
import { ReportRecord, AiNutritionPlan } from '../types';
import { BlockCopyButton } from './BlockCopyButton';
import { copyToClipboard } from '../lib/utils';
import { requestRefinePlanAI } from '../services/ai';
import { dataStore } from '../services/storage';

interface ClinicalReportViewProps {
  report: ReportRecord;
  onBack: () => void;
  onNavigateToChat?: (patientCode: string) => void;
  onUpdateReport?: (updated: ReportRecord) => void;
}

export const ClinicalReportView: React.FC<ClinicalReportViewProps> = ({
  report,
  onBack,
  onNavigateToChat,
  onUpdateReport,
}) => {
  const [mealPlanText, setMealPlanText] = useState(
    report.aiData?.mealPlan || report.aiMealPlan || ''
  );
  const [trainingText, setTrainingText] = useState(report.aiData?.training || '');
  const [supplementsText, setSupplementsText] = useState(report.aiData?.supplements || '');
  const [deficienciasText, setDeficienciasText] = useState(report.aiData?.deficiencias || '');

  const [refineInstruction, setRefineInstruction] = useState('');
  const [refining, setRefining] = useState(false);
  const [copiedAll, setCopiedCopiedAll] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { formData } = report;

  // Handle Save Manual Edits
  const handleSaveEdits = async () => {
    const updatedPlan: AiNutritionPlan = {
      mealPlan: mealPlanText,
      training: trainingText,
      supplements: supplementsText,
      deficiencias: deficienciasText,
    };

    const updatedReport: ReportRecord = {
      ...report,
      aiData: updatedPlan,
      aiMealPlan: mealPlanText,
    };

    await dataStore.saveReport(updatedReport);
    if (onUpdateReport) onUpdateReport(updatedReport);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Handle Magic Revision by AI
  const handleMagicRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInstruction.trim()) return;

    setRefining(true);
    try {
      const currentPlan: AiNutritionPlan = {
        mealPlan: mealPlanText,
        training: trainingText,
        supplements: supplementsText,
        deficiencias: deficienciasText,
      };

      const refined = await requestRefinePlanAI(
        formData.objetivo,
        formData.restricoes,
        currentPlan,
        refineInstruction
      );

      setMealPlanText(refined.mealPlan);
      setTrainingText(refined.training);
      setSupplementsText(refined.supplements);
      setDeficienciasText(refined.deficiencias);

      const updatedReport: ReportRecord = {
        ...report,
        aiData: refined,
        aiMealPlan: refined.mealPlan,
      };

      await dataStore.saveReport(updatedReport);
      if (onUpdateReport) onUpdateReport(updatedReport);

      setRefineInstruction('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Falha ao refinar com a IA:', err);
    } finally {
      setRefining(false);
    }
  };

  // Copy Complete Plan for WhatsApp
  const handleCopyFullWhatsApp = async () => {
    const fullText = `*NUTRISMART • PRESCRIÇÃO CLÍNICA PERSONALIZADA*
👤 *Paciente:* ${formData.nome}
🎯 *Objetivo:* ${formData.objetivo}
📅 *Data:* ${new Date(report.date).toLocaleDateString('pt-BR')}
🔑 *Código do Paciente:* ${report.patientCode}

═════════════════════════════
🥗 *PLANO ALIMENTAR:*
${mealPlanText}

═════════════════════════════
💪 *TREINO RECOMENDADO:*
${trainingText}

═════════════════════════════
💊 *SUPLEMENTAÇÃO ESTRATÉGICA:*
${supplementsText}

═════════════════════════════
🔬 *RASTREAMENTO & CARÊNCIAS NUTRICIONAIS:*
${deficienciasText}

═════════════════════════════
_NutriSmart • Dra. Maria Eduarda (Nutrição Clínica & Funcional)_`;

    const success = await copyToClipboard(fullText);
    if (success) {
      setCopiedCopiedAll(true);
      setTimeout(() => setCopiedCopiedAll(false), 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos Prontuários
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToChat && (
            <button
              onClick={() => onNavigateToChat(report.patientCode)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition"
              title="Abrir chat direto com este paciente"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat com Paciente</span>
            </button>
          )}

          <button
            onClick={handleCopyFullWhatsApp}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition shadow-xs ${
              copiedAll
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
            title="Copiar texto formatado para o WhatsApp"
          >
            {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAll ? 'Copiado para WhatsApp!' : 'Copiar Tudo (WhatsApp)'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition shadow-xs"
            title="Imprimir prontuário em PDF limpo"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Clinical Document Container (Printable) */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Printable Official Header */}
        <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-md print:bg-emerald-600">
              NS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">NutriSmart</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                  Prescrição Oficial
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Dra. Maria Eduarda • Nutrição Clínica Funcional & Esportiva
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 font-medium space-y-0.5">
            <p>
              <b>Data de Emissão:</b> {new Date(report.date).toLocaleDateString('pt-BR')}
            </p>
            <p>
              <b>Código do Paciente:</b>{' '}
              <span className="font-mono font-black bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                {report.patientCode}
              </span>
            </p>
            {report.fichaNumber && <p><b>Consulta Nº:</b> {report.fichaNumber}</p>}
          </div>
        </div>

        {/* Patient Summary Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Paciente</span>
            <span className="font-extrabold text-slate-800 text-sm truncate block">{formData.nome}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Idade / Contato</span>
            <span className="font-bold text-slate-700">{formData.idade || '--'} anos • {formData.telefone || '--'}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Peso / Altura</span>
            <span className="font-bold text-slate-700">{formData.peso} kg • {formData.altura} cm</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Objetivo</span>
            <span className="font-extrabold text-emerald-700">{formData.objetivo}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Estratégia</span>
            <span className="font-bold text-slate-800">{formData.tipoDieta || 'Padrão'}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Meta Calórica</span>
            <span className="font-bold text-slate-800">{formData.calorias ? `${formData.calorias} kcal` : 'Livre'}</span>
          </div>
        </div>

        {/* SECTION 1: Plano Alimentar (Thematic Emojis & Compact Bullets) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">1. Plano Alimentar Detalhado</h2>
            </div>
            <BlockCopyButton title="Plano Alimentar" content={mealPlanText} />
          </div>

          <textarea
            rows={12}
            value={mealPlanText}
            onChange={(e) => setMealPlanText(e.target.value)}
            className="w-full p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-slate-800 text-sm font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y"
          />
        </div>

        {/* SECTION 2: Treino e Atividade Física */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">2. Prescrição de Exercícios & Treino</h2>
            </div>
            <BlockCopyButton title="Recomendação de Treino" content={trainingText} />
          </div>

          <textarea
            rows={4}
            value={trainingText}
            onChange={(e) => setTrainingText(e.target.value)}
            className="w-full p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-slate-800 text-sm font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y"
          />
        </div>

        {/* SECTION 3: Suplementação Estratégica */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">3. Suplementação & Fitoterapia</h2>
            </div>
            <BlockCopyButton title="Suplementação Estratégica" content={supplementsText} />
          </div>

          <textarea
            rows={4}
            value={supplementsText}
            onChange={(e) => setSupplementsText(e.target.value)}
            className="w-full p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-slate-800 text-sm font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y"
          />
        </div>

        {/* SECTION 4: Rastreamento Clínico & Carências */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">4. Rastreamento Clínico & Carências Nutricionais</h2>
            </div>
            <BlockCopyButton title="Rastreamento Clínico" content={deficienciasText} />
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80">
            <textarea
              rows={4}
              value={deficienciasText}
              onChange={(e) => setDeficienciasText(e.target.value)}
              className="w-full p-3 rounded-xl bg-white border border-amber-200 text-slate-800 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-amber-500 focus:outline-none resize-y"
            />
          </div>
        </div>

        {/* Save Edits Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Edit3 className="w-4 h-4 text-emerald-600" />
            <span>Você pode editar os textos diretamente nos campos acima</span>
          </div>

          <button
            onClick={handleSaveEdits}
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95"
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Alterações Salvas!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* AI Magic Refinement Box ("Revisão Mágica por IA") */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl print:hidden border border-indigo-800/50 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Revisão Mágica por IA (Gemini 3.7)</h3>
            <p className="text-xs text-indigo-200/80">
              Solicite alterações pontuais em linguagem natural (ex: &quot;Substituir o frango por peixe no almoço e incluir pré-treino leve&quot;)
            </p>
          </div>
        </div>

        <form onSubmit={handleMagicRefine} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={refineInstruction}
            onChange={(e) => setRefineInstruction(e.target.value)}
            placeholder="Digite a alteração desejada para o plano..."
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur"
          />

          <button
            type="submit"
            disabled={refining || !refineInstruction.trim()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
          >
            {refining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refinando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Aplicar Ajuste
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
