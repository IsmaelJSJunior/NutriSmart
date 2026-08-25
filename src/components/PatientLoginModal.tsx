import React, { useState, useEffect } from 'react';
import { User, KeyRound, AlertCircle, X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { ReportRecord } from '../types';

interface PatientLoginModalProps {
  isOpen?: boolean;
  reports: ReportRecord[];
  onClose: () => void;
  onSuccess: (patientCode: string, patientName: string) => void;
}

export const PatientLoginModal: React.FC<PatientLoginModalProps> = ({
  isOpen = true,
  reports = [],
  onClose,
  onSuccess,
}) => {
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Scroll Lock & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  if (isOpen === false) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = patientIdentifier.trim();
    if (!query) {
      setError('Por favor, informe seu nome completo ou código de paciente.');
      return;
    }

    // Match by patient code or by name in reports
    const found = reports.find(
      (r) =>
        r.patientCode.toUpperCase() === query.toUpperCase() ||
        r.formData.nome.toLowerCase() === query.toLowerCase()
    );

    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (found) {
        setError(null);
        onSuccess(found.patientCode, found.formData.nome);
        onClose();
      } else {
        const normalizedCode = query.length <= 6 ? query.toUpperCase() : `P${query.slice(0, 3).toUpperCase()}1`;
        setError(null);
        onSuccess(normalizedCode, query);
        onClose();
      }
    }, 200);
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-200 ease-out select-none ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-sky-100 relative transition-all duration-200 ease-out transform ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition p-1.5 rounded-full hover:bg-slate-100 active:scale-95"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-sky-100/80 flex items-center justify-center text-sky-600 shadow-xs border border-sky-200/50 shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Portal do Paciente
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Acesso ao Plano & Acompanhamento
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nome ou Código do Paciente
            </label>
            <div className="relative">
              <input
                type="text"
                value={patientIdentifier}
                onChange={(e) => setPatientIdentifier(e.target.value)}
                placeholder="Ex: Ana Silva ou ANA1"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha de acesso"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition p-0.5"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <span>Entrar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
