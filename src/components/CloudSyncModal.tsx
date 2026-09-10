import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Cloud,
  CloudOff,
  CloudCheck,
  Check,
  Clock,
  RefreshCw,
  X,
  FileText,
  Calendar,
  MessageSquare,
  Utensils,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { SyncStatus, SyncLogEntry, dataStore } from '../services/storage';
import { useSyncLogs } from '../hooks/useFirestoreData';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncStatus;
  isSyncing: boolean;
}

function formatLogTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 30) return 'Agora mesmo';
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return (
      date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
      ' às ' +
      date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return 'Recente';
  }
}

function getLogIcon(type: SyncLogEntry['type']) {
  switch (type) {
    case 'report':
      return {
        icon: <FileText className="w-4 h-4 text-emerald-600" />,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badge: 'Prontuário',
      };
    case 'appointment':
      return {
        icon: <Calendar className="w-4 h-4 text-blue-600" />,
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        badge: 'Agenda',
      };
    case 'chat':
      return {
        icon: <MessageSquare className="w-4 h-4 text-violet-600" />,
        bg: 'bg-violet-50 text-violet-700 border-violet-200',
        badge: 'Chat',
      };
    case 'recipe':
      return {
        icon: <Utensils className="w-4 h-4 text-amber-600" />,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        badge: 'Cozinha',
      };
    case 'calculator':
      return {
        icon: <Calculator className="w-4 h-4 text-teal-600" />,
        bg: 'bg-teal-50 text-teal-700 border-teal-200',
        badge: 'Cálculo',
      };
    case 'system':
    default:
      return {
        icon: <Database className="w-4 h-4 text-indigo-600" />,
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        badge: 'Sistema',
      };
  }
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  status,
  isSyncing,
}) => {
  const logs = useSyncLogs();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsMounted(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Handle escape key and scroll lock
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
      setIsMounted(false);
      onClose();
    }, 220);
  };

  if (!isOpen && !isMounted) return null;

  const isVisible = isMounted && !isClosing;
  const isSaving = isSyncing || status === 'connecting';
  const isError = status === 'offline';
  const isSavedSuccess = status === 'synced' && !isSaving;

  // Pegar os últimos 5 salvamentos realizados
  const last5Logs = logs.slice(0, 5);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await dataStore.testConnection();
      setTestResult({
        success: res.success,
        message: res.success ? `Conexão testada com sucesso! Resposta em ${res.latencyMs}ms.` : res.message,
      });
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Falha ao testar conexão com o Firestore.',
      });
    } finally {
      setTesting(false);
    }
  };

  const modalContent = (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300 ease-out select-none ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-sync-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative transition-all duration-300 ease-out transform flex flex-col max-h-[88vh] ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3'
        }`}
      >
        {/* Botão de Fechar no mesmo estilo de SettingsModal */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition p-1.5 rounded-full hover:bg-slate-100 active:scale-95 cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header no mesmo estilo e tipografia de SettingsModal */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs border transition-colors ${
              isSavedSuccess
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isSaving
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {isSavedSuccess ? (
              <CloudCheck className="w-5 h-5 text-emerald-600" />
            ) : isSaving ? (
              <Cloud className="w-5 h-5 text-amber-600 animate-pulse" />
            ) : (
              <CloudOff className="w-5 h-5 text-rose-600" />
            )}
          </div>
          <div>
            <h3 id="cloud-sync-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
              Status de Salvamento na Nuvem
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Firebase Firestore • Conexão em Tempo Real
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Monitore o estado de sincronização contínua e consulte os últimos registros salvos automaticamente no banco de dados na nuvem.
        </p>

        {/* Conteúdo rolável */}
        <div className="overflow-y-auto space-y-4 pr-1 -mr-1">
          {/* Card de Diagnóstico do Status */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isSavedSuccess
                ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-900'
                : isSaving
                ? 'bg-amber-50/70 border-amber-200/90 text-amber-900'
                : 'bg-rose-50/70 border-rose-200/90 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  isSavedSuccess
                    ? 'bg-emerald-200/70 text-emerald-800'
                    : isSaving
                    ? 'bg-amber-200/70 text-amber-800'
                    : 'bg-rose-200/70 text-rose-800'
                }`}
              >
                {isSavedSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                ) : isSaving ? (
                  <RefreshCw className="w-5 h-5 text-amber-700 animate-spin" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-700" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    {isSavedSuccess
                      ? 'Nuvem Conectada e Salva com Sucesso'
                      : isSaving
                      ? 'Salvando Dados na Nuvem...'
                      : 'Sincronização Inativa / Erro de Conexão'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isSavedSuccess
                        ? 'bg-emerald-200/80 text-emerald-900'
                        : isSaving
                        ? 'bg-amber-200/80 text-amber-900'
                        : 'bg-rose-200/80 text-rose-900'
                    }`}
                  >
                    {isSavedSuccess ? 'Verde • Salvo' : isSaving ? 'Amarela • Salvando' : 'Vermelha • Erro'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {isSavedSuccess &&
                    'Todos os prontuários, agendamentos, mensagens e receitas estão salvos com segurança no Firebase Firestore e sincronizados em tempo real.'}
                  {isSaving &&
                    'Gravando alterações nos servidores em nuvem. As atualizações serão confirmadas imediatamente.'}
                  {isError &&
                    'A conexão com a nuvem não está ativa ou falhou. O sistema está operando com cache local secundário e tentará reconectar automaticamente.'}
                </p>
              </div>
            </div>

            {/* Mensagem de teste de conexão se houver */}
            {testResult && (
              <div
                className={`mt-3 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100/90 text-rose-800 border border-rose-300'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Seção: Últimos 5 Salvamentos Realizados (Sem badge "Tempo real") */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Últimos 5 Salvamentos Realizados</span>
            </div>

            {last5Logs.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs">
                Nenhum salvamento registrado recentemente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {last5Logs.map((log, index) => {
                  const info = getLogIcon(log.type);
                  return (
                    <div
                      key={log.id || index}
                      className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${info.bg}`}
                          title={info.badge}
                        >
                          {info.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {log.action}
                            </span>
                            <span className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                              {info.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-[220px] sm:max-w-xs mt-0.5">
                            {log.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatLogTime(log.timestamp)}
                        </span>
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            Salvo
                          </span>
                        ) : log.status === 'syncing' ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            <RefreshCw className="w-2.5 h-2.5 text-amber-600 animate-spin" />
                            Gravando
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                            Erro
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legenda Explicativa das Cores */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Significado das Cores do Ícone:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span>
                <strong className="text-emerald-700 font-semibold">Verde:</strong> Sincronizado e salvo na nuvem com sucesso.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              <span>
                <strong className="text-amber-700 font-semibold">Amarela:</strong> Gravando e sincronizando alterações na nuvem.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span>
                <strong className="text-rose-700 font-semibold">Vermelha:</strong> Falha de conexão ou sincronização inativa.
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações no mesmo padrão de SettingsModal */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>

          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
