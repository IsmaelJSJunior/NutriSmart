import React, { useState, useEffect } from 'react';
import { Settings, Download, Upload, X, ShieldCheck, Database, HardDriveDownload, HardDriveUpload } from 'lucide-react';

interface SettingsModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen = true,
  onClose,
  onExportBackup,
  onImportBackup,
}) => {
  const [isClosing, setIsClosing] = useState(false);

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

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-200 ease-out select-none ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative transition-all duration-200 ease-out transform ${
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

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-xs border border-slate-200">
            <Settings className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Configurações & Dados
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Gerenciamento da Base Clínica
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Exporte uma cópia de segurança segura ou restaure dados consolidados (prontuários, agenda e conversas).
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              handleClose();
              setTimeout(onExportBackup, 230);
            }}
            className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-200 flex items-center justify-between group transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <HardDriveDownload className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  Exportar Backup (JSON)
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Salvar cópia completa local
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-y-0.5 transition-all" />
          </button>

          <button
            onClick={() => {
              handleClose();
              setTimeout(onImportBackup, 230);
            }}
            className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50/70 border border-slate-200 hover:border-sky-200 flex items-center justify-between group transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <HardDriveUpload className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                  Importar Backup (Restaurar)
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Carregar arquivo de dados
                </p>
              </div>
            </div>
            <Upload className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:-translate-y-0.5 transition-all" />
          </button>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>NutriSmart Security Engine • Criptografia local</span>
        </div>
      </div>
    </div>
  );
};
