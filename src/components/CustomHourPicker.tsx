import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Check, X } from 'lucide-react';

interface CustomHourPickerProps {
  value: string; // "HH:MM" e.g. "10:30"
  onChange: (timeStr: string) => void;
  accentColor?: 'purple' | 'emerald' | 'sky';
  label?: string;
  placeholder?: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const CustomHourPicker: React.FC<CustomHourPickerProps> = ({
  value = '10:00',
  onChange,
  accentColor = 'purple',
  label,
  placeholder = 'Selecione o horário',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  // Split value into hour and minute
  const [currentHour, currentMinute] = (value && value.includes(':'))
    ? value.split(':')
    : ['10', '00'];

  const [selectedHour, setSelectedHour] = useState(currentHour || '10');
  const [selectedMinute, setSelectedMinute] = useState(currentMinute || '00');

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setSelectedHour(h || '10');
      setSelectedMinute(m || '00');
    }
  }, [value]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectHour = (h: string) => {
    setSelectedHour(h);
    const newTime = `${h}:${selectedMinute}`;
    onChange(newTime);
  };

  const handleSelectMinute = (m: string) => {
    setSelectedMinute(m);
    const newTime = `${selectedHour}:${m}`;
    onChange(newTime);
  };

  const handleNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const rawM = now.getMinutes();
    const roundedM = String(Math.round(rawM / 5) * 5 % 60).padStart(2, '0');
    setSelectedHour(h);
    setSelectedMinute(roundedM);
    onChange(`${h}:${roundedM}`);
    setIsOpen(false);
  };

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
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 transition focus:outline-none focus:ring-2 ${theme.btnHover} cursor-pointer shadow-2xs hover:bg-white`}
      >
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${theme.iconColor} shrink-0`} />
          <span className="text-slate-800 font-bold font-mono text-sm">
            {value || placeholder}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded">
          {parseInt(selectedHour, 10) < 12 ? 'Manhã' : parseInt(selectedHour, 10) < 18 ? 'Tarde' : 'Noite'}
        </span>
      </button>

      {/* Global Centralized Modal (Exact Viewport Center with Dark Backdrop Blur) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[300px] max-w-full bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-4 sm:p-5 animate-in zoom-in-95 fade-in duration-200 ease-out select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Clock className={`w-4 h-4 ${theme.iconColor}`} />
                <h4 className="text-xs sm:text-sm font-black text-slate-800">
                  Selecionar Horário
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-mono font-black text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                  {selectedHour}:{selectedMinute}
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {['08:00', '10:00', '14:00', '16:00'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const [ph, pm] = preset.split(':');
                    setSelectedHour(ph);
                    setSelectedMinute(pm);
                    onChange(preset);
                  }}
                  className={`py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer active:scale-95 ${
                    value === preset
                      ? `${theme.bgLight} ${theme.textAccent} ${theme.borderLight}`
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Columns (Hours and Minutes) */}
            <div className="grid grid-cols-2 gap-2 text-center">
              {/* Hours Column */}
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Horas
                </span>
                <div
                  ref={hourScrollRef}
                  className="max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin rounded-xl bg-slate-50 p-1.5 border border-slate-100"
                >
                  {HOURS.map((h) => {
                    const isSel = selectedHour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleSelectHour(h)}
                        className={`w-full py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                          isSel
                            ? theme.activeBg
                            : 'text-slate-700 hover:bg-slate-200/80'
                        }`}
                      >
                        {h}h
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Column */}
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Minutos
                </span>
                <div
                  ref={minuteScrollRef}
                  className="max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin rounded-xl bg-slate-50 p-1.5 border border-slate-100"
                >
                  {MINUTES.map((m) => {
                    const isSel = selectedMinute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMinute(m)}
                        className={`w-full py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                          isSel
                            ? theme.activeBg
                            : 'text-slate-700 hover:bg-slate-200/80'
                        }`}
                      >
                        :{m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleNow}
                className={`text-xs font-bold ${theme.textAccent} hover:underline cursor-pointer`}
              >
                Horário Atual
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
