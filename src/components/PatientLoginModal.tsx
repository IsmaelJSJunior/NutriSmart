import React, { useState, useEffect } from 'react';
import { User, Lock, AlertCircle, X, ArrowRight, Eye, EyeOff } from 'lucide-react';
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger smooth entry animation after mount
      const timer = setTimeout(() => setIsMounted(true), 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsMounted(false);
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

    if (!password.trim()) {
      setError('Por favor, informe sua senha de acesso.');
      return;
    }

    // Match by patient code or by name in reports
    const found = reports.find(
      (r) =>
        r.patientCode.trim().toUpperCase() === query.toUpperCase() ||
        r.formData.nome.trim().toLowerCase() === query.toLowerCase()
    );

    // Strict validation: must exist in reports and match password
    const passwordMatch =
      found &&
      (!found.formData.senha || found.formData.senha.trim() === password.trim());

    if (!found || !passwordMatch) {
      setError(
        'Credenciais incorretas. Por favor, revise os dados informados ou entre em contato com sua nutricionista (Dra. Maria Eduarda).'
      );
      return;
    }

    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsMounted(false);
      setError(null);
      onSuccess(found.patientCode, found.formData.nome);
      onClose();
    }, 200);
  };

  const isVisible = isMounted && !isClosing;

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300 ease-out select-none ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-sky-100 relative transition-all duration-300 ease-out transform ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3'
        }`}
      >
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition p-1.5 rounded-full hover:bg-slate-100 active:scale-95 cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-emerald-500/30 shadow-xs">
            <img src="/logo.png" alt="NutriClinical Logo" className="w-full h-full object-cover rounded-full" />
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
                onChange={(e) => {
                  setPatientIdentifier(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ex: Nome do Paciente ou Código (ex: PAC1)"
                className={`w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none transition pr-10 ${
                  error
                    ? 'bg-rose-50/40 border border-rose-300 ring-2 ring-rose-200/70 focus:ring-rose-300'
                    : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:bg-white'
                }`}
                autoFocus
              />
              <User className={`w-4 h-4 absolute right-3.5 top-3.5 ${error ? 'text-rose-400' : 'text-slate-400'}`} />
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Digite sua senha de acesso"
                className={`w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none transition pr-11 ${
                  error
                    ? 'bg-rose-50/40 border border-rose-300 ring-2 ring-rose-200/70 focus:ring-rose-300'
                    : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-rose-50/90 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium animate-in fade-in leading-relaxed shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
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

