import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { dataStore, SyncStatus, STORAGE_KEYS } from '../services/storage';
import { ReportRecord, ChatMessage, Appointment, RecipeItem } from '../types';

/**
 * Hook para monitorar o status de conexão da nuvem e gravação ativa em tempo real.
 */
export function useFirestoreSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(dataStore.getStatus());
  const [isSyncing, setIsSyncing] = useState<boolean>(dataStore.getIsSyncing());

  useEffect(() => {
    const unsubStatus = dataStore.subscribeStatus(setStatus);
    const unsubSyncing = dataStore.subscribeSyncing(setIsSyncing);
    return () => {
      unsubStatus();
      unsubSyncing();
    };
  }, []);

  return { status, isSyncing };
}

/**
 * Hook reativo para Prontuários e Fichas Clínicas em tempo real (onSnapshot).
 */
export function useReports() {
  const [reports, setReports] = useState<ReportRecord[]>(() => dataStore.getReports());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sincronização via dataStore (que gerencia o listener onSnapshot central)
    const unsub = dataStore.subscribeReports((data) => {
      setReports(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { reports, loading, saveReport: dataStore.saveReport.bind(dataStore), deleteReport: dataStore.deleteReport.bind(dataStore) };
}

/**
 * Hook reativo específico para Pacientes (compatibilidade com usePatients).
 */
export function usePatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, 'patients'), orderBy('updatedAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setPatients(data);
          setLoading(false);
          try {
            localStorage.setItem('nutriclinical_patients_cache', JSON.stringify(data));
          } catch (e) {
            console.warn('Erro ao atualizar cache local de pacientes:', e);
          }
        },
        (error) => {
          console.error('Erro no listener Firestore usePatients:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Falha ao iniciar listener usePatients:', e);
      setLoading(false);
    }
  }, []);

  return { patients, loading };
}

/**
 * Hook reativo para Consultas da Agenda em tempo real (onSnapshot).
 */
export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => dataStore.getAgenda());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = dataStore.subscribeAgenda((data) => {
      setAppointments(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return {
    appointments,
    loading,
    saveAppointment: dataStore.saveAppointment.bind(dataStore),
    deleteAppointment: dataStore.deleteAppointment.bind(dataStore),
  };
}

/**
 * Hook reativo para Chat Nutricionista ↔ Paciente em tempo real (onSnapshot).
 */
export function useMessages(patientCode?: string) {
  const [allMessages, setAllMessages] = useState<ChatMessage[]>(() => dataStore.getMessages());

  useEffect(() => {
    const unsub = dataStore.subscribeChat(setAllMessages);
    return () => unsub();
  }, []);

  const messages = patientCode
    ? allMessages.filter((m) => m.patientCode.toUpperCase() === patientCode.trim().toUpperCase())
    : allMessages;

  return {
    messages,
    sendMessage: dataStore.sendMessage.bind(dataStore),
    markAsRead: dataStore.markMessagesAsRead.bind(dataStore),
  };
}

/**
 * Hook reativo para Receitas Salvas em tempo real (onSnapshot).
 */
export function useRecipes() {
  const [recipes, setRecipes] = useState<RecipeItem[]>(() => dataStore.getRecipes());

  useEffect(() => {
    const unsub = dataStore.subscribeRecipes(setRecipes);
    return () => unsub();
  }, []);

  return {
    recipes,
    saveRecipe: dataStore.saveRecipe.bind(dataStore),
    deleteRecipe: dataStore.deleteRecipe.bind(dataStore),
  };
}

/**
 * Hook reativo para Histórico dos Últimos Salvamentos e Sincronizações em Nuvem.
 */
export function useSyncLogs() {
  const [logs, setLogs] = useState(() => dataStore.getSyncLogs());

  useEffect(() => {
    const unsub = dataStore.subscribeSyncLogs(setLogs);
    return () => unsub();
  }, []);

  return logs;
}

