import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Activity,
  FileText,
  Trash2,
  FilePlus,
  TrendingDown,
  TrendingUp,
  Scale,
  Ruler,
  ChevronDown,
  Copy,
  Check,
  KeyRound,
  MessageSquare,
  ArrowUpDown,
  Droplets,
  Percent,
  Camera,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ReportRecord, ChatMessage } from '../types';
import { SimpleLineChart } from './SimpleLineChart';
import { calculateIMC } from '../lib/utils';
import { HistoryDropdown } from './HistoryDropdown';
import { CustomSelect, SelectOption } from './CustomSelect';

interface PatientsListViewProps {
  reports: ReportRecord[];
  messages?: ChatMessage[];
  onSelectReport: (report: ReportRecord) => void;
  onNewConsultationForPatient: (patientCode: string) => void;
  onOpenChat?: (patientCode: string, patientName?: string) => void;
  onDeleteReport: (reportId: string) => void;
  onBack: () => void;
}

const SORT_OPTIONS: SelectOption[] = [
  { value: 'unread', label: 'Mensagens / Prioridade' },
  { value: 'alpha', label: 'Alfabética (A-Z)' },
  { value: 'last_visit', label: 'Última Consulta' },
  { value: 'registration', label: 'Data de Cadastro' },
];

export const PatientsListView: React.FC<PatientsListViewProps> = ({
  reports,
  messages = [],
  onSelectReport,
  onNewConsultationForPatient,
  onOpenChat,
  onDeleteReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('unread');
  const [selectedConsultationMap, setSelectedConsultationMap] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Compute unread count for a given patient
  const getUnreadForPatient = (code: string) => {
    if (!messages || messages.length === 0) return 0;
    const upperCode = code.toUpperCase();
    return messages.filter((m) => {
      if (m.patientCode.toUpperCase() !== upperCode) return false;
      if (m.sender !== 'patient') return false;
      if (m.read === true) return false;
      const hasNutriReply = messages.some(
        (reply) =>
          reply.patientCode.toUpperCase() === upperCode &&
          reply.sender === 'nutri' &&
          new Date(reply.timestamp).getTime() >= new Date(m.timestamp).getTime()
      );
      return !hasNutriReply;
    }).length;
  };

  // Group reports by patientCode
  const groupedPatients = useMemo(() => {
    const map = new Map<string, ReportRecord[]>();
    reports.forEach((r) => {
      const code = r.patientCode.toUpperCase();
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(r);
    });

    // Sort reports chronologically inside each group
    map.forEach((list) => {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return map;
  }, [reports]);

  // Unique patient summaries
  const patientSummaries = useMemo(() => {
    const list: {
      code: string;
      name: string;
      senha: string;
      consultationCount: number;
      firstDate: string;
      lastDate: string;
      initialWeight: number;
      latestWeight: number;
      initialIMC: string;
      latestIMC: string;
      unreadCount: number;
      latestReport: ReportRecord;
      history: ReportRecord[];
    }[] = [];

    groupedPatients.forEach((history, code) => {
      const first = history[0];
      const latest = history[history.length - 1];
      const firstWeight = parseFloat(first.formData.peso) || 0;
      const latestWeight = parseFloat(latest.formData.peso) || 0;
      const unread = getUnreadForPatient(code);

      list.push({
        code,
        name: latest.formData.nome,
        senha: latest.formData.senha || first.formData.senha || '',
        consultationCount: history.length,
        firstDate: first.date,
        lastDate: latest.date,
        initialWeight: firstWeight,
        latestWeight: latestWeight,
        initialIMC: calculateIMC(first.formData.peso, first.formData.altura).value,
        latestIMC: calculateIMC(latest.formData.peso, latest.formData.altura).value,
        unreadCount: unread,
        latestReport: latest,
        history,
      });
    });

    // Smart Sorting
    list.sort((a, b) => {
      if (sortBy === 'unread') {
        if (a.unreadCount !== b.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }
        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      }
      if (sortBy === 'alpha') {
        return a.name.localeCompare(b.name, 'pt-BR');
      }
      if (sortBy === 'registration') {
        return new Date(b.firstDate).getTime() - new Date(a.firstDate).getTime();
      }
      // 'last_visit'
      return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
    });

    return list;
  }, [groupedPatients, messages, sortBy]);

  const handleCopyCredentials = (code: string, senha?: string, name?: string) => {
    const text = `NutriSmart - Credenciais de Acesso do Paciente:\nPaciente: ${name || ''}\nCódigo: ${code}\nSenha: ${senha || 'Não cadastrada'}\nAcesse o portal e acompanhe sua evolução!`;
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered by search
  const filteredSummaries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return patientSummaries;
    return patientSummaries.filter((p) => {
      const nameMatch = p.name ? p.name.toLowerCase().includes(term) : false;
      const codeMatch = p.code ? p.code.toLowerCase().includes(term) : false;
      return nameMatch || codeMatch;
    });
  }, [patientSummaries, searchTerm]);

  // Helper for 9 skinfolds sum
  const getSomaDobras = (formData: any) => {
    const keys = [
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
    let sum = 0;
    let count = 0;
    keys.forEach((k) => {
      const val = parseFloat(formData[k]);
      if (!isNaN(val) && val > 0) {
        sum += val;
        count++;
      }
    });
    return { sum, count };
  };

  // Helper for water recommendation
  const getWaterGoalMl = (pesoStr?: string, aguaStr?: string) => {
    const p = parseFloat(pesoStr || '');
    if (!isNaN(p) && p > 0) return Math.round(p * 40);
    const a = parseFloat(aguaStr || '');
    if (!isNaN(a) && a > 0) return Math.round(a * 1000);
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-12 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Top Subheader - Compact & Aligned Top-Right */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-sky-100/90 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-sky-100/90 text-sky-700 flex items-center justify-center shadow-2xs border border-sky-200/60 shrink-0">
            <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">Painel de Pacientes</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Histórico clínico, relatórios, evolução e central de mensagens
            </p>
          </div>
        </div>

        {/* Right Actions: Search + CustomSelect Equalized & Side by Side */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-60 min-w-0">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="w-full h-9 sm:h-10 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 sm:top-3" />
          </div>

          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            options={SORT_OPTIONS}
            className="w-36 sm:w-52 shrink-0"
            buttonClassName="h-9 sm:h-10 px-2.5 sm:px-3 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 font-semibold"
            icon={<ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          />
        </div>
      </div>

      {/* Accordion Patient List */}
      <div className="space-y-3">
        {filteredSummaries.length === 0 ? (
          <div className="p-12 text-center bg-white/95 rounded-3xl border border-slate-200 text-slate-500 text-xs shadow-xs">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">Nenhum paciente encontrado</p>
            <p className="text-slate-400 mt-1">Tente buscar com outros termos ou altere o filtro de ordenação.</p>
          </div>
        ) : (
          filteredSummaries.map((p) => {
            const isExpanded = expandedCode === p.code;
            const weightDiff = p.latestWeight - p.initialWeight;
            const isDecreasing = weightDiff < 0;

            // Determine active consultation for this patient
            const selectedReportId = selectedConsultationMap[p.code];
            const activeReport =
              p.history.find((r) => r.id === selectedReportId) || p.latestReport;
            const activeFormData = activeReport.formData;

            // Chart data for this patient's history
            const chartData = p.history.map((r) => ({
              date: r.date,
              peso: r.formData.peso,
              imc: calculateIMC(r.formData.peso, r.formData.altura).numericValue,
              abdomen: r.formData.abdomen,
              cintura: r.formData.cintura,
              braco: r.formData.bracoDireitoRelaxado || r.formData.braco,
              quadril: r.formData.quadril,
              coxa: r.formData.coxaDireita || r.formData.coxa,
              panturrilha: r.formData.panturrilhaDireita || r.formData.panturrilha,
            }));

            const imcObj = calculateIMC(activeFormData.peso, activeFormData.altura);
            const { sum: somaDobras } = getSomaDobras(activeFormData);
            const waterGoalMl = getWaterGoalMl(activeFormData.peso, activeFormData.agua);
            const patientPhotos = activeFormData.fotos || [];

            return (
              <div
                key={p.code}
                className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-sky-300 shadow-md ring-2 ring-sky-400/20'
                    : 'border-slate-200/90 hover:border-sky-200 hover:shadow-xs'
                }`}
              >
                {/* Collapsed Header (Clickable Trigger) */}
                <div
                  onClick={() => setExpandedCode(isExpanded ? null : p.code)}
                  className="p-3 sm:p-4 cursor-pointer select-none transition flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white"
                >
                  {/* Left: Avatar + Name + Badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight truncate">
                          {p.name}
                        </h3>
                        {p.unreadCount > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse flex items-center gap-0.5 shadow-2xs">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {p.unreadCount} nova{p.unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs">
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.code}
                        </span>
                        {p.senha && (
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <KeyRound className="w-2.5 h-2.5" />
                            {p.senha}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center/Right: Stats + Quick Action Buttons + Expand Indicator */}
                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 flex-wrap">
                    {/* Weight and Consultations Stat */}
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          {p.consultationCount} {p.consultationCount === 1 ? 'consulta' : 'consultas'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-800">{p.latestWeight} kg</span>
                          {p.consultationCount > 1 && (
                            <span
                              className={`flex items-center text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                                isDecreasing
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isDecreasing ? (
                                <TrendingDown className="w-3 h-3 mr-0.5" />
                              ) : (
                                <TrendingUp className="w-3 h-3 mr-0.5" />
                              )}
                              {Math.abs(weightDiff).toFixed(1)} kg
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {onOpenChat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChat(p.code, p.name);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                            p.unreadCount > 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200'
                          }`}
                          title="Abrir Chat com o Paciente"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Chat</span>
                          {p.unreadCount > 0 && (
                            <span className="bg-rose-500 text-white text-[9px] px-1 rounded-full font-black">
                              {p.unreadCount}
                            </span>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(p.latestReport);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Abrir Prontuário"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ficha</span>
                      </button>

                      {/* Expand/Collapse Chevron Indicator */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Accordion Body (Rendered In-Place) */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 border-t border-sky-100/90 bg-slate-50/50 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Top Credentials & Direct Actions Bar */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Credential Tag with Copy */}
                        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-mono">
                          <span className="text-slate-500">Código: <strong className="text-sky-700 font-bold">{p.code}</strong></span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500">Senha: <strong className="text-indigo-700 font-bold">{p.senha || 'Não cadastrada'}</strong></span>
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(p.code, p.senha, p.name)}
                            className="p-1 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-emerald-600 transition active:scale-95 cursor-pointer"
                            title="Copiar credenciais do paciente"
                          >
                            {copiedCode === p.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Direct Buttons */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {onOpenChat && (
                          <button
                            type="button"
                            onClick={() => onOpenChat(p.code, p.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/90 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                            <span>Chat</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectReport(activeReport)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Prontuário Completo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNewConsultationForPatient(p.code)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs hover:shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <FilePlus className="w-3.5 h-3.5" />
                          <span>Nova Consulta</span>
                        </button>
                      </div>
                    </div>

                    {/* Consultation Selector Bar (HistoryDropdown) */}
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                        <div>
                          <span className="text-xs font-black text-slate-900 block leading-tight">
                            Consulta Ativa: {new Date(activeReport.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Objetivo: <strong className="text-emerald-700">{activeFormData.objetivo || 'Padrão'}</strong> • Dieta: <strong className="text-slate-700">{activeFormData.tipoDieta || 'Padrão'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Dropdown to switch consultation */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 uppercase hidden sm:inline">Histórico:</span>
                        <HistoryDropdown
                          history={p.history}
                          selectedReportId={activeReport.id}
                          onSelect={(rep) =>
                            setSelectedConsultationMap((prev) => ({ ...prev, [p.code]: rep.id }))
                          }
                          className="w-auto"
                        />
                      </div>
                    </div>

                    {/* Evolution Charts */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-600" />
                          Curvas de Evolução Antropométrica
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {p.history.length} consulta{p.history.length > 1 ? 's' : ''} no histórico
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <SimpleLineChart
                          data={chartData}
                          dataKey="peso"
                          color="#059669"
                          label="Peso Corporal"
                        />
                        <SimpleLineChart
                          data={chartData}
                          dataKey="imc"
                          color="#0284c7"
                          label="IMC Corporal"
                        />
                        <SimpleLineChart
                          data={chartData}
                          dataKey="abdomen"
                          color="#f59e0b"
                          label="Abdômen"
                        />
                        <SimpleLineChart
                          data={chartData}
                          dataKey="cintura"
                          color="#8b5cf6"
                          label="Cintura"
                        />
                      </div>
                    </div>

                    {/* Complete Anthropometric Assessment of the Active Consultation */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                            Avaliação Antropométrica & Composição Corporal
                          </h4>
                        </div>
                        {waterGoalMl && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold shadow-2xs">
                            <Droplets className="w-3 h-3 text-sky-500" />
                            <span>Meta Hídrica: <strong>{waterGoalMl.toLocaleString('pt-BR')} ml/dia</strong></span>
                          </span>
                        )}
                      </div>

                      {/* Top Metric Cards: IMC + %GC Siri + Densidade + Água */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">IMC Corporal</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-base font-black text-slate-900">{imcObj.value}</span>
                            <span className={`text-[10px] font-bold ${imcObj.colorClass}`}>{imcObj.classification}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">% Gordura Corporal</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-base font-black text-emerald-700">
                              {activeFormData.percentualGordura ? `${activeFormData.percentualGordura}%` : '--'}
                            </span>
                            {activeFormData.classificacaoGordura && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                {activeFormData.classificacaoGordura}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Densidade Corporal</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-base font-black text-slate-800">
                              {activeFormData.densidadeCorporal || '--'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">g/cm³</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Consumo de Água</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            <span className="text-xs font-black text-sky-900">
                              {waterGoalMl ? `${waterGoalMl.toLocaleString('pt-BR')} ml` : `${activeFormData.agua || '--'} L`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bilateral Circumferences Grid */}
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                          <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Ruler className="w-3 h-3 text-emerald-600" />
                            Circunferências Bilaterais (cm)
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Membros D vs. E</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 text-xs">
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Braço D (Rel / Cont)</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {activeFormData.bracoDireitoRelaxado || activeFormData.braco || '--'} / {activeFormData.bracoDireitoContraido || '--'} cm
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Braço E (Rel / Cont)</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {activeFormData.bracoEsquerdoRelaxado || '--'} / {activeFormData.bracoEsquerdoContraido || '--'} cm
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Ombros / Peitoral</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {activeFormData.ombros || '--'} / {activeFormData.peitoral || activeFormData.peito || '--'} cm
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Cintura / Abdômen</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {activeFormData.cintura || '--'} / {activeFormData.abdomen || '--'} cm
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Quadril</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {activeFormData.quadril || '--'} cm
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Coxa D / E</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {activeFormData.coxaDireita || activeFormData.coxa || '--'} / {activeFormData.coxaEsquerda || '--'} cm
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Panturrilha D / E</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {activeFormData.panturrilhaDireita || activeFormData.panturrilha || '--'} / {activeFormData.panturrilhaEsquerda || '--'} cm
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 9 Skinfolds Protocol Grid */}
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                          <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Percent className="w-3 h-3 text-teal-600" />
                            Pregas Cutâneas (Protocolo de 9 Dobras em mm)
                          </span>
                          {somaDobras > 0 && (
                            <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              Soma Total: {somaDobras.toFixed(1)} mm
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 text-center text-xs">
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">1. Tríceps</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraTriceps || '--'} mm</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">2. Subescap.</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraSubescapular || '--'} mm</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">3. Axilar M.</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraAxilarMedia || '--'} mm</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">4. Peitoral</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraPeitoral || '--'} mm</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">5. Supra-ilíaca</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraSuprailiaca || '--'} mm</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">6. Abdômen</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraAbdominal || '--'} mm</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">7. Coxa</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraCoxa || '--'} mm</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">8. Panturrilha</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraPanturrilha || '--'} mm</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 block truncate">9. Bíceps</span>
                            <span className="font-bold text-slate-800">{activeFormData.dobraBiceps || '--'} mm</span>
                          </div>
                        </div>
                      </div>

                      {/* Photo Gallery (if photos exist) */}
                      {patientPhotos.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                            <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Camera className="w-3 h-3 text-indigo-600" />
                              Galeria de Evolução Fotográfica
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {patientPhotos.length} foto{patientPhotos.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                            {patientPhotos.map((photo) => (
                              <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs">
                                <div className="aspect-3/4 w-full overflow-hidden bg-slate-100">
                                  <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-1 bg-white text-center">
                                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 rounded block truncate">
                                    {photo.label}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timeline of All Consultations for this Patient */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-600" />
                        Histórico de Prontuários ({p.history.length})
                      </h4>

                      <div className="space-y-2">
                        {p.history
                          .slice()
                          .reverse()
                          .map((report, idx) => {
                            const isCurrentActive = report.id === activeReport.id;
                            return (
                              <div
                                key={report.id}
                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition ${
                                  isCurrentActive
                                    ? 'bg-sky-50/70 border-sky-200 ring-1 ring-sky-300'
                                    : 'bg-slate-50/80 border-slate-200 hover:bg-white'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800">
                                      Consulta #{p.history.length - idx}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      • {new Date(report.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                    {isCurrentActive && (
                                      <span className="text-[9px] font-black uppercase tracking-wider text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded">
                                        Visualizando
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    Peso: <b>{report.formData.peso} kg</b> • Altura: <b>{report.formData.altura} cm</b> • Dieta: <b>{report.formData.tipoDieta || 'Padrão'}</b>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onSelectReport(report)}
                                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
                                  >
                                    Abrir Prontuário
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm('Deseja realmente excluir este prontuário?')) {
                                        onDeleteReport(report.id);
                                      }
                                    }}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer active:scale-95"
                                    title="Excluir este registro"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
