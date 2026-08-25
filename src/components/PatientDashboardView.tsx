import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Activity,
  MessageSquare,
  UtensilsCrossed,
  Printer,
  Copy,
  Check,
  Scale,
  Heart,
  Droplets,
  Calendar,
  Sparkles,
  Dumbbell,
  Pill,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ReportRecord, ChatMessage } from '../types';
import { SimpleLineChart } from './SimpleLineChart';
import { BlockCopyButton } from './BlockCopyButton';
import { calculateIMC, copyToClipboard } from '../lib/utils';
import { ChatView } from './ChatView';
import { SmartKitchenView } from './SmartKitchenView';

interface PatientDashboardViewProps {
  patientCode: string;
  patientName: string;
  reports: ReportRecord[];
  messages: ChatMessage[];
  onLogout: () => void;
}

export const PatientDashboardView: React.FC<PatientDashboardViewProps> = ({
  patientCode,
  patientName,
  reports,
  messages,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'evolution' | 'chat' | 'kitchen'>('plan');

  // Filter patient's reports sorted chronologically
  const patientHistory = useMemo(() => {
    const list = reports.filter(
      (r) => r.patientCode.toUpperCase() === patientCode.toUpperCase()
    );
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return list;
  }, [reports, patientCode]);

  const latestReport = patientHistory[patientHistory.length - 1];
  const initialReport = patientHistory[0];

  const currentWeight = latestReport ? parseFloat(latestReport.formData.peso) || 0 : 0;
  const initialWeight = initialReport ? parseFloat(initialReport.formData.peso) || 0 : 0;
  const weightDiff = currentWeight - initialWeight;

  const imcResult = latestReport
    ? calculateIMC(latestReport.formData.peso, latestReport.formData.altura)
    : { value: '0.0', classification: 'N/A', colorClass: 'text-gray-500', numericValue: 0 };

  const chartData = useMemo(() => {
    return patientHistory.map((r) => ({
      date: r.date,
      peso: r.formData.peso,
      imc: calculateIMC(r.formData.peso, r.formData.altura).numericValue,
      abdomen: r.formData.abdomen,
      cintura: r.formData.cintura,
      braco: r.formData.braco,
      quadril: r.formData.quadril,
    }));
  }, [patientHistory]);

  const unreadMessagesCount = useMemo(() => {
    return messages.filter(
      (m) => m.patientCode.toUpperCase() === patientCode.toUpperCase() && m.sender === 'nutri'
    ).length;
  }, [messages, patientCode]);

  if (!latestReport) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md">
          <p className="text-slate-600 font-bold text-sm">
            Nenhum plano encontrado para o código &quot;{patientCode}&quot;.
          </p>
          <button
            onClick={onLogout}
            className="mt-4 px-4 py-2 bg-sky-600 text-white font-bold text-xs rounded-xl"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Patient Welcome Hero */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-3 backdrop-blur border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            Portal do Paciente NutriSmart
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Olá, {latestReport.formData.nome}! 👋
          </h1>
          <p className="text-sky-100/90 text-sm mt-1 max-w-xl">
            Acompanhamento com a <b>Dra. Maria Eduarda</b> • Código: <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">{patientCode}</span>
          </p>
        </div>

        {/* Quick Anthropometric Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-2.5 bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur shrink-0 text-center">
          <div className="px-3 py-1">
            <span className="text-[10px] text-sky-200 font-bold block uppercase">Peso Atual</span>
            <span className="text-lg font-black text-white">{currentWeight} kg</span>
            {patientHistory.length > 1 && (
              <span className="text-[10px] font-bold text-emerald-300 block">
                {weightDiff < 0 ? `-${Math.abs(weightDiff).toFixed(1)} kg` : `+${weightDiff.toFixed(1)} kg`}
              </span>
            )}
          </div>

          <div className="px-3 py-1 border-x border-white/20">
            <span className="text-[10px] text-sky-200 font-bold block uppercase">IMC</span>
            <span className="text-lg font-black text-white">{imcResult.value}</span>
            <span className="text-[10px] font-bold text-sky-200 block truncate max-w-[80px]">
              {imcResult.classification.split(' ')[0]}
            </span>
          </div>

          <div className="px-3 py-1">
            <span className="text-[10px] text-sky-200 font-bold block uppercase">Meta de Água</span>
            <span className="text-lg font-black text-white">{latestReport.formData.agua || '2.5'} L</span>
            <span className="text-[10px] font-bold text-sky-200 block">por dia</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white/80 backdrop-blur p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'plan'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Meu Cardápio & Treino</span>
        </button>

        <button
          onClick={() => setActiveTab('evolution')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'evolution'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Minha Evolução</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition relative ${
            activeTab === 'chat'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Falar com a Nutri</span>
        </button>

        <button
          onClick={() => setActiveTab('kitchen')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'kitchen'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Cozinha Inteligente</span>
        </button>
      </div>

      {/* Tab Content 1: Meu Cardápio */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Action Print & Summary */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Seu Plano Nutricional Ativo</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atualizado em {new Date(latestReport.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Cardápio</span>
                </button>
              </div>
            </div>

            {/* Meal Plan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  Refeições do Dia
                </h3>
                <BlockCopyButton
                  title="Meu Plano Alimentar"
                  content={latestReport.aiData?.mealPlan || latestReport.aiMealPlan || ''}
                />
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-slate-800 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {latestReport.aiData?.mealPlan || latestReport.aiMealPlan || 'Plano em elaboração.'}
              </div>
            </div>

            {/* Training */}
            {latestReport.aiData?.training && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-sky-600" />
                    Treino & Atividade Física Recomendada
                  </h3>
                  <BlockCopyButton title="Meu Treino" content={latestReport.aiData.training} />
                </div>
                <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-100 text-slate-800 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {latestReport.aiData.training}
                </div>
              </div>
            )}

            {/* Supplementation */}
            {latestReport.aiData?.supplements && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Pill className="w-4 h-4 text-purple-600" />
                    Suplementação Prescrita
                  </h3>
                  <BlockCopyButton title="Minha Suplementação" content={latestReport.aiData.supplements} />
                </div>
                <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 text-slate-800 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {latestReport.aiData.supplements}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Minha Evolução */}
      {activeTab === 'evolution' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900">Seus Gráficos de Evolução Corporal</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhe o progresso do seu peso, IMC e medidas ao longo do acompanhamento
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SimpleLineChart
                data={chartData}
                dataKey="peso"
                color="#059669"
                label="Evolução de Peso Corporal"
              />
              <SimpleLineChart
                data={chartData}
                dataKey="imc"
                color="#0284c7"
                label="Evolução de IMC"
              />
              <SimpleLineChart
                data={chartData}
                dataKey="abdomen"
                color="#f59e0b"
                label="Evolução de Abdômen"
              />
              <SimpleLineChart
                data={chartData}
                dataKey="cintura"
                color="#8b5cf6"
                label="Evolução de Cintura"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Chat com a Nutricionista */}
      {activeTab === 'chat' && (
        <div className="animate-in fade-in">
          <ChatView
            patientCode={patientCode}
            patientName={latestReport.formData.nome}
            senderRole="patient"
            messages={messages}
            latestReport={latestReport}
            onBack={() => setActiveTab('plan')}
          />
        </div>
      )}

      {/* Tab Content 4: Cozinha Inteligente */}
      {activeTab === 'kitchen' && (
        <div className="animate-in fade-in">
          <SmartKitchenView
            onBack={() => setActiveTab('plan')}
            patientGoal={latestReport.formData.objetivo}
            patientRestrictions={latestReport.formData.restricoes}
          />
        </div>
      )}
    </div>
  );
};
