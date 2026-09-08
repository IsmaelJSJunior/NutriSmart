import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Loader2, Database } from 'lucide-react';
import { dataStore } from '../services/storage';
import { ReportRecord, Appointment, ChatMessage, RecipeItem } from '../types';

interface ImportBackupModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onImport?: (data: {
    reports?: ReportRecord[];
    agenda?: Appointment[];
    appointments?: Appointment[];
    chatMessages?: ChatMessage[];
    allMessages?: ChatMessage[];
    recipes?: RecipeItem[];
    calculatorState?: any;
    pinnedPatients?: string[];
  }) => Promise<void>;
  onSuccess?: (count: number) => void;
}

export const ImportBackupModal: React.FC<ImportBackupModalProps> = ({
  isOpen = true,
  onClose,
  onImport,
  onSuccess,
}) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedStats, setParsedStats] = useState<{
    reportsCount: number;
    agendaCount: number;
    messagesCount: number;
    recipesCount: number;
    hasCalculator: boolean;
  } | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
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

  const isVisible = isMounted && !isClosing;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setParsedStats(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);

      try {
        const parsed = JSON.parse(text);
        const reportsList = Array.isArray(parsed.reports) ? parsed.reports : [];
        const apptsList = Array.isArray(parsed.appointments) ? parsed.appointments : (Array.isArray(parsed.agenda) ? parsed.agenda : []);
        const msgsList = Array.isArray(parsed.allMessages) ? parsed.allMessages : (Array.isArray(parsed.chatMessages) ? parsed.chatMessages : []);
        const recipesList = Array.isArray(parsed.recipes) ? parsed.recipes : [];
        const hasCalc = !!parsed.calculatorState;

        if (reportsList.length === 0 && apptsList.length === 0 && msgsList.length === 0 && recipesList.length === 0 && !hasCalc) {
          setError('O arquivo selecionado não contém uma estrutura de dados reconhecida do NutriClinical.');
          setParsedStats(null);
        } else {
          setParsedStats({
            reportsCount: reportsList.length,
            agendaCount: apptsList.length,
            messagesCount: msgsList.length,
            recipesCount: recipesList.length,
            hasCalculator: hasCalc,
          });
        }
      } catch {
        setError('Arquivo corrompido ou formato JSON inválido.');
        setParsedStats(null);
      }
    };
    reader.onerror = () => {
      setError('Falha ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!fileContent) {
      setError('Por favor, selecione um arquivo JSON de backup válido.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (onImport) {
        const parsed = JSON.parse(fileContent);
        await onImport(parsed);
        handleClose();
      } else {
        const result = await dataStore.importConsolidatedBackup(fileContent);
        if (result.success) {
          if (onSuccess) onSuccess(result.count);
          handleClose();
        } else {
          setError(result.error || 'Erro ao importar backup.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado na importação.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300 ease-out select-none ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative transition-all duration-300 ease-out transform ${
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

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Restaurar Backup</h3>
            <p className="text-xs text-slate-500 font-medium">Prontuários, Conversas e Agenda</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Selecione o arquivo <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-700 font-mono font-semibold">.json</code> exportado pelo NutriClinical para sincronizar a base local com segurança.
        </p>

        <div className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 rounded-2xl p-6 text-center transition mb-4 relative cursor-pointer">
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="flex flex-col items-center">
            <FileText className="w-9 h-9 text-sky-500 mb-2 stroke-[1.5]" />
            <span className="text-xs font-bold text-slate-800">
              {fileName ? fileName : 'Clique ou arraste o arquivo de backup'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Formato JSON NutriClinical</span>
          </div>
        </div>

        {parsedStats && (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3 mb-4 text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Backup íntegro e pronto para restauração:</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700 font-medium">
              <div>• {parsedStats.reportsCount} prontuários</div>
              <div>• {parsedStats.agendaCount} compromissos</div>
              <div>• {parsedStats.messagesCount} mensagens</div>
              <div>• {parsedStats.recipesCount} receitas</div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2.5 justify-end mt-5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!fileContent || isLoading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 text-white font-bold text-xs shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5 transition active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Restauração</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
