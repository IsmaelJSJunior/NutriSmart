import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { History, ChevronDown, Check } from 'lucide-react';
import { ReportRecord } from '../types';

interface HistoryDropdownProps {
  history: ReportRecord[];
  selectedReportId?: string;
  onSelect: (report: ReportRecord) => void;
  className?: string;
}

export const HistoryDropdown: React.FC<HistoryDropdownProps> = ({
  history,
  selectedReportId,
  onSelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Default to latest if not set
  const activeReport = history.find((r) => r.id === selectedReportId) || history[0];
  const activeIndex = history.findIndex((r) => r.id === activeReport?.id);
  const consultationNumber = history.length - (activeIndex >= 0 ? activeIndex : 0);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 250;
    const dropdownHeight = 220;

    // Align right with button right edge
    let left = rect.right - dropdownWidth;
    if (left < 10) left = 10;
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - dropdownWidth - 10);
    }

    let top = rect.bottom + 6;
    if (top + dropdownHeight > window.innerHeight - 10) {
      top = Math.max(10, rect.top - dropdownHeight - 6);
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  if (!history || history.length <= 1) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 rounded-xl text-[11px] font-bold text-slate-700 transition cursor-pointer shadow-2xs hover:border-emerald-300"
        title="Histórico de consultas do paciente"
      >
        <History className="w-3 h-3 text-emerald-600 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[150px]">
          Consulta #{consultationNumber} • {new Date(activeReport.date).toLocaleDateString('pt-BR')}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Floating Menu via Portal (No overflow clipping, z-index immune) */}
      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 z-[80] bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          <div
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '250px',
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[85] bg-white/98 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
              <span>Histórico de Avaliações</span>
              <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono font-bold text-slate-500">
                {history.length}
              </span>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin">
              {history.map((report, idx) => {
                const isSelected = report.id === activeReport.id;
                const num = history.length - idx;

                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => {
                      onSelect(report);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[11px]">
                          Consulta #{num}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(report.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {report.formData.peso} kg • {report.formData.tipoDieta || 'Personalizada'}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
