import React, { useState } from 'react';
import {
  FilePlus,
  MessageSquare,
  UtensilsCrossed,
  Calendar,
  Clock,
  ArrowRight,
  ClipboardList,
  User,
  ChevronRight,
  Eye,
  FileText,
  Activity,
} from 'lucide-react';
import { Appointment, ReportRecord, ChatMessage, PatientGroup } from '../types';
import { calculateIMC } from '../lib/utils';
import { PatientFullReportModal } from './PatientFullReportModal';

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
  onSelectReport: (report: ReportRecord) => void;
  onExportBackup?: () => void;
  onImportBackup?: () => void;
  onNavigateToChat?: (patientCode: string) => void;
}

export const NutriDashboard: React.FC<NutriDashboardProps> = ({
  reports,
  agenda,
  messages = [],
  onNewConsultation,
  onViewPatients,
  onViewAgenda,
  onViewKitchen,
  onViewChat,
  onSelectReport,
  onNavigateToChat,
}) => {
  const [selectedModalReport, setSelectedModalReport] = useState<ReportRecord | null>(null);

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
          history: reports.filter((x) => x.patientCode === r.patientCode),
          consultationCount: reports.filter((x) => x.patientCode === r.patientCode).length,
        },
      ])
    ).values()
  ) as PatientGroup[];

  // Sort patients by latest consultation
  const sortedPatients = [...uniquePatients].sort(
    (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
  );

  // Today's appointments
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = agenda
    .filter((a) => a.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Active unread messages
  const pendingMessages = messages.filter((m) => m.sender === 'patient').length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3.5 sm:space-y-4">
      {/* Sleek Minimalist Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            NutriSmart <span className="text-emerald-600 text-xs sm:text-sm font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">v1.00</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium">
            Painel Clínico Integrado • Dra. Maria Eduarda
          </p>
        </div>
      </header>

      {/* Grid dos 4 Cards de Ações Rápidas: 2x2 no Mobile / 4x1 no Desktop */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: Nova Ficha (Tom Esmeralda/Verde) */}
        <button
          onClick={onNewConsultation}
          className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-3.5 sm:p-4 rounded-2xl text-white shadow-sm shadow-emerald-600/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 hover:scale-[1.01] active:scale-98 flex flex-col justify-between min-h-[120px] sm:min-h-[135px]"
        >
          <div className="absolute -right-3 -bottom-3 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <FilePlus className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-emerald-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Nova Ficha
              </span>
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <FilePlus className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
              +{reports.length}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] sm:text-xs bg-white/20 hover:bg-white/30 px-2 sm:px-2.5 py-0.5 rounded-full font-bold truncate">
              Nova Prescrição →
            </span>
          </div>
        </button>

        {/* Card 2: Mensagens (Tom Azul/Celeste) */}
        <button
          onClick={onViewChat}
          className="bg-gradient-to-br from-sky-600 to-blue-600 p-3.5 sm:p-4 rounded-2xl text-white shadow-sm shadow-sky-600/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 hover:scale-[1.01] active:scale-98 flex flex-col justify-between min-h-[120px] sm:min-h-[135px]"
        >
          <div className="absolute -right-3 -bottom-3 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <MessageSquare className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sky-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Mensagens
              </span>
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5 flex items-center gap-1.5">
              {String(pendingMessages || messages.length || 0).padStart(2, '0')}
              {pendingMessages > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] sm:text-xs bg-white/20 hover:bg-white/30 px-2 sm:px-2.5 py-0.5 rounded-full font-bold truncate">
              {pendingMessages > 0 ? `${pendingMessages} pendentes →` : 'Abrir Chat →'}
            </span>
          </div>
        </button>

        {/* Card 3: Receitas (Tom Âmbar/Laranja) */}
        <button
          onClick={onViewKitchen}
          className="bg-gradient-to-br from-amber-500 to-orange-600 p-3.5 sm:p-4 rounded-2xl text-white shadow-sm shadow-amber-500/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 hover:scale-[1.01] active:scale-98 flex flex-col justify-between min-h-[120px] sm:min-h-[135px]"
        >
          <div className="absolute -right-3 -bottom-3 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <UtensilsCrossed className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-amber-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Receitas
              </span>
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <UtensilsCrossed className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
              42+
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] sm:text-xs bg-white/20 hover:bg-white/30 px-2 sm:px-2.5 py-0.5 rounded-full font-bold truncate">
              Laboratório →
            </span>
          </div>
        </button>

        {/* Card 4: Agenda (Tom Violeta/Roxo) */}
        <button
          onClick={onViewAgenda}
          className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3.5 sm:p-4 rounded-2xl text-white shadow-sm shadow-indigo-600/20 relative overflow-hidden group cursor-pointer text-left transition-all duration-200 hover:scale-[1.01] active:scale-98 flex flex-col justify-between min-h-[120px] sm:min-h-[135px]"
        >
          <div className="absolute -right-3 -bottom-3 opacity-15 group-hover:scale-110 transition-transform pointer-events-none">
            <Calendar className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-indigo-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Agenda
              </span>
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
              {todayAppointments.length} hoje
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] sm:text-xs bg-white/20 hover:bg-white/30 px-2 sm:px-2.5 py-0.5 rounded-full font-bold truncate">
              Ver Horários →
            </span>
          </div>
        </button>
      </section>

      {/* Main Content Split: Ficha Clínica (Lista Compacta) vs Agenda de Hoje */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left / Main Column: Card "Ficha Clínica" (8 cols) */}
        <div className="lg:col-span-8 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col space-y-4">
          {/* Header do Card com Badge Azul de Contador */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Ficha Clínica
                  </h2>
                  <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {uniquePatients.length} {uniquePatients.length === 1 ? 'paciente monitorado' : 'pacientes monitorados'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Prontuários estruturados e acompanhamento contínuo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onNewConsultation}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 transition"
              >
                + Nova Consulta
              </button>
              <button
                onClick={onViewPatients}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
              >
                Ver Todos
              </button>
            </div>
          </div>

          {/* Lista Compacta de Pacientes (Linha fina por paciente com botão Ver Prontuário) */}
          {sortedPatients.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
              <p className="text-xs font-bold">Nenhum prontuário emitido ainda</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Clique em &quot;+ Nova Consulta&quot; para iniciar o primeiro atendimento
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {sortedPatients.map((patient) => {
                const report = patient.latestReport;
                const imc = calculateIMC(report.formData.peso, report.formData.altura);

                return (
                  <div
                    key={patient.code}
                    onClick={() => setSelectedModalReport(report)}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-emerald-300 hover:shadow-xs transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    {/* Info Esquerda */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {patient.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                            {patient.name}
                          </h4>
                          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                            {patient.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          {report.formData.peso} kg • IMC {imc.value} • {report.formData.tipoDieta || 'Personalizada'}
                        </p>
                      </div>
                    </div>

                    {/* Ação Direita */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden md:inline text-[10px] text-slate-400 font-medium">
                        {new Date(patient.lastDate).toLocaleDateString('pt-BR')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModalReport(report);
                        }}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 font-bold text-[11px] sm:text-xs transition flex items-center gap-1"
                        title="Ver Prontuário em Tela Cheia"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ver Prontuário</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Agenda de Hoje (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Agenda de Hoje
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {todayAppointments.length} agendados
                </span>
              </div>

              <div className="space-y-2">
                {todayAppointments.length === 0 ? (
                  <div className="py-7 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs font-bold">Sem compromissos hoje</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Horários livres para novos atendimentos
                    </p>
                  </div>
                ) : (
                  todayAppointments.slice(0, 4).map((app) => {
                    const isQualisan = app.type === 'Consulta Qualisan';
                    const isParticular = app.type === 'Visita Particular';
                    const isLazer = app.type === 'Lazer / Pessoal';

                    const borderClass = isQualisan
                      ? 'border-blue-500 bg-blue-50/80 text-blue-700'
                      : isParticular
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-700'
                      : isLazer
                      ? 'border-purple-500 bg-purple-50/80 text-purple-700'
                      : 'border-amber-500 bg-amber-50/80 text-amber-700';

                    return (
                      <div
                        key={app.id}
                        className={`p-2.5 border-l-4 rounded-r-xl border-y border-r border-slate-100 shadow-2xs ${borderClass}`}
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[10px] font-extrabold">{app.time}</span>
                          <span className="text-[9px] bg-white px-1.5 py-0.5 rounded font-bold border border-slate-100 shadow-2xs">
                            {app.type.split(' ')[0]}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {app.title}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={onViewAgenda}
              className="mt-3.5 w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition-colors"
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
