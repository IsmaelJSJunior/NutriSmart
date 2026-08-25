import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  ArrowLeft,
  Calendar,
  Activity,
  FileText,
  Trash2,
  FilePlus,
  TrendingDown,
  TrendingUp,
  Scale,
  Ruler,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ReportRecord } from '../types';
import { SimpleLineChart } from './SimpleLineChart';
import { calculateIMC } from '../lib/utils';

interface PatientsListViewProps {
  reports: ReportRecord[];
  onSelectReport: (report: ReportRecord) => void;
  onNewConsultationForPatient: (patientCode: string) => void;
  onDeleteReport: (reportId: string) => void;
  onBack: () => void;
}

export const PatientsListView: React.FC<PatientsListViewProps> = ({
  reports,
  onSelectReport,
  onNewConsultationForPatient,
  onDeleteReport,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientCode, setSelectedPatientCode] = useState<string | null>(null);

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
      consultationCount: number;
      firstDate: string;
      lastDate: string;
      initialWeight: number;
      latestWeight: number;
      initialIMC: string;
      latestIMC: string;
      latestReport: ReportRecord;
      history: ReportRecord[];
    }[] = [];

    groupedPatients.forEach((history, code) => {
      const first = history[0];
      const latest = history[history.length - 1];
      const firstWeight = parseFloat(first.formData.peso) || 0;
      const latestWeight = parseFloat(latest.formData.peso) || 0;

      list.push({
        code,
        name: latest.formData.nome,
        consultationCount: history.length,
        firstDate: first.date,
        lastDate: latest.date,
        initialWeight: firstWeight,
        latestWeight: latestWeight,
        initialIMC: calculateIMC(first.formData.peso, first.formData.altura).value,
        latestIMC: calculateIMC(latest.formData.peso, latest.formData.altura).value,
        latestReport: latest,
        history,
      });
    });

    // Sort by most recent activity
    list.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
    return list;
  }, [groupedPatients]);

  // Filtered by search
  const filteredSummaries = useMemo(() => {
    if (!searchTerm.trim()) return patientSummaries;
    const term = searchTerm.toLowerCase();
    return patientSummaries.filter(
      (p) => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
    );
  }, [patientSummaries, searchTerm]);

  // Prepare chart data for active patient
  const activePatientSummary = useMemo(() => {
    if (!selectedPatientCode) return null;
    return patientSummaries.find((p) => p.code === selectedPatientCode) || null;
  }, [patientSummaries, selectedPatientCode]);

  const activeChartData = useMemo(() => {
    if (!activePatientSummary) return [];
    return activePatientSummary.history.map((r) => ({
      date: r.date,
      peso: r.formData.peso,
      imc: calculateIMC(r.formData.peso, r.formData.altura).numericValue,
      abdomen: r.formData.abdomen,
      cintura: r.formData.cintura,
      braco: r.formData.braco,
      quadril: r.formData.quadril,
      coxa: r.formData.coxa,
      panturrilha: r.formData.panturrilha,
    }));
  }, [activePatientSummary]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-xs w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Painel
        </button>

        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do paciente ou código..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>
      </div>

      {/* Main Grid: Patients List vs Evolution Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patients Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              Pacientes Cadastrados ({filteredSummaries.length})
            </h3>
          </div>

          {filteredSummaries.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
              Nenhum paciente encontrado para a busca.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
              {filteredSummaries.map((p) => {
                const isSelected = selectedPatientCode === p.code;
                const weightDiff = p.latestWeight - p.initialWeight;
                const isDecreasing = weightDiff < 0;

                return (
                  <div
                    key={p.code}
                    onClick={() => setSelectedPatientCode(p.code)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/90 border-sky-300 shadow-md ring-2 ring-sky-400/30'
                        : 'bg-white/95 border-slate-200 hover:border-sky-200 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{p.name}</h4>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.code}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 block">
                          {p.consultationCount} {p.consultationCount === 1 ? 'consulta' : 'consultas'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Última: {new Date(p.lastDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Peso atual:</span>
                        <span className="font-extrabold text-slate-800">{p.latestWeight} kg</span>
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

                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Detailed Patient Evolution & Reports Timeline (7 cols) */}
        <div className="lg:col-span-7">
          {activePatientSummary ? (
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black bg-sky-100 text-sky-800 px-2 py-0.5 rounded-lg">
                      {activePatientSummary.code}
                    </span>
                    <h2 className="text-xl font-black text-slate-900">{activePatientSummary.name}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Histórico de {activePatientSummary.consultationCount} consultas registradas
                  </p>
                </div>

                <button
                  onClick={() => onNewConsultationForPatient(activePatientSummary.code)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md hover:shadow-lg transition active:scale-95 shrink-0"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Nova Consulta / Retorno</span>
                </button>
              </div>

              {/* Multi-metric Evolution Charts */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Curvas de Evolução Antropométrica
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SimpleLineChart
                    data={activeChartData}
                    dataKey="peso"
                    color="#059669"
                    label="Evolução de Peso Corporal"
                  />
                  <SimpleLineChart
                    data={activeChartData}
                    dataKey="imc"
                    color="#0284c7"
                    label="Evolução de IMC"
                  />
                  <SimpleLineChart
                    data={activeChartData}
                    dataKey="abdomen"
                    color="#f59e0b"
                    label="Evolução de Abdômen"
                  />
                  <SimpleLineChart
                    data={activeChartData}
                    dataKey="cintura"
                    color="#8b5cf6"
                    label="Evolução de Cintura"
                  />
                </div>
              </div>

              {/* Consultation Prontuários Timeline */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  Prontuários & Prescrições Emitidas
                </h3>

                <div className="space-y-3">
                  {activePatientSummary.history
                    .slice()
                    .reverse()
                    .map((report, idx) => (
                      <div
                        key={report.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-white transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800">
                              Consulta #{activePatientSummary.history.length - idx}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              • {new Date(report.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Peso: <b>{report.formData.peso} kg</b> • Altura: <b>{report.formData.altura} cm</b> • Dieta: <b>{report.formData.tipoDieta || 'Padrão'}</b>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectReport(report)}
                            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition"
                          >
                            Abrir Prontuário
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Deseja realmente excluir este prontuário?')) {
                                onDeleteReport(report.id);
                              }
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                            title="Excluir este registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 text-slate-400 p-8 text-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-extrabold text-slate-700 text-base">Selecione um paciente ao lado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Visualize os gráficos de evolução de peso, perímetros corporais e histórico completo de prontuários.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
