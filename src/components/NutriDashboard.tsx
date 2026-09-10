import React, { useState, useMemo } from 'react';
import {
  FilePlus,
  MessageSquare,
  UtensilsCrossed,
  Calendar,
  Clock,
  ArrowRight,
  ClipboardList,
  User,
  Users,
  ChevronRight,
  ChevronDown,
  Eye,
  FileText,
  Activity,
  HeartPulse,
  Calculator,
  Pin,
  ArrowUpDown,
} from 'lucide-react';
import { Appointment, ReportRecord, ChatMessage } from '../types';
import { calculateIMC } from '../lib/utils';
import { PatientFullReportModal } from './PatientFullReportModal';
import { HistoryDropdown } from './HistoryDropdown';
import { CustomDatePicker } from './CustomDatePicker';
import { togglePinnedPatientCode } from '../services/storage';
import { usePinnedPatientCodes } from '../hooks/useFirestoreData';

export interface NutriDashboardProps {
  reports: ReportRecord[];
  agenda: Appointment[];
  messages?: ChatMessage[];
  unreadCount?: number;
  onNewConsultation: () => void;
  onViewPatients: () => void;
  onViewAgenda: () => void;
  onViewKitchen: () => void;
  onViewChat: () => void;
  onViewCalculator?: () => void;
  onSelectReport: (report: ReportRecord) => void;
  onExportBackup?: () => void;
  onImportBackup?: () => void;
  onNavigateToChat?: (patientCode: string) => void;
}

interface DashboardPatientGroup {
  code: string;
  name: string;
  lastDate: string;
  latestReport: ReportRecord;
  history: ReportRecord[];
}

interface AgendaCategoryConfig {
  name: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const DASHBOARD_AGENDA_CATEGORIES: AgendaCategoryConfig[] = [
  {
    name: 'Santa Casa',
    colorClass: 'text-sky-700',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
  },
  {
    name: 'Visita Particular',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  {
    name: 'Lazer / Pessoal',
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
  },
  {
    name: 'Compromisso Diverso',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  {
    name: 'Outro / Personalizado',
    colorClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
  },
];

const getDashboardCategoryStyle = (typeStr: string) => {
  if (typeStr === 'Consulta Qualisan' || typeStr === 'Santa Casa') {
    return DASHBOARD_AGENDA_CATEGORIES[0];
  }
  return (
    DASHBOARD_AGENDA_CATEGORIES.find((c) => c.name === typeStr) || {
      name: typeStr,
      colorClass: 'text-indigo-700',
      bgClass: 'bg-indigo-50',
      borderClass: 'border-indigo-200',
    }
  );
};

export const NutriDashboard: React.FC<NutriDashboardProps> = ({
  reports,
  agenda,
  messages = [],
  unreadCount,
  onNewConsultation,
  onViewPatients,
  onViewAgenda,
  onViewKitchen,
  onViewChat,
  onViewCalculator,
  onSelectReport,
  onNavigateToChat,
}) => {
  const [selectedModalReport, setSelectedModalReport] = useState<ReportRecord | null>(null);
  const [selectedReportIdByPatient, setSelectedReportIdByPatient] = useState<Record<string, string>>({});

  // Pinned patients & Sorting for Prontuários widget (Real-time cloud sync across devices)
  const pinnedCodes = usePinnedPatientCodes();
  const [sortOption, setSortOption] = useState<'recent' | 'alpha' | 'oldest' | 'priority'>('recent');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const togglePin = async (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePinnedPatientCode(code);
  };

  const SORT_OPTIONS: { id: 'recent' | 'alpha' | 'oldest' | 'priority'; label: string }[] = [
    { id: 'recent', label: 'Data de Adição (Mais Recentes)' },
    { id: 'alpha', label: 'Ordem Alfabética (A-Z)' },
    { id: 'oldest', label: 'Data de Adição (Mais Antigos)' },
    { id: 'priority', label: 'Prioridade / Mensagens Não Lidas' },
  ];

  // Date filter for Dashboard Agenda Integrada widget
  const todayStr = new Date().toISOString().split('T')[0];
  const [agendaFilterDate, setAgendaFilterDate] = useState(todayStr);

  // Group unique patients
  const uniquePatients = Array.from(
    new Map(
      reports.map((r) => [
        r.patientCode,
        {
          code: r.patientCode,
          name: r.formData.nome,
          lastDate: r.date,
          latestReport: r,
          history: reports
            .filter((x) => x.patientCode.toUpperCase() === r.patientCode.toUpperCase())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        },
      ])
    ).values()
  ) as DashboardPatientGroup[];

  const sortedPatients = useMemo(() => {
    const list = [...uniquePatients];
    list.sort((a, b) => {
      const isPinnedA = pinnedCodes.includes(a.code.toUpperCase());
      const isPinnedB = pinnedCodes.includes(b.code.toUpperCase());

      // Pinned items ALWAYS stay at the very top!
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      if (sortOption === 'alpha') {
        return a.name.localeCompare(b.name, 'pt-BR');
      }
      if (sortOption === 'oldest') {
        return new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime();
      }
      if (sortOption === 'priority') {
        const unreadA = messages.filter(
          (m) => m.patientCode.toUpperCase() === a.code.toUpperCase() && m.sender === 'patient' && !m.read
        ).length;
        const unreadB = messages.filter(
          (m) => m.patientCode.toUpperCase() === b.code.toUpperCase() && m.sender === 'patient' && !m.read
        ).length;
        if (unreadA !== unreadB) return unreadB - unreadA;
        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      }
      // 'recent'
      return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
    });
    return list;
  }, [uniquePatients, pinnedCodes, sortOption, messages]);

  // Filter appointments for selected widget date
  const filteredAppointments = agenda
    .filter((a) => a.date === agendaFilterDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Active unread messages (strictly unread and unanswered)
  const pendingMessages =
    unreadCount !== undefined
      ? unreadCount
      : messages.filter((m) => {
          if (m.sender !== 'patient') return false;
          if (m.read === true) return false;
          const hasNutriReply = messages.some(
            (reply) =>
              reply.patientCode.toUpperCase() === m.patientCode.toUpperCase() &&
              reply.sender === 'nutri' &&
              new Date(reply.timestamp).getTime() >= new Date(m.timestamp).getTime()
          );
          return !hasNutriReply;
        }).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1 sm:pt-1.5 pb-8 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Sleek Clinical Header - Single Horizontal Line */}
      <header className="flex items-center justify-between pb-0.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-2xs border border-emerald-200/60 shrink-0">
            <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <h1 className="text-sm sm:text-base font-black text-slate-800 tracking-tight flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span>Painel Clínico Integrado</span>
            <span className="text-slate-300 font-normal select-none">•</span>
            <span className="text-emerald-700 font-bold text-xs sm:text-sm">Dra. Maria Eduarda</span>
          </h1>
        </div>
      </header>

      {/* Grid dos 5 Cards de Ações Rápidas: 1 Única Linha Ultra-Compacta em todas as telas (grid-cols-5) */}
      <section className="grid grid-cols-5 gap-1 sm:gap-2.5 w-full">
        {/* Card 1: Ficha Clínica (Tom Esmeralda/Verde) */}
        <button
          onClick={onNewConsultation}
          className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-xs shadow-emerald-600/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] flex flex-col justify-between min-h-[72px] sm:min-h-[82px]"
        >
          <div className="absolute -right-1.5 -bottom-1.5 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <FilePlus className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-emerald-100 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                Ficha
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-white/20 flex items-center justify-center text-white shrink-0">
                <FilePlus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-black tracking-tight leading-tight">
              +{reports.length}
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[8px] sm:text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.2 rounded font-bold truncate">
              Prescrever →
            </span>
          </div>
        </button>

        {/* Card 2: Pacientes & Mensagens (Tom Azul/Celeste) */}
        <button
          onClick={onViewPatients}
          className="bg-gradient-to-br from-sky-600 to-blue-600 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-xs shadow-sky-600/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] flex flex-col justify-between min-h-[72px] sm:min-h-[82px]"
        >
          <div className="absolute -right-1.5 -bottom-1.5 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <Users className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sky-100 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                Pacientes
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-white/20 flex items-center justify-center text-white shrink-0">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-black tracking-tight leading-tight flex items-center gap-1">
              {uniquePatients.length}
              {pendingMessages > 0 && (
                <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  +{pendingMessages}
                </span>
              )}
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[8px] sm:text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.2 rounded font-bold truncate">
              {pendingMessages > 0 ? `${pendingMessages} pend.` : 'Painel →'}
            </span>
          </div>
        </button>

        {/* Card 3: Receitas (Tom Âmbar/Laranja) */}
        <button
          onClick={onViewKitchen}
          className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-xs shadow-amber-500/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] flex flex-col justify-between min-h-[72px] sm:min-h-[82px]"
        >
          <div className="absolute -right-1.5 -bottom-1.5 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <UtensilsCrossed className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-amber-100 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                Receitas
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-white/20 flex items-center justify-center text-white shrink-0">
                <UtensilsCrossed className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-black tracking-tight leading-tight">
              42+
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[8px] sm:text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.2 rounded font-bold truncate">
              Cozinha →
            </span>
          </div>
        </button>

        {/* Card 4: Agenda (Tom Violeta/Roxo) */}
        <button
          onClick={onViewAgenda}
          className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-xs shadow-indigo-600/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] flex flex-col justify-between min-h-[72px] sm:min-h-[82px]"
        >
          <div className="absolute -right-1.5 -bottom-1.5 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-indigo-100 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                Agenda
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-white/20 flex items-center justify-center text-white shrink-0">
                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-black tracking-tight leading-tight">
              {agenda.filter((a) => a.date === todayStr).length} hoje
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[8px] sm:text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.2 rounded font-bold truncate">
              Ver →
            </span>
          </div>
        </button>

        {/* Card 5: Calculadora Nutricional (Tom Teal / Petróleo #0d9488) */}
        <button
          onClick={onViewCalculator}
          className="bg-gradient-to-br from-teal-600 to-cyan-700 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-xs shadow-teal-600/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] flex flex-col justify-between min-h-[72px] sm:min-h-[82px]"
        >
          <div className="absolute -right-1.5 -bottom-1.5 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <Calculator className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-teal-100 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                Cálculos
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-white/20 flex items-center justify-center text-white shrink-0">
                <Calculator className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-black tracking-tight leading-tight">
              Clínica
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[8px] sm:text-[10px] bg-white/20 hover:bg-white/30 px-1.5 py-0.2 rounded font-bold truncate">
              Calcular →
            </span>
          </div>
        </button>
      </section>

      {/* Main Content Split: Card "Prontuários" vs "Agenda Integrada" */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* Left / Main Column: Card "Prontuários" (8 cols) */}
        <div className="lg:col-span-8 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col space-y-3">
          {/* Header do Card com Título e Ações na Mesma Linha */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs shrink-0">
                <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                Prontuários
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                {uniquePatients.length} {uniquePatients.length === 1 ? 'paciente' : 'pacientes'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {/* Seletor Customizado de Ordenação (Custom Dropdown) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-[11px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Ordenar prontuários"
                >
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[140px]">
                    {SORT_OPTIONS.find((s) => s.id === sortOption)?.label.split('(')[0].trim()}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isSortOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsSortOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                        Ordenar Por
                      </div>
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSortOption(opt.id);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                            sortOption === opt.id
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {sortOption === opt.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={onNewConsultation}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 transition cursor-pointer active:scale-95 whitespace-nowrap shadow-2xs"
              >
                + Nova Prescrição
              </button>

              {/* Botão Ver Todos com Glassmorphism Refinado */}
              <button
                onClick={onViewPatients}
                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap flex items-center gap-1 group"
              >
                <span>Ver Todos</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Lista Compacta de Pacientes com Seletor de Histórico Customizado */}
          {sortedPatients.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
              <p className="text-xs font-bold">Nenhum prontuário emitido ainda</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Clique em &quot;+ Nova Prescrição&quot; para iniciar o primeiro atendimento
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {sortedPatients.map((patient) => {
                const selectedId = selectedReportIdByPatient[patient.code];
                const activeReport =
                  patient.history.find((r) => r.id === selectedId) || patient.latestReport;
                const imc = calculateIMC(activeReport.formData.peso, activeReport.formData.altura);
                const isPinned = pinnedCodes.includes(patient.code.toUpperCase());

                return (
                  <div
                    key={patient.code}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group ${
                      isPinned
                        ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200/90 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-emerald-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Info Esquerda */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          {patient.name.charAt(0)}
                        </div>
                        {isPinned && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                            <Pin className="w-2 h-2 fill-current rotate-45" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                            {patient.name}
                          </h4>
                          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                            {patient.code}
                          </span>
                          {isPinned && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 border border-amber-300/80 px-1.5 py-0.2 rounded-full shrink-0 flex items-center gap-0.5">
                              <Pin className="w-2 h-2 fill-amber-600 rotate-45" />
                              Fixado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          {activeReport.formData.peso} kg • IMC {imc.value} • {activeReport.formData.tipoDieta || 'Personalizada'}
                        </p>
                      </div>
                    </div>

                    {/* Ação Direita + Pin + Seletor de Histórico Customizado (NutriClinical UI) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center">
                      {/* Botão Discreto de Fixar (Pin) */}
                      <button
                        type="button"
                        onClick={(e) => togglePin(patient.code, e)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer active:scale-90 ${
                          isPinned
                            ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-2xs'
                            : 'bg-transparent text-slate-300 hover:text-amber-500 hover:bg-slate-100 border-transparent hover:border-slate-200'
                        }`}
                        title={
                          isPinned
                            ? 'Prontuário fixado no topo (clique para desafixar)'
                            : 'Fixar prontuário no topo'
                        }
                      >
                        <Pin
                          className={`w-3.5 h-3.5 ${
                            isPinned ? 'fill-amber-600 rotate-45' : ''
                          }`}
                        />
                      </button>

                      {/* Seletor Customizado para pacientes com múltiplas avaliações */}
                      {patient.history.length > 1 ? (
                        <HistoryDropdown
                          history={patient.history}
                          selectedReportId={activeReport.id}
                          onSelect={(selected) => {
                            setSelectedReportIdByPatient((prev) => ({
                              ...prev,
                              [patient.code]: selected.id,
                            }));
                          }}
                        />
                      ) : (
                        <span className="hidden md:inline text-[10px] text-slate-400 font-medium">
                          {new Date(patient.lastDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}

                      <button
                        onClick={() => setSelectedModalReport(activeReport)}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 font-bold text-[11px] sm:text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                        title="Ver Prontuário em Tela Cheia"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Prontuário</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Card Agenda Integrada (4 cols) com Custom Date Picker */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header com Custom Date Picker */}
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 truncate">
                    Agenda Integrada
                  </h3>
                </div>

                <CustomDatePicker
                  value={agendaFilterDate}
                  onChange={setAgendaFilterDate}
                  accentColor="purple"
                  placeholder="Data"
                />
              </div>

              {/* Lista de Compromissos da Data */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-0.5 mb-1">
                  <span>
                    {agendaFilterDate === todayStr
                      ? 'Hoje'
                      : new Date(agendaFilterDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span>{filteredAppointments.length} agendados</span>
                </div>

                {filteredAppointments.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs font-bold">Sem compromissos nesta data</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Horários livres disponíveis
                    </p>
                  </div>
                ) : (
                  filteredAppointments.slice(0, 4).map((app) => {
                    const catObj = getDashboardCategoryStyle(app.type);

                    return (
                      <div
                        key={app.id}
                        className={`p-2.5 rounded-2xl border ${catObj.borderClass} ${catObj.bgClass} hover:shadow-xs transition`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="px-2 py-0.5 rounded-xl bg-slate-800 text-white font-black font-mono text-[11px] shrink-0 mt-0.5 shadow-2xs">
                              {app.time}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border bg-white/90 ${catObj.colorClass} ${catObj.borderClass} truncate max-w-[130px]`}
                                >
                                  {app.type}
                                </span>
                              </div>

                              <h4 className="font-extrabold text-slate-900 text-xs truncate">
                                {app.title}
                              </h4>
                              {app.notes && (
                                <p className="text-[10px] text-slate-600 mt-0.5 leading-snug line-clamp-1">
                                  {app.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={onViewAgenda}
                            className="p-1 text-slate-400 hover:text-purple-600 hover:bg-white rounded-lg transition cursor-pointer shrink-0"
                            title="Ver na agenda"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={onViewAgenda}
              className="mt-3 w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
            >
              Ver Agenda Completa
            </button>
          </div>
        </div>
      </section>

      {/* Visualizador de Prontuário em Tela Cheia / Modal Amplo */}
      {selectedModalReport && (
        <PatientFullReportModal
          report={selectedModalReport}
          isOpen={Boolean(selectedModalReport)}
          onClose={() => setSelectedModalReport(null)}
          onNavigateToChat={onNavigateToChat}
        />
      )}
    </div>
  );
};

