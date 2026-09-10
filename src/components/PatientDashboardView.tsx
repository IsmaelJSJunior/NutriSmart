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
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';
import { ReportRecord, ChatMessage } from '../types';
import { SimpleLineChart } from './SimpleLineChart';
import { BlockCopyButton } from './BlockCopyButton';
import { calculateIMC, copyToClipboard } from '../lib/utils';
import { ChatView } from './ChatView';
import { SmartKitchenView } from './SmartKitchenView';
import { WaterIntakePanel } from './WaterIntakePanel';
import { exportClinicalReportPDF } from '../services/pdfExport';

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
  const [activeTab, setActiveTab] = useState<'plan' | 'water' | 'evolution' | 'chat' | 'kitchen'>('plan');
  const [showCredentials, setShowCredentials] = useState<boolean>(false);

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

  // Selected report state - defaults to the latest report!
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  React.useEffect(() => {
    if (latestReport && (!selectedReportId || !patientHistory.some((r) => r.id === selectedReportId))) {
      setSelectedReportId(latestReport.id);
    }
  }, [latestReport, patientHistory, selectedReportId]);

  const activeReport = patientHistory.find((r) => r.id === selectedReportId) || latestReport;

  const currentWeight = activeReport ? parseFloat(activeReport.formData.peso) || 0 : 0;
  const initialWeight = initialReport ? parseFloat(initialReport.formData.peso) || 0 : 0;
  const weightDiff = currentWeight - initialWeight;

  const imcResult = activeReport
    ? calculateIMC(activeReport.formData.peso, activeReport.formData.altura)
    : { value: '0.0', classification: 'N/A', colorClass: 'text-gray-500', numericValue: 0 };

  const pesoNum = parseFloat(activeReport?.formData.peso || '');
  const waterGoalMl = !isNaN(pesoNum) && pesoNum > 0
    ? Math.round(pesoNum * 40)
    : (parseFloat(activeReport?.formData.agua || '') ? Math.round(parseFloat(activeReport.formData.agua) * (parseFloat(activeReport.formData.agua) > 20 ? 1 : 1000)) : 2500);

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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Patient Welcome Hero */}
      <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 rounded-3xl py-4 sm:py-5 px-6 sm:px-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2 backdrop-blur border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            Portal do Paciente
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Olá, {latestReport.formData.nome}! 👋
          </h1>
          <p className="text-sky-100/90 text-sm mt-1">
            Acompanhamento com a <b>Dra. Maria Eduarda</b>
          </p>
          <div className="mt-2 inline-flex items-center gap-2 font-mono text-xs font-semibold bg-white/15 border border-white/20 px-3 py-1.5 rounded-xl backdrop-blur shadow-2xs">
            <span>
              Código:{' '}
              <strong className="text-white font-bold tracking-wider">
                {showCredentials ? patientCode : '••••••••'}
              </strong>
            </span>
            <span className="text-white/40">|</span>
            <span>
              Senha:{' '}
              <strong className="text-white font-bold tracking-wider">
                {showCredentials ? (latestReport.formData.senha || 'ana123') : '••••••••'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="ml-1 text-sky-200 hover:text-white p-1 rounded-lg hover:bg-white/15 transition cursor-pointer active:scale-95"
              title={showCredentials ? 'Ocultar credenciais' : 'Exibir credenciais'}
            >
              {showCredentials ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Seletor Customizado Multi-Prontuários para Pacientes com Mais de 1 Consulta */}
          {patientHistory.length > 1 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-sky-200 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-300" />
                Consulta:
              </span>
              <div className="relative inline-block">
                <select
                  value={activeReport.id}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-1.5 pl-3 pr-8 rounded-xl border border-white/25 backdrop-blur outline-none transition cursor-pointer appearance-none shadow-2xs"
                >
                  {[...patientHistory].reverse().map((rep) => {
                    const isLatest = rep.id === latestReport.id;
                    const dateFormatted = new Date(rep.date).toLocaleDateString('pt-BR');
                    return (
                      <option
                        key={rep.id}
                        value={rep.id}
                        className="text-slate-800 bg-white font-semibold text-xs"
                      >
                        {isLatest ? `Última (${dateFormatted}) ★` : `Consulta de ${dateFormatted}`}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-white/80 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {activeReport.id !== latestReport.id && (
                <button
                  type="button"
                  onClick={() => setSelectedReportId(latestReport.id)}
                  className="text-[10px] font-bold text-amber-200 bg-amber-500/30 hover:bg-amber-500/40 px-2 py-1 rounded-lg border border-amber-300/40 transition cursor-pointer active:scale-95"
                  title="Voltar ao prontuário mais recente"
                >
                  Voltar à Mais Recente
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Anthropometric Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-2.5 bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur shrink-0 text-center">
          <div className="px-3 py-1">
            <span className="text-[10px] text-sky-200 font-bold block uppercase">
              {activeReport.id === latestReport.id ? 'Peso Atual' : 'Peso Consulta'}
            </span>
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
            <span className="text-lg font-black text-white">{waterGoalMl.toLocaleString('pt-BR')} ml</span>
            <span className="text-[10px] font-bold text-sky-200 block">por dia</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Responsive Chromatic Theming */}
      <div className="w-full flex items-center gap-1 sm:gap-2 overflow-hidden bg-white/90 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Tab: Cardápio / Prescrição (Emerald) */}
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          title="Meu Cardápio & Treino"
          className={`flex-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-xl sm:rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none border ${
            activeTab === 'plan'
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/40'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              activeTab === 'plan'
                ? 'bg-emerald-500 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-500 border border-emerald-100'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="hidden sm:inline whitespace-nowrap text-[11px] sm:text-xs">Cardápio & Treino</span>
        </button>

        {/* Tab: Ingestão Hídrica (Sky) */}
        <button
          type="button"
          onClick={() => setActiveTab('water')}
          title="Ingestão Hídrica"
          className={`flex-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-xl sm:rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none border ${
            activeTab === 'water'
              ? 'bg-sky-50/90 border-sky-300 text-sky-900 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-sky-950 hover:bg-sky-50/40'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              activeTab === 'water'
                ? 'bg-sky-500 text-white shadow-2xs'
                : 'bg-sky-50 text-sky-500 border border-sky-100'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="hidden sm:inline whitespace-nowrap text-[11px] sm:text-xs">Ingestão Hídrica</span>
        </button>

        {/* Tab: Minha Evolução (Purple) */}
        <button
          type="button"
          onClick={() => setActiveTab('evolution')}
          title="Minha Evolução"
          className={`flex-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-xl sm:rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none border ${
            activeTab === 'evolution'
              ? 'bg-purple-50/90 border-purple-300 text-purple-900 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-purple-950 hover:bg-purple-50/40'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              activeTab === 'evolution'
                ? 'bg-purple-500 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-500 border border-purple-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="hidden sm:inline whitespace-nowrap text-[11px] sm:text-xs">Minha Evolução</span>
        </button>

        {/* Tab: Mensagens / Chat (Blue) */}
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          title="Falar com a Nutri"
          className={`flex-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-xl sm:rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none border ${
            activeTab === 'chat'
              ? 'bg-blue-50/90 border-blue-300 text-blue-900 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-blue-950 hover:bg-blue-50/40'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0 relative ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
            )}
          </div>
          <span className="hidden sm:inline whitespace-nowrap text-[11px] sm:text-xs">Falar com a Nutri</span>
        </button>

        {/* Tab: Receitas / Cozinha (Orange) */}
        <button
          type="button"
          onClick={() => setActiveTab('kitchen')}
          title="Cozinha Inteligente"
          className={`flex-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-xl sm:rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none border ${
            activeTab === 'kitchen'
              ? 'bg-orange-50/90 border-orange-300 text-orange-900 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-orange-950 hover:bg-orange-50/40'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              activeTab === 'kitchen'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'bg-orange-50 text-orange-500 border border-orange-100'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="hidden sm:inline whitespace-nowrap text-[11px] sm:text-xs">Cozinha Inteligente</span>
        </button>
      </div>

      {/* Tab Panels with Fluid Transitions */}
      <div key={activeTab} className="animate-view-transition">
        {/* Tab Content 1: Meu Cardápio */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            {/* Aviso quando estiver visualizando histórico */}
            {activeReport.id !== latestReport.id && (
              <div className="bg-amber-50 border border-amber-200/90 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-2 text-xs text-amber-900 animate-in fade-in shadow-2xs">
                <span>
                  Você está visualizando a consulta histórica de{' '}
                  <b>{new Date(activeReport.date).toLocaleDateString('pt-BR')}</b>. O plano ativo atual é de{' '}
                  {new Date(latestReport.date).toLocaleDateString('pt-BR')}.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedReportId(latestReport.id)}
                  className="font-bold underline text-amber-900 hover:text-amber-700 shrink-0 cursor-pointer active:scale-95"
                >
                  Ver Atual
                </button>
              </div>
            )}

            {/* Action Print & Summary */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {activeReport.id === latestReport.id ? 'Seu Plano Nutricional Ativo' : 'Plano da Consulta Selecionada'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data da consulta: {new Date(activeReport.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportClinicalReportPDF(activeReport)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-bold text-xs transition cursor-pointer active:scale-95 border border-slate-200/80 hover:border-emerald-200 shadow-2xs"
                    title="Exportar Prontuário e Cardápio em PDF Oficial (Padrão A4)"
                  >
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <span>Imprimir / PDF</span>
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
                    content={activeReport.aiData?.mealPlan || activeReport.aiMealPlan || ''}
                  />
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-slate-800 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {activeReport.aiData?.mealPlan || activeReport.aiMealPlan || 'Plano em elaboração.'}
                </div>
              </div>

              {/* Training */}
              {activeReport.aiData?.training && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-sky-600" />
                      Treino & Atividade Física Recomendada
                    </h3>
                    <BlockCopyButton title="Meu Treino" content={activeReport.aiData.training} />
                  </div>
                  <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-100 text-slate-800 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {activeReport.aiData.training}
                  </div>
                </div>
              )}

              {/* Supplementation */}
              {activeReport.aiData?.supplements && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Pill className="w-4 h-4 text-purple-600" />
                      Suplementação Prescrita
                    </h3>
                    <BlockCopyButton title="Minha Suplementação" content={activeReport.aiData.supplements} />
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 text-slate-800 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {activeReport.aiData.supplements}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content 2: Ingestão Hídrica */}
        {activeTab === 'water' && (
          <WaterIntakePanel
            patientCode={patientCode}
            patientName={latestReport.formData.nome}
            defaultGoalMl={waterGoalMl}
          />
        )}

        {/* Tab Content 2: Minha Evolução */}
        {activeTab === 'evolution' && (
          <div className="space-y-6">
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
          <div>
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
          <div>
            <SmartKitchenView
              onBack={() => setActiveTab('plan')}
              patientGoal={latestReport.formData.objetivo}
              patientRestrictions={latestReport.formData.restricoes}
              isPatientPortal={true}
              patientCode={patientCode}
            />
          </div>
        )}
      </div>
    </div>
  );
};
