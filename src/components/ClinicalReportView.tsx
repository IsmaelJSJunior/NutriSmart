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
  Scale,
  Percent,
  Droplets,
  Camera,
  Ruler,
  Image as ImageIcon,
} from 'lucide-react';
import { ReportRecord, AiNutritionPlan } from '../types';
import { BlockCopyButton } from './BlockCopyButton';
import { copyToClipboard, calculateIMC } from '../lib/utils';
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
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const { formData } = report;
  const imcObj = calculateIMC(formData.peso, formData.altura);

  // Helper for 9 skinfolds sum
  const dobrasKeys = [
    'dobraTriceps',
    'dobraSubescapular',
    'dobraAxilarMedia',
    'dobraPeitoral',
    'dobraSuprailiaca',
    'dobraAbdominal',
    'dobraCoxa',
    'dobraPanturrilha',
    'dobraBiceps',
  ];
  let somaDobras = 0;
  dobrasKeys.forEach((k) => {
    const val = parseFloat((formData as any)[k]);
    if (!isNaN(val) && val > 0) somaDobras += val;
  });

  // Water Goal calculation (weight * 40ml or fallback to formData.agua)
  const pesoNum = parseFloat(formData.peso);
  const waterGoalMl = !isNaN(pesoNum) && pesoNum > 0 ? Math.round(pesoNum * 40) : null;

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
      setRefineInstruction('');
    } catch (err) {
      console.error('Erro no refinamento com IA:', err);
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
🔑 *Código de Acesso:* ${report.patientCode}
🔒 *Senha de Acesso:* ${formData.senha || 'Não cadastrada'}

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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Top Action Bar - Standardized Design System */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-emerald-100/90 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-2xs border border-emerald-200/60 shrink-0">
            <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Prontuário & Prescrição</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] sm:text-xs text-slate-600 font-bold">{formData.nome}</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold text-slate-700">
                <span>Código: <strong className="text-sky-700 font-black">{report.patientCode}</strong></span>
                <span className="text-slate-300">|</span>
                <span>Senha: <strong className="text-indigo-700 font-black">{formData.senha || 'Não cadastrada'}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    const text = `NutriSmart - Credenciais do Paciente:\nNome: ${formData.nome}\nCódigo: ${report.patientCode}\nSenha: ${formData.senha || 'Não cadastrada'}`;
                    navigator.clipboard.writeText(text);
                    setCopiedCredentials(true);
                    setTimeout(() => setCopiedCredentials(false), 2000);
                  }}
                  className="p-0.5 hover:bg-white rounded text-slate-500 hover:text-emerald-600 transition active:scale-95 cursor-pointer ml-0.5"
                  title="Copiar Código e Senha do Paciente"
                >
                  {copiedCredentials ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToChat && (
            <button
              onClick={() => onNavigateToChat(report.patientCode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 font-bold text-xs hover:bg-sky-100 transition cursor-pointer active:scale-95"
              title="Abrir chat direto com este paciente"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat com Paciente</span>
            </button>
          )}

          <button
            onClick={handleCopyFullWhatsApp}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs cursor-pointer active:scale-95 ${
              copiedAll
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Copiar texto formatado para o WhatsApp"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAll ? 'Copiado!' : 'Copiar Tudo (WhatsApp)'}</span>
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

          <div className="text-left sm:text-right text-xs text-slate-600 font-medium space-y-1">
            <p>
              <b>Data de Emissão:</b> {new Date(report.date).toLocaleDateString('pt-BR')}
            </p>
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-mono text-[11px]">
              <span>Código: <strong className="text-sky-800 font-black">{report.patientCode}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Senha: <strong className="text-indigo-800 font-black">{formData.senha || 'Não cadastrada'}</strong></span>
            </div>
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

        {/* BLOCO DE ANTROPOMETRIA CLÍNICA & COMPOSIÇÃO CORPORAL */}
        <div className="p-5 rounded-3xl bg-slate-50/90 border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Avaliação Antropométrica & Composição Corporal
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Circunferências bilaterais, protocolo de pregas cutâneas e metas de hidratação
                </p>
              </div>
            </div>

            {waterGoalMl && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold shadow-2xs">
                <Droplets className="w-3.5 h-3.5 text-sky-500" />
                <span>Meta Hídrica: <strong>{waterGoalMl.toLocaleString('pt-BR')} ml/dia</strong> ({(waterGoalMl / 1000).toFixed(1).replace('.', ',')} L)</span>
              </span>
            )}
          </div>

          {/* Destaques: IMC + %GC (Siri) + Meta de Água */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">IMC Corporal</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-slate-900">{imcObj.value}</span>
                <span className={`text-[10px] font-extrabold ${imcObj.colorClass}`}>{imcObj.classification}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">% Gordura Corporal</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-emerald-700">
                  {formData.percentualGordura ? `${formData.percentualGordura}%` : '--'}
                </span>
                {formData.classificacaoGordura && (
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {formData.classificacaoGordura}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Densidade Corporal</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-slate-800">
                  {formData.densidadeCorporal || '--'}
                </span>
                <span className="text-[10px] font-bold text-slate-400">g/cm³</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Consumo de Água</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="text-sm font-black text-sky-900">
                  {waterGoalMl ? `${waterGoalMl.toLocaleString('pt-BR')} ml` : `${formData.agua} L`}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-bloco A: Circunferências Bilaterais Detalhadas */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                Circunferências Corporais Bilaterais (cm)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Membros D vs. E</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Braço Direito (Rel / Cont)</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.bracoDireitoRelaxado || formData.braco || '--'} cm / {formData.bracoDireitoContraido || '--'} cm
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Braço Esquerdo (Rel / Cont)</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.bracoEsquerdoRelaxado || '--'} cm / {formData.bracoEsquerdoContraido || '--'} cm
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Ombros & Peitoral</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.ombros || '--'} cm / {formData.peitoral || formData.peito || '--'} cm
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Cintura & Abdômen</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.cintura || '--'} cm / {formData.abdomen || '--'} cm
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Quadril</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.quadril || '--'} cm
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Coxa Direita</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.coxaDireita || formData.coxa || '--'} cm
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Coxa Esquerda</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.coxaEsquerda || '--'} cm
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Panturrilha Direita</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.panturrilhaDireita || formData.panturrilha || '--'} cm
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Panturrilha Esquerda</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {formData.panturrilhaEsquerda || '--'} cm
                </span>
              </div>
            </div>
          </div>

          {/* Sub-bloco B: Pregas Cutâneas (Protocolo de 9 Dobras em mm) */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-teal-600" />
                Pregas Cutâneas (Protocolo de 9 Dobras em mm)
              </span>
              {somaDobras > 0 && (
                <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Soma Total: {somaDobras.toFixed(1)} mm
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 text-center text-xs">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">1. Tríceps</span>
                <span className="font-extrabold text-slate-800">{formData.dobraTriceps || '--'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">2. Subescapular</span>
                <span className="font-extrabold text-slate-800">{formData.dobraSubescapular || '--'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">3. Axilar M.</span>
                <span className="font-extrabold text-slate-800">{formData.dobraAxilarMedia || '--'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">4. Peitoral</span>
                <span className="font-extrabold text-slate-800">{formData.dobraPeitoral || '--'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">5. Supra-ilíaca</span>
                <span className="font-extrabold text-slate-800">{formData.dobraSuprailiaca || '--'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">6. Abdominal</span>
                <span className="font-extrabold text-slate-800">{formData.dobraAbdominal || '--'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">7. Coxa</span>
                <span className="font-extrabold text-slate-800">{formData.dobraCoxa || '--'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">8. Panturrilha</span>
                <span className="font-extrabold text-slate-800">{formData.dobraPanturrilha || '--'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 block truncate">9. Bíceps</span>
                <span className="font-extrabold text-slate-800">{formData.dobraBiceps || '--'} mm</span>
              </div>
            </div>
          </div>

          {/* Sub-bloco C: Galeria de Fotos Evolutivas (se houver) */}
          {(formData.fotos || []).length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5 print:break-inside-avoid">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  Galeria de Evolução Fotográfica do Paciente
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {(formData.fotos || []).length} registro{(formData.fotos || []).length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {(formData.fotos || []).map((photo) => (
                  <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <div className="aspect-3/4 w-full overflow-hidden bg-slate-100">
                      <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-1.5 bg-white text-center">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-md block truncate">
                        {photo.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <h3 className="font-extrabold text-base text-white">Revisão Mágica por IA</h3>
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
