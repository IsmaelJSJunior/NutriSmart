import React, { useState } from 'react';
import { Cloud, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';
import { useFirestoreSyncStatus } from '../hooks/useFirestoreData';
import { CloudSyncModal } from './CloudSyncModal';

interface CloudSyncIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const CloudSyncIndicator: React.FC<CloudSyncIndicatorProps> = ({ className = '' }) => {
  const { status, isSyncing } = useFirestoreSyncStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isSaving = isSyncing || status === 'connecting';
  const isError = status === 'offline';
  const isSuccess = status === 'synced' && !isSaving;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`relative inline-flex items-center justify-center p-1.5 sm:p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs group ${
          isSuccess
            ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/90 text-emerald-600'
            : isSaving
            ? 'bg-amber-50/90 hover:bg-amber-100 border border-amber-300 text-amber-600'
            : 'bg-rose-50/90 hover:bg-rose-100 border border-rose-300 text-rose-600'
        } ${className}`}
        title={
          isSuccess
            ? 'Salvo com sucesso no Firebase Firestore • Clique para ver os últimos 5 salvamentos'
            : isSaving
            ? 'Salvando dados na nuvem... • Clique para ver detalhes'
            : 'Houve algum erro e a sincronização não está ativa • Clique para verificar'
        }
        aria-label={
          isSuccess
            ? 'Status verde: Salvo na nuvem com sucesso'
            : isSaving
            ? 'Status amarelo: Salvando dados na nuvem'
            : 'Status vermelho: Erro na sincronização ou desconectado'
        }
      >
        {/* SVG Ícone de Nuvem Reativo */}
        {isSuccess ? (
          <CloudCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600 transition-transform group-hover:scale-110" />
        ) : isSaving ? (
          <Cloud className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-600 animate-pulse" />
        ) : (
          <CloudOff className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-600 animate-bounce" />
        )}
      </button>

      {/* Modal de Status de Salvamento e Histórico dos Últimos 5 Salvamentos */}
      <CloudSyncModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        status={status}
        isSyncing={isSyncing}
      />
    </>
  );
};
