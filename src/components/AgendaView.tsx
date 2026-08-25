import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Copy,
  Tag,
  AlignLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Appointment, AppointmentCategory } from '../types';
import { dataStore } from '../services/storage';

interface AgendaViewProps {
  agenda: Appointment[];
  onBack: () => void;
}

const CATEGORIES: { name: AppointmentCategory; colorClass: string; bgClass: string; borderClass: string }[] = [
  {
    name: 'Consulta Qualisan',
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
];

export const AgendaView: React.FC<AgendaViewProps> = ({ agenda, onBack }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Form State
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [date, setDate] = useState(todayStr);
  const [type, setType] = useState<AppointmentCategory>('Consulta Qualisan');
  const [notes, setNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filter appointments for selected date
  const selectedDayAppointments = useMemo(() => {
    return agenda
      .filter((a) => a.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [agenda, selectedDate]);

  // Date Navigation carousel
  const dateList = useMemo(() => {
    const dates = [];
    const base = new Date();
    base.setDate(base.getDate() - 3); // 3 days past
    for (let i = 0; i < 18; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      dates.push({
        iso,
        dayOfWeek: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        dayOfMonth: d.getDate(),
        month: d.toLocaleDateString('pt-BR', { month: 'short' }),
        isToday: iso === todayStr,
      });
    }
    return dates;
  }, [todayStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || type; // Auto-fallback to type if title empty

    await dataStore.saveAppointment({
      id: isEditingId || undefined,
      title: finalTitle,
      time,
      date,
      type,
      notes: notes.trim(),
    });

    // Reset Form
    setIsEditingId(null);
    setTitle('');
    setNotes('');
    setTime('10:00');
    setFeedbackMsg(isEditingId ? 'Compromisso atualizado com sucesso!' : 'Compromisso adicionado à agenda!');
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleEdit = (app: Appointment) => {
    setIsEditingId(app.id);
    setTitle(app.title);
    setTime(app.time);
    setDate(app.date);
    setType(app.type);
    setNotes(app.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = async (app: Appointment) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7); // +7 days
    const nextDateIso = nextDate.toISOString().split('T')[0];

    await dataStore.saveAppointment({
      title: `${app.title} (Cópia)`,
      time: app.time,
      date: nextDateIso,
      type: app.type,
      notes: app.notes,
    });

    setSelectedDate(nextDateIso);
    setFeedbackMsg(`Compromisso replicado para ${new Date(nextDateIso).toLocaleDateString('pt-BR')}!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente remover este agendamento?')) {
      await dataStore.deleteAppointment(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Painel
        </button>

        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
            Agenda Integrada Qualisan
          </span>
        </div>
      </div>

      {/* Date Selector Carousel */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-md">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Navegador de Datas</h3>
          </div>
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 px-3 py-1 rounded-xl border border-sky-200 transition"
          >
            Ir para Hoje
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {dateList.map((d) => {
            const isSelected = selectedDate === d.iso;
            const countForDay = agenda.filter((a) => a.date === d.iso).length;

            return (
              <button
                key={d.iso}
                onClick={() => {
                  setSelectedDate(d.iso);
                  setDate(d.iso);
                }}
                className={`flex flex-col items-center justify-center min-w-[70px] py-3 px-2 rounded-2xl border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-b from-sky-600 to-indigo-600 text-white border-transparent shadow-md scale-105'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                  {d.dayOfWeek}
                </span>
                <span className="text-lg font-black my-0.5">{d.dayOfMonth}</span>
                <span className="text-[10px] font-bold opacity-80">{d.month}</span>

                {countForDay > 0 && (
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full ${
                      isSelected ? 'bg-amber-300' : 'bg-sky-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form (Left) & Today's Schedule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add / Edit Form (5 cols) */}
        <div className="lg:col-span-5 bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-600" />
              {isEditingId ? 'Editar Compromisso' : 'Novo Agendamento'}
            </h3>
            {isEditingId && (
              <button
                onClick={() => {
                  setIsEditingId(null);
                  setTitle('');
                  setNotes('');
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Título ou Paciente (Opcional - usa tipo se vazio)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Consulta Ana Silva ou Visita Médica"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Horário
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelectedDate(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Categoria do Compromisso
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setType(cat.name)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-extrabold transition ${
                      type === cat.name
                        ? `${cat.bgClass} ${cat.colorClass} ${cat.borderClass} ring-2 ring-sky-400/30`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observações / Detalhes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Trazer exames recentes de sangue e bioimpedância..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {feedbackMsg && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isEditingId ? 'Salvar Alterações' : 'Adicionar à Agenda'}</span>
            </button>
          </form>
        </div>

        {/* Right: Selected Day List (7 cols) */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Compromissos para{' '}
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {selectedDayAppointments.length} agendados para este dia
              </p>
            </div>
          </div>

          {selectedDayAppointments.length === 0 ? (
            <div className="py-12 text-center bg-slate-50/70 rounded-2xl border border-slate-100 text-slate-400">
              <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Nenhum compromisso para esta data</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Use o formulário ao lado para cadastrar horários</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {selectedDayAppointments.map((app) => {
                const catObj = CATEGORIES.find((c) => c.name === app.type) || CATEGORIES[0];

                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-2xl border-2 ${catObj.borderClass} ${catObj.bgClass} hover:shadow-xs transition`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-black text-xs shrink-0 mt-0.5 shadow-xs">
                          {app.time}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md border bg-white/80 ${catObj.colorClass} ${catObj.borderClass}`}
                            >
                              {app.type}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-sm">{app.title}</h4>
                          {app.notes && (
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{app.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Card Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDuplicate(app)}
                          className="p-2 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition"
                          title="Duplicar para a próxima semana (+7 dias)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(app)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg transition"
                          title="Editar compromisso"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                          title="Excluir compromisso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
