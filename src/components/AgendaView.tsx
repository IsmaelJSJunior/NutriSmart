import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Copy,
  Tag,
  AlignLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Appointment, AppointmentCategory } from '../types';
import { dataStore } from '../services/storage';
import { CustomDatePicker } from './CustomDatePicker';
import { CustomHourPicker } from './CustomHourPicker';
import { ConfirmModal } from './ConfirmModal';

interface AgendaViewProps {
  agenda: Appointment[];
  onBack: () => void;
}

interface CategoryConfig {
  name: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const CATEGORIES: CategoryConfig[] = [
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

export const AgendaView: React.FC<AgendaViewProps> = ({ agenda, onBack }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Accordion state (starts collapsed by default)
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Form State
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00');
  const [date, setDate] = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState<string>('Santa Casa');
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [notes, setNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filter appointments for selected day
  const selectedDayAppointments = agenda
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const effectiveCategory = selectedCategory === 'Outro / Personalizado'
    ? (customCategoryText.trim() || 'Personalizado')
    : selectedCategory;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time || !date) return;

    await dataStore.saveAppointment({
      id: isEditingId || undefined,
      title: title || effectiveCategory,
      time,
      date,
      type: effectiveCategory,
      notes,
    });

    setFeedbackMsg(isEditingId ? 'Agendamento atualizado com sucesso!' : 'Novo agendamento salvo com sucesso!');
    setIsEditingId(null);
    setTitle('');
    setNotes('');
    setCustomCategoryText('');
    setSelectedCategory('Santa Casa');
    setIsFormExpanded(false);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleEdit = (app: Appointment) => {
    setIsEditingId(app.id);
    setTitle(app.title);
    setTime(app.time);
    setDate(app.date);

    const standardMatch = CATEGORIES.find((c) => c.name === app.type);
    if (standardMatch) {
      setSelectedCategory(app.type);
      setCustomCategoryText('');
    } else {
      setSelectedCategory('Outro / Personalizado');
      setCustomCategoryText(app.type);
    }

    setNotes(app.notes || '');
    setSelectedDate(app.date);
    setIsFormExpanded(true); // Expand form when editing
  };

  const handleDuplicate = async (app: Appointment) => {
    const nextDate = new Date(app.date + 'T12:00:00');
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
    setFeedbackMsg(`Compromisso replicado para ${new Date(nextDateIso + 'T12:00:00').toLocaleDateString('pt-BR')}!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setAppointmentToDelete(id);
  };

  const getCategoryStyle = (typeStr: string) => {
    if (typeStr === 'Consulta Qualisan' || typeStr === 'Santa Casa') {
      return CATEGORIES[0];
    }
    return (
      CATEGORIES.find((c) => c.name === typeStr) || {
        name: typeStr,
        colorClass: 'text-indigo-700',
        bgClass: 'bg-indigo-50',
        borderClass: 'border-indigo-200',
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1 sm:pt-2 pb-10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Top Subheader with Integrated Custom Date Picker */}
      <div className="flex items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-purple-100/90 shadow-2xs gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-100/90 text-purple-700 flex items-center justify-center shadow-2xs border border-purple-200/60 shrink-0">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight truncate">
              Agenda de Consultas
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
              Agendamentos clínicos, Santa Casa e visitas
            </p>
          </div>
        </div>

        {/* Custom Date Picker & Quick Today Action */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(todayStr);
              setDate(todayStr);
            }}
            className="hidden sm:inline-flex text-[11px] font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-2 rounded-xl border border-purple-200/80 transition cursor-pointer active:scale-95 shadow-2xs"
          >
            Hoje
          </button>

          <CustomDatePicker
            value={selectedDate}
            onChange={(newDate) => {
              setSelectedDate(newDate);
              setDate(newDate);
            }}
            accentColor="purple"
            placeholder="Filtrar Data"
          />
        </div>
      </div>

      {/* Main Grid: Collapsible Form (Left) & Selected Day Schedule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 items-start">
        {/* Left: Retractable Accordion Form (5 cols) */}
        <div className="lg:col-span-5 bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all duration-200">
          {/* Accordion Header / Toggle */}
          <button
            type="button"
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-colors ${
                isFormExpanded ? 'bg-purple-600 text-white shadow-2xs' : 'bg-purple-50 text-purple-700 border border-purple-200/60'
              }`}>
                <Plus className={`w-4 h-4 transition-transform duration-200 ${isFormExpanded ? 'rotate-45' : ''}`} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  {isEditingId ? 'Editar Agendamento' : 'Novo Agendamento'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isFormExpanded ? 'Clique para recolher o formulário' : 'Clique para expandir e cadastrar horário'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditingId && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  Em Edição
                </span>
              )}
              {isFormExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {/* Collapsible Form Body with Fluid Height & Opacity Transition */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              isFormExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden">
              <div className="p-3.5 sm:p-4 pt-0 border-t border-slate-100">
                {isEditingId && (
                  <div className="flex justify-end pt-2 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingId(null);
                        setTitle('');
                        setNotes('');
                        setCustomCategoryText('');
                        setSelectedCategory('Santa Casa');
                        setIsFormExpanded(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer underline"
                    >
                      Cancelar Edição
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-2.5 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Título ou Paciente (Opcional)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Consulta de Retorno ou Avaliação Nutricional"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <CustomHourPicker
                        label="Horário"
                        value={time}
                        onChange={setTime}
                        accentColor="purple"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <CustomDatePicker
                        label="Data"
                        value={date}
                        onChange={(newDate) => {
                          setDate(newDate);
                          setSelectedDate(newDate);
                        }}
                        accentColor="purple"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Categoria do Compromisso
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`p-1.5 sm:p-2 rounded-xl border text-left text-[11px] font-extrabold transition cursor-pointer truncate ${
                            selectedCategory === cat.name
                              ? `${cat.bgClass} ${cat.colorClass} ${cat.borderClass} ring-2 ring-purple-400/30`
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>

                    {/* Campo Livre de Digitação se "Outro / Personalizado" estiver ativo */}
                    {selectedCategory === 'Outro / Personalizado' && (
                      <div className="mt-2 animate-in fade-in duration-150">
                        <label className="block text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                          Nome da Categoria Personalizada
                        </label>
                        <input
                          type="text"
                          required
                          value={customCategoryText}
                          onChange={(e) => setCustomCategoryText(e.target.value)}
                          placeholder="Ex: Treinamento, Aula, Plantão..."
                          className="w-full px-3 py-1.5 bg-indigo-50/50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Observações / Detalhes
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Sala 304, trazer prontuário..."
                      className="w-full px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  {feedbackMsg && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{feedbackMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-xs hover:shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isEditingId ? 'Salvar Alterações' : 'Adicionar à Agenda'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected Day List (7 cols) */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Compromissos para{' '}
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? 'agendamento' : 'agendamentos'} para este dia
              </p>
            </div>

            <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>

          {selectedDayAppointments.length === 0 ? (
            <div className="py-10 text-center bg-slate-50/70 rounded-2xl border border-slate-100 text-slate-400">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Nenhum compromisso nesta data</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique em &quot;Novo Agendamento&quot; ao lado para marcar um horário
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {selectedDayAppointments.map((app) => {
                const catObj = getCategoryStyle(app.type);

                return (
                  <div
                    key={app.id}
                    className={`p-3 rounded-2xl border ${catObj.borderClass} ${catObj.bgClass} hover:shadow-xs transition`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="px-2.5 py-1 rounded-xl bg-slate-800 text-white font-black font-mono text-xs shrink-0 mt-0.5 shadow-2xs">
                          {app.time}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={`text-[9px] font-black px-2 py-0.2 rounded-md border bg-white/90 ${catObj.colorClass} ${catObj.borderClass}`}
                            >
                              {app.type}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{app.title}</h4>
                          {app.notes && (
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{app.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Card Action buttons */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleDuplicate(app)}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition cursor-pointer"
                          title="Duplicar para a próxima semana (+7 dias)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(app)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg transition cursor-pointer"
                          title="Editar compromisso"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
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

      <ConfirmModal
        isOpen={!!appointmentToDelete}
        title="Excluir Agendamento"
        message="Tem certeza de que deseja remover esta consulta da sua agenda? Esta ação não poderá ser desfeita."
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        isDestructive={true}
        icon="trash"
        onConfirm={async () => {
          if (appointmentToDelete) {
            await dataStore.deleteAppointment(appointmentToDelete);
            setAppointmentToDelete(null);
          }
        }}
        onClose={() => setAppointmentToDelete(null)}
      />
    </div>
  );
};

