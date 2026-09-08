import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // ISO date string 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  minDate?: string;
  maxDate?: string;
  accentColor?: 'purple' | 'emerald' | 'sky';
  label?: string;
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Year range from 1930 to 2035
const YEARS = Array.from({ length: 106 }, (_, i) => 2035 - i);

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  accentColor = 'purple',
  label,
  placeholder = 'Selecione uma data',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial selected date or default to today
  const selectedDateObj = value ? new Date(value + 'T12:00:00') : new Date();
  const [viewYear, setViewYear] = useState(selectedDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDateObj.getMonth());

  // Quick selector views
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);

  // Close when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowMonthSelect(false);
        setShowYearSelect(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Sync internal view year/month when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDate = (year: number, month: number, day: number) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const isoString = `${year}-${monthStr}-${dayStr}`;
    onChange(isoString);
    setIsOpen(false);
    setShowMonthSelect(false);
    setShowYearSelect(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    setViewYear(year);
    setViewMonth(month);
    handleSelectDate(year, month, day);
  };

  // Calendar math
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const formattedDisplay = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  // Theme accents
  const colorMap = {
    purple: {
      btnHover: 'hover:border-purple-300 focus:ring-purple-500',
      activeBg: 'bg-purple-600 text-white font-bold shadow-xs',
      textAccent: 'text-purple-700',
      bgLight: 'bg-purple-50',
      borderLight: 'border-purple-200',
      iconColor: 'text-purple-600',
    },
    emerald: {
      btnHover: 'hover:border-emerald-300 focus:ring-emerald-500',
      activeBg: 'bg-emerald-600 text-white font-bold shadow-xs',
      textAccent: 'text-emerald-700',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200',
      iconColor: 'text-emerald-600',
    },
    sky: {
      btnHover: 'hover:border-sky-300 focus:ring-sky-500',
      activeBg: 'bg-sky-600 text-white font-bold shadow-xs',
      textAccent: 'text-sky-700',
      bgLight: 'bg-sky-50',
      borderLight: 'border-sky-200',
      iconColor: 'text-sky-600',
    },
  };

  const theme = colorMap[accentColor];

  return (
    <div className={`relative inline-block ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setShowMonthSelect(false);
          setShowYearSelect(false);
        }}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 transition focus:outline-none focus:ring-2 ${theme.btnHover} cursor-pointer shadow-2xs hover:bg-white`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className={`w-4 h-4 ${theme.iconColor} shrink-0`} />
          <span className={formattedDisplay ? 'text-slate-800 font-bold' : 'text-slate-400 font-normal'}>
            {formattedDisplay || placeholder}
          </span>
        </div>
        {value && (
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded shrink-0">
            {new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
          </span>
        )}
      </button>

      {/* Global Centralized Modal (Exact Viewport Center with Dark Backdrop Blur) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setIsOpen(false);
            setShowMonthSelect(false);
            setShowYearSelect(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[320px] max-w-full bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-4 sm:p-5 animate-in zoom-in-95 fade-in duration-200 ease-out select-none"
          >
            {/* Header with Quick Month/Year Dropdowns, Navigation & Close Button */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition active:scale-95 cursor-pointer shrink-0"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Direct Month & Year Quick Selectors */}
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Month Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMonthSelect(!showMonthSelect);
                      setShowYearSelect(false);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black text-slate-800 hover:bg-slate-100 border border-slate-200/60 transition cursor-pointer"
                  >
                    <span>{MONTH_NAMES[viewMonth]}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showMonthSelect && (
                    <div className="absolute top-full left-0 mt-1 w-32 max-h-44 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 p-1 z-30 scrollbar-thin">
                      {MONTH_NAMES.map((m, idx) => (
                        <button
                          key={m}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewMonth(idx);
                            setShowMonthSelect(false);
                          }}
                          className={`w-full text-left px-2 py-1 text-xs font-semibold rounded-lg transition ${
                            viewMonth === idx
                              ? `${theme.bgLight} ${theme.textAccent} font-bold`
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowYearSelect(!showYearSelect);
                      setShowMonthSelect(false);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black text-slate-800 hover:bg-slate-100 border border-slate-200/60 transition cursor-pointer font-mono"
                  >
                    <span>{viewYear}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showYearSelect && (
                    <div className="absolute top-full right-0 mt-1 w-24 max-h-44 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 p-1 z-30 scrollbar-thin">
                      {YEARS.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewYear(y);
                            setShowYearSelect(false);
                          }}
                          className={`w-full text-center px-2 py-1 text-xs font-mono rounded-lg transition ${
                            viewYear === y
                              ? `${theme.bgLight} ${theme.textAccent} font-bold`
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition active:scale-95 cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowMonthSelect(false);
                    setShowYearSelect(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer ml-1"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAY_NAMES.map((wd) => (
                <div key={wd} className="text-[10px] font-black uppercase text-slate-400 py-0.5">
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Previous month trailing days */}
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => {
                const dayNum = daysInPrevMonth - firstDayOfMonth + idx + 1;
                return (
                  <div
                    key={`prev-${idx}`}
                    className="p-1.5 text-xs text-slate-300 select-none pointer-events-none"
                  >
                    {dayNum}
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = value === dateStr;
                const isToday = todayStr === dateStr;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => handleSelectDate(viewYear, viewMonth, dayNum)}
                    className={`p-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center relative cursor-pointer active:scale-90 ${
                      isSelected
                        ? theme.activeBg
                        : isToday
                        ? `${theme.bgLight} ${theme.textAccent} font-bold border ${theme.borderLight} hover:bg-slate-100`
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-purple-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer with Today Shortcut */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSetToday}
                className={`text-xs font-bold ${theme.textAccent} hover:underline cursor-pointer`}
              >
                Ir para Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowMonthSelect(false);
                  setShowYearSelect(false);
                }}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
