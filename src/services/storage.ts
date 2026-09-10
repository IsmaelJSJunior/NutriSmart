import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ReportRecord, ChatMessage, Appointment, RecipeItem, WaterIntakeRecord } from '../types';

// ==========================================
// STORAGE KEYS & CACHE DEFINITIONS
// ==========================================
export const STORAGE_KEYS = {
  REPORTS: 'nutriclinical_reports_v1',
  MESSAGES: 'nutriclinical_chat_v1',
  AGENDA: 'nutriclinical_agenda_v1',
  RECIPES: 'nutriclinical_recipes_v1',
  CALCULATOR: 'nutriclinical_calc_session_v1',
  PINNED_PATIENTS: 'nutriclinical_pinned_patients_v1',
  RECIPE_QUOTAS: 'nutriclinical_recipe_quotas_v1',
  SYNC_LOGS: 'nutriclinical_sync_logs_v1',
  WATER_INTAKE: 'nutriclinical_water_intake_v1',
} as const;

export interface SyncLogEntry {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  status: 'success' | 'syncing' | 'error';
  type: 'report' | 'appointment' | 'chat' | 'recipe' | 'calculator' | 'system';
}

export function isMockItem(id?: string): boolean {
  if (!id) return false;
  return id.startsWith('mock_ana_silva') || id.startsWith('appnt_') || id.startsWith('msg_init_');
}

const DEFAULT_SYNC_LOGS: SyncLogEntry[] = [
  {
    id: 'log_system_init',
    action: 'Sincronização em nuvem ativa',
    description: 'Firebase Firestore conectado em tempo real',
    timestamp: new Date().toISOString(),
    status: 'success',
    type: 'system',
  },
];

// Firestore Collection Names (Single Source of Truth)
const COLLECTIONS = {
  REPORTS: 'reports',
  PATIENTS: 'patients',
  AGENDA: 'agenda',
  MESSAGES: 'messages',
  RECIPES: 'recipes',
  CALCULATOR: 'calculator',
  SETTINGS: 'settings',
  WATER_INTAKE: 'water_intake',
} as const;

export type SyncStatus = 'synced' | 'connecting' | 'offline';

// Helper for local cache resilience
export function getLocalData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage write failed:', e);
  }
}

// Sanitize objects for Firestore to prevent "Unsupported field value: undefined"
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        clean[k] = sanitizeForFirestore(v);
      }
    }
    return clean as any;
  }
  return data;
}

// ==========================================
// PINNED PATIENTS HELPERS (SSoT via DataStore & Cloud Firestore)
// ==========================================
export function getPinnedPatientCodes(): string[] {
  return dataStore ? dataStore.getPinnedPatientCodes() : getLocalData<string[]>(STORAGE_KEYS.PINNED_PATIENTS, []);
}

export function togglePinnedPatientCode(code: string): Promise<string[]> {
  if (dataStore) {
    return dataStore.togglePinnedPatientCode(code);
  }
  const current = getLocalData<string[]>(STORAGE_KEYS.PINNED_PATIENTS, []);
  const normalized = code.trim().toUpperCase();
  const exists = current.includes(normalized);
  const updated = exists ? current.filter((c) => c !== normalized) : [...current, normalized];
  setLocalData(STORAGE_KEYS.PINNED_PATIENTS, updated);
  return Promise.resolve(updated);
}

// ==========================================
// RECIPE QUOTAS
// ==========================================
export interface PatientRecipeQuota {
  patientCode: string;
  count: number;
  lastUsedDate: string;
}

export function getPatientRecipeQuota(patientCode: string): PatientRecipeQuota {
  const today = new Date().toISOString().split('T')[0];
  const all = getLocalData<Record<string, PatientRecipeQuota>>(STORAGE_KEYS.RECIPE_QUOTAS, {});
  const code = patientCode.trim().toUpperCase();
  const quota = all[code];
  if (!quota || quota.lastUsedDate !== today) {
    return { patientCode: code, count: 0, lastUsedDate: today };
  }
  return quota;
}

export function incrementPatientRecipeQuota(patientCode: string, count: number = 1): number {
  const today = new Date().toISOString().split('T')[0];
  const all = getLocalData<Record<string, PatientRecipeQuota>>(STORAGE_KEYS.RECIPE_QUOTAS, {});
  const code = patientCode.trim().toUpperCase();
  const current = all[code] && all[code].lastUsedDate === today ? all[code].count : 0;
  const newCount = current + count;
  all[code] = { patientCode: code, count: newCount, lastUsedDate: today };
  setLocalData(STORAGE_KEYS.RECIPE_QUOTAS, all);
  return newCount;
}

// ==========================================
// CENTRAL DATA STORE (Cloud-First SSoT)
// ==========================================
export class DataStore {
  private reports: ReportRecord[] = [];
  private messages: ChatMessage[] = [];
  private agenda: Appointment[] = [];
  private recipes: RecipeItem[] = [];
  private calculatorState: any = null;
  private syncLogs: SyncLogEntry[] = [];
  private pinnedCodes: string[] = [];
  private waterIntake: Record<string, WaterIntakeRecord> = {};

  private reportsListeners: Set<(data: ReportRecord[]) => void> = new Set();
  private messagesListeners: Set<(data: ChatMessage[]) => void> = new Set();
  private agendaListeners: Set<(data: Appointment[]) => void> = new Set();
  private recipesListeners: Set<(data: RecipeItem[]) => void> = new Set();
  private calculatorListeners: Set<(data: any) => void> = new Set();
  private pinnedListeners: Set<(codes: string[]) => void> = new Set();
  private waterIntakeListeners: Set<(data: Record<string, WaterIntakeRecord>) => void> = new Set();
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private syncingListeners: Set<(isSyncing: boolean) => void> = new Set();
  private syncLogsListeners: Set<(logs: SyncLogEntry[]) => void> = new Set();

  private status: SyncStatus = 'connecting';
  private isSyncing: boolean = false;
  private hasInitializedRemote: boolean = false;
  private syncCount: number = 0;

  constructor() {
    // 1. Initialize from local storage cache, purging any previous mock data
    this.reports = getLocalData<ReportRecord[]>(STORAGE_KEYS.REPORTS, []).filter((r) => !isMockItem(r.id));
    this.messages = getLocalData<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []).filter((m) => !isMockItem(m.id));
    this.agenda = getLocalData<Appointment[]>(STORAGE_KEYS.AGENDA, []).filter((a) => !isMockItem(a.id));
    this.recipes = getLocalData<RecipeItem[]>(STORAGE_KEYS.RECIPES, []);
    this.calculatorState = getLocalData<any>(STORAGE_KEYS.CALCULATOR, null);
    this.pinnedCodes = getLocalData<string[]>(STORAGE_KEYS.PINNED_PATIENTS, []);
    this.waterIntake = getLocalData<Record<string, WaterIntakeRecord>>(STORAGE_KEYS.WATER_INTAKE, {});
    this.syncLogs = getLocalData<SyncLogEntry[]>(STORAGE_KEYS.SYNC_LOGS, DEFAULT_SYNC_LOGS).filter(
      (l) => !l.description.includes('Ana Silva') && !l.description.includes('Qualisan')
    );

    setLocalData(STORAGE_KEYS.REPORTS, this.reports);
    setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
    setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
    setLocalData(STORAGE_KEYS.PINNED_PATIENTS, this.pinnedCodes);
    setLocalData(STORAGE_KEYS.WATER_INTAKE, this.waterIntake);
    setLocalData(STORAGE_KEYS.SYNC_LOGS, this.syncLogs);

    // 2. Start Cloud-First Firestore real-time synchronization
    this.initFirestoreSync();
  }

  // Status & Syncing Getters & Subscriptions
  public getStatus(): SyncStatus {
    return this.status;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getSyncLogs(): SyncLogEntry[] {
    return this.syncLogs;
  }

  public subscribeSyncLogs(fn: (logs: SyncLogEntry[]) => void): () => void {
    this.syncLogsListeners.add(fn);
    fn(this.syncLogs);
    return () => this.syncLogsListeners.delete(fn);
  }

  public addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp'> & { timestamp?: string }): void {
    const newEntry: SyncLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      ...entry,
    };
    // Keep most recent first, max 20 entries
    this.syncLogs = [newEntry, ...this.syncLogs.filter((l) => l.id !== newEntry.id)].slice(0, 20);
    setLocalData(STORAGE_KEYS.SYNC_LOGS, this.syncLogs);
    this.syncLogsListeners.forEach((fn) => fn(this.syncLogs));
  }

  public subscribeStatus(fn: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  public subscribeSyncing(fn: (isSyncing: boolean) => void): () => void {
    this.syncingListeners.add(fn);
    fn(this.isSyncing);
    return () => this.syncingListeners.delete(fn);
  }

  private setSyncing(syncing: boolean): void {
    if (syncing) {
      this.syncCount++;
    } else {
      this.syncCount = Math.max(0, this.syncCount - 1);
    }
    const currentSyncing = this.syncCount > 0;
    if (this.isSyncing !== currentSyncing) {
      this.isSyncing = currentSyncing;
      this.syncingListeners.forEach((fn) => fn(this.isSyncing));
    }
  }

  private setStatus(newStatus: SyncStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((fn) => fn(this.status));
    }
  }

  // ==========================================
  // FIRESTORE REAL-TIME LISTENERS (onSnapshot)
  // ==========================================
  private initFirestoreSync(): void {
    if (!db) {
      this.setStatus('offline');
      return;
    }

    try {
      this.setStatus('connecting');

      // 1. Prontuários e Fichas Clínicas (Reports)
      const reportsRef = collection(db, COLLECTIONS.REPORTS);
      onSnapshot(
        reportsRef,
        (snapshot) => {
          const remoteReports = snapshot.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
              } as ReportRecord;
            })
            .filter((r) => {
              if (
                isMockItem(r.id) ||
                (r.patientCode === 'ANA1' && r.formData?.nome === 'Ana Silva' && r.id.startsWith('mock_'))
              ) {
                // Delete legacy mock data from cloud Firestore
                if (db) {
                  deleteDoc(doc(db, COLLECTIONS.REPORTS, r.id)).catch(() => {});
                }
                return false;
              }
              return true;
            });

          // Sort by consultation date descending
          remoteReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          this.reports = remoteReports;
          // Update local cache as secondary storage
          setLocalData(STORAGE_KEYS.REPORTS, this.reports);
          this.reportsListeners.forEach((fn) => fn(this.reports));
          this.setStatus('synced');
        },
        (error) => {
          console.warn('NutriClinical Firestore reports listener error:', error);
          this.setStatus('offline');
        }
      );

      // 2. Chat Nutricionista ↔ Paciente (Messages)
      const messagesRef = collection(db, COLLECTIONS.MESSAGES);
      onSnapshot(
        messagesRef,
        (snapshot) => {
          const remoteMessages = snapshot.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
            } as ChatMessage))
            .filter((m) => {
              if (isMockItem(m.id) || (m.patientCode === 'ANA1' && m.id.startsWith('msg_init_'))) {
                if (db) {
                  deleteDoc(doc(db, COLLECTIONS.MESSAGES, m.id)).catch(() => {});
                }
                return false;
              }
              return true;
            });

          // Sort messages chronologically
          remoteMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          this.messages = remoteMessages;
          setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
          this.messagesListeners.forEach((fn) => fn(this.messages));
          this.setStatus('synced');
        },
        (error) => {
          console.warn('NutriClinical Firestore chat listener error:', error);
        }
      );

      // 3. Agenda Integrada / Consultas (Appointments)
      const agendaRef = collection(db, COLLECTIONS.AGENDA);
      onSnapshot(
        agendaRef,
        (snapshot) => {
          const remoteAgenda = snapshot.docs
            .map((d) => ({
              id: d.id,
              ...d.data(),
            } as Appointment))
            .filter((a) => {
              if (
                isMockItem(a.id) ||
                (a.title?.includes('Ana Silva') && a.id.startsWith('appnt_')) ||
                (a.title?.includes('Dr. Ricardo') && a.id.startsWith('appnt_'))
              ) {
                if (db) {
                  deleteDoc(doc(db, COLLECTIONS.AGENDA, a.id)).catch(() => {});
                }
                return false;
              }
              return true;
            });

          remoteAgenda.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
            const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
            return dateA - dateB;
          });

          this.agenda = remoteAgenda;
          setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
          this.agendaListeners.forEach((fn) => fn(this.agenda));
          this.setStatus('synced');
        },
        (error) => {
          console.warn('NutriClinical Firestore agenda listener error:', error);
        }
      );

      // 4. Receitas Salvas e Prescrições (Recipes)
      const recipesRef = collection(db, COLLECTIONS.RECIPES);
      onSnapshot(
        recipesRef,
        (snapshot) => {
          const remoteRecipes = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          } as unknown as RecipeItem));

          this.recipes = remoteRecipes;
          setLocalData(STORAGE_KEYS.RECIPES, this.recipes);
          this.recipesListeners.forEach((fn) => fn(this.recipes));
          this.setStatus('synced');
        },
        (error) => {
          console.warn('NutriClinical Firestore recipes listener error:', error);
        }
      );

      // 5. Calculadora Nutricional (Calculator Session)
      const calculatorDocRef = doc(db, COLLECTIONS.CALCULATOR, 'latest');
      onSnapshot(
        calculatorDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            this.calculatorState = docSnap.data();
            setLocalData(STORAGE_KEYS.CALCULATOR, this.calculatorState);
            this.calculatorListeners.forEach((fn) => fn(this.calculatorState));
          }
          this.setStatus('synced');
        },
        (error) => {
          console.warn('NutriClinical Firestore calculator listener error:', error);
        }
      );

      // 6. Prontuários Fixados em Tempo Real entre Dispositivos (Settings / Pinned Patients)
      const pinnedDocRef = doc(db, COLLECTIONS.SETTINGS, 'pinned_patients');
      onSnapshot(
        pinnedDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (Array.isArray(data?.codes)) {
              const remoteCodes = data.codes
                .map((c: any) => String(c).trim().toUpperCase())
                .filter(Boolean);

              const isDifferent =
                remoteCodes.length !== this.pinnedCodes.length ||
                remoteCodes.some((c, i) => c !== this.pinnedCodes[i]);

              if (isDifferent) {
                this.pinnedCodes = remoteCodes;
                setLocalData(STORAGE_KEYS.PINNED_PATIENTS, this.pinnedCodes);
                this.pinnedListeners.forEach((fn) => fn(this.pinnedCodes));
              }
            }
          }
          this.setStatus('synced');
        },
        (error) => {
          console.warn('NutriClinical Firestore pinned patients listener error:', error);
        }
      );

      // 7. Registro de Ingestão Hídrica Diária em Tempo Real (Water Intake)
      const waterRef = collection(db, COLLECTIONS.WATER_INTAKE);
      onSnapshot(
        waterRef,
        (snapshot) => {
          const map: Record<string, WaterIntakeRecord> = {};
          snapshot.docs.forEach((d) => {
            const data = d.data() as WaterIntakeRecord;
            map[d.id] = { ...data, id: d.id };
          });
          this.waterIntake = { ...this.waterIntake, ...map };
          setLocalData(STORAGE_KEYS.WATER_INTAKE, this.waterIntake);
          this.waterIntakeListeners.forEach((fn) => fn(this.waterIntake));
          this.setStatus('synced');
        },
        (error) => {
          console.warn('NutriClinical Firestore waterIntake listener error:', error);
        }
      );
    } catch (e) {
      console.warn('NutriClinical: Erro fatal ao configurar listeners Firestore:', e);
      this.setStatus('offline');
    }
  }

  // ==========================================
  // SUBSCRIBERS
  // ==========================================
  public subscribeReports(fn: (data: ReportRecord[]) => void): () => void {
    this.reportsListeners.add(fn);
    fn(this.reports);
    return () => this.reportsListeners.delete(fn);
  }

  public subscribeChat(fn: (data: ChatMessage[]) => void): () => void {
    this.messagesListeners.add(fn);
    fn(this.messages);
    return () => this.messagesListeners.delete(fn);
  }

  public subscribeAgenda(fn: (data: Appointment[]) => void): () => void {
    this.agendaListeners.add(fn);
    fn(this.agenda);
    return () => this.agendaListeners.delete(fn);
  }

  public subscribeRecipes(fn: (data: RecipeItem[]) => void): () => void {
    this.recipesListeners.add(fn);
    fn(this.recipes);
    return () => this.recipesListeners.delete(fn);
  }

  public subscribeCalculator(fn: (data: any) => void): () => void {
    this.calculatorListeners.add(fn);
    fn(this.calculatorState);
    return () => this.calculatorListeners.delete(fn);
  }

  public subscribePinnedPatients(fn: (codes: string[]) => void): () => void {
    this.pinnedListeners.add(fn);
    fn(this.pinnedCodes);
    return () => this.pinnedListeners.delete(fn);
  }

  public subscribeWaterIntake(fn: (data: Record<string, WaterIntakeRecord>) => void): () => void {
    this.waterIntakeListeners.add(fn);
    fn(this.waterIntake);
    return () => this.waterIntakeListeners.delete(fn);
  }

  // Getters
  public getReports(): ReportRecord[] {
    return this.reports;
  }

  public getMessages(): ChatMessage[] {
    return this.messages;
  }

  public getAgenda(): Appointment[] {
    return this.agenda;
  }

  public getRecipes(): RecipeItem[] {
    return this.recipes;
  }

  public getCalculatorState(): any {
    return this.calculatorState;
  }

  public getPinnedPatientCodes(): string[] {
    return [...this.pinnedCodes];
  }

  public getWaterIntake(patientCode: string, date: string): WaterIntakeRecord | null {
    const key = `${patientCode.toUpperCase()}_${date}`;
    return this.waterIntake[key] || null;
  }

  // ==========================================
  // MUTATIONS (Cloud-First Writes with serverTimestamp)
  // ==========================================

  // 1. Salvar ou Atualizar Prontuário / Ficha Clínica
  public async saveReport(report: (Omit<ReportRecord, 'id'> & { id?: string }) | ReportRecord): Promise<void> {
    const reportId = report.id || `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullReport: ReportRecord = {
      ...report,
      id: reportId,
      patientCode: (report.patientCode || report.formData?.patientCode || 'PACIENTE').toUpperCase(),
    };

    const isUpdate = this.reports.some((r) => r.id === fullReport.id);
    const patientName = fullReport.formData?.nome || 'Paciente';

    // Optimistic local update
    const index = this.reports.findIndex((r) => r.id === fullReport.id);
    if (index >= 0) {
      this.reports[index] = fullReport;
    } else {
      this.reports.unshift(fullReport);
    }
    setLocalData(STORAGE_KEYS.REPORTS, this.reports);
    this.reportsListeners.forEach((fn) => fn(this.reports));

    this.addSyncLog({
      action: isUpdate ? 'Prontuário atualizado' : 'Adicionado prontuário',
      description: `${patientName} (${fullReport.patientCode})`,
      status: 'success',
      type: 'report',
    });

    // Cloud write
    if (db) {
      this.setSyncing(true);
      try {
        const reportDocRef = doc(db, COLLECTIONS.REPORTS, fullReport.id);
        const reportPayload = sanitizeForFirestore({
          ...fullReport,
          updatedAt: serverTimestamp(),
          clientUpdatedAt: new Date().toISOString(),
        });
        await setDoc(reportDocRef, reportPayload, { merge: true });

        // Também sincroniza/atualiza o documento resumo de paciente em /patients/{code}
        const patientCode = fullReport.patientCode.toUpperCase();
        const patientDocRef = doc(db, COLLECTIONS.PATIENTS, patientCode);
        const patientPayload = sanitizeForFirestore({
          id: patientCode,
          patientCode: patientCode,
          nome: fullReport.formData?.nome || 'Paciente',
          telefone: fullReport.formData?.telefone || '',
          email: fullReport.formData?.email || '',
          senha: fullReport.formData?.senha || '',
          lastReportId: fullReport.id,
          lastDate: fullReport.date,
          updatedAt: serverTimestamp(),
        });
        await setDoc(patientDocRef, patientPayload, { merge: true });

        this.setStatus('synced');
      } catch (e) {
        console.warn('Erro ao sincronizar prontuário no Firestore:', e);
        this.addSyncLog({
          action: 'Erro ao salvar prontuário',
          description: `${patientName} (${fullReport.patientCode})`,
          status: 'error',
          type: 'report',
        });
        handleFirestoreError(e, OperationType.WRITE, `reports/${fullReport.id}`);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 2. Excluir Prontuário / Ficha Clínica
  public async deleteReport(id: string): Promise<void> {
    const existing = this.reports.find((r) => r.id === id);
    const desc = existing ? `${existing.formData?.nome || 'Paciente'} (${existing.patientCode})` : `ID: ${id}`;

    // Optimistic local update
    this.reports = this.reports.filter((r) => r.id !== id);
    setLocalData(STORAGE_KEYS.REPORTS, this.reports);
    this.reportsListeners.forEach((fn) => fn(this.reports));

    this.addSyncLog({
      action: 'Prontuário excluído',
      description: desc,
      status: 'success',
      type: 'report',
    });

    // Cloud delete
    if (db) {
      this.setSyncing(true);
      try {
        const docRef = doc(db, COLLECTIONS.REPORTS, id);
        await deleteDoc(docRef);
        this.setStatus('synced');
      } catch (e) {
        console.warn('Erro ao excluir prontuário no Firestore:', e);
        handleFirestoreError(e, OperationType.DELETE, `reports/${id}`);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 3. Enviar Mensagem de Chat
  public async sendMessage(message: (Omit<ChatMessage, 'id'> & { id?: string }) | ChatMessage): Promise<void> {
    const msgId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullMsg: ChatMessage = {
      ...message,
      id: msgId,
      patientCode: message.patientCode.toUpperCase(),
      timestamp: message.timestamp || new Date().toISOString(),
    };

    const senderRole = message.sender === 'nutri' ? 'Nutricionista' : 'Paciente';
    const previewText = fullMsg.text ? (fullMsg.text.length > 25 ? fullMsg.text.slice(0, 25) + '...' : fullMsg.text) : 'Anexo de imagem';

    // Optimistic local update
    this.messages.push(fullMsg);
    setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
    this.messagesListeners.forEach((fn) => fn(this.messages));

    this.addSyncLog({
      action: 'Mensagem enviada no chat',
      description: `${senderRole} para ${fullMsg.patientCode}: "${previewText}"`,
      status: 'success',
      type: 'chat',
    });

    // Cloud write
    if (db) {
      this.setSyncing(true);
      try {
        const docRef = doc(db, COLLECTIONS.MESSAGES, fullMsg.id);
        const payload = sanitizeForFirestore({
          ...fullMsg,
          updatedAt: serverTimestamp(),
        });
        await setDoc(docRef, payload, { merge: true });
        this.setStatus('synced');
      } catch (e) {
        console.warn('Erro ao enviar mensagem no Firestore:', e);
        this.addSyncLog({
          action: 'Erro ao enviar mensagem',
          description: `${senderRole} para ${fullMsg.patientCode}`,
          status: 'error',
          type: 'chat',
        });
        handleFirestoreError(e, OperationType.WRITE, `messages/${fullMsg.id}`);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 4. Marcar Mensagens de um Paciente como Lidas
  public async markMessagesAsRead(patientCode: string): Promise<void> {
    const code = patientCode.trim().toUpperCase();
    let hasChanged = false;
    const unreadMsgsToUpdate: string[] = [];

    this.messages = this.messages.map((m) => {
      if (m.patientCode.toUpperCase() === code && !m.read && m.sender === 'patient') {
        hasChanged = true;
        unreadMsgsToUpdate.push(m.id);
        return { ...m, read: true };
      }
      return m;
    });

    if (hasChanged) {
      setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
      this.messagesListeners.forEach((fn) => fn(this.messages));

      if (db && unreadMsgsToUpdate.length > 0) {
        this.setSyncing(true);
        try {
          for (const msgId of unreadMsgsToUpdate) {
            const docRef = doc(db, COLLECTIONS.MESSAGES, msgId);
            await setDoc(docRef, { read: true, updatedAt: serverTimestamp() }, { merge: true });
          }
          this.setStatus('synced');
        } catch (e) {
          console.warn('Erro ao atualizar status de lido no Firestore:', e);
        } finally {
          this.setSyncing(false);
        }
      }
    }
  }

  // 5. Salvar / Atualizar Consulta na Agenda
  public async saveAppointment(appointment: (Omit<Appointment, 'id'> & { id?: string }) | Appointment): Promise<void> {
    const apptId = appointment.id || `appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullAppt: Appointment = {
      ...appointment,
      id: apptId,
    };

    const isUpdate = this.agenda.some((a) => a.id === fullAppt.id);

    // Optimistic local update
    const index = this.agenda.findIndex((a) => a.id === fullAppt.id);
    if (index >= 0) {
      this.agenda[index] = fullAppt;
    } else {
      this.agenda.push(fullAppt);
    }
    setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
    this.agendaListeners.forEach((fn) => fn(this.agenda));

    this.addSyncLog({
      action: isUpdate ? 'Agendamento atualizado' : 'Adicionado agendamento',
      description: `${fullAppt.title} (${fullAppt.date}${fullAppt.time ? ` às ${fullAppt.time}` : ''})`,
      status: 'success',
      type: 'appointment',
    });

    // Cloud write
    if (db) {
      this.setSyncing(true);
      try {
        const docRef = doc(db, COLLECTIONS.AGENDA, fullAppt.id);
        const payload = sanitizeForFirestore({
          ...fullAppt,
          updatedAt: serverTimestamp(),
        });
        await setDoc(docRef, payload, { merge: true });
        this.setStatus('synced');
      } catch (e) {
        console.warn('Erro ao salvar agendamento no Firestore:', e);
        this.addSyncLog({
          action: 'Erro ao salvar agendamento',
          description: `${fullAppt.title}`,
          status: 'error',
          type: 'appointment',
        });
        handleFirestoreError(e, OperationType.WRITE, `agenda/${fullAppt.id}`);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 6. Excluir Consulta da Agenda
  public async deleteAppointment(id: string): Promise<void> {
    const existing = this.agenda.find((a) => a.id === id);
    const desc = existing ? `${existing.title} (${existing.date})` : `Consulta ID: ${id.substring(0, 8)}`;

    // Optimistic local update
    this.agenda = this.agenda.filter((a) => a.id !== id);
    setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
    this.agendaListeners.forEach((fn) => fn(this.agenda));

    this.addSyncLog({
      action: 'Agendamento cancelado',
      description: desc,
      status: 'success',
      type: 'appointment',
    });

    // Cloud delete
    if (db) {
      this.setSyncing(true);
      try {
        const docRef = doc(db, COLLECTIONS.AGENDA, id);
        await deleteDoc(docRef);
        this.setStatus('synced');
      } catch (e) {
        console.warn('Erro ao excluir agendamento no Firestore:', e);
        handleFirestoreError(e, OperationType.DELETE, `agenda/${id}`);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 7. Salvar Receita Culinária Inteligente
  public async saveRecipe(recipe: RecipeItem): Promise<void> {
    const recipeId = (recipe as any).id || recipe.nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const itemWithId: RecipeItem = {
      ...recipe,
      id: recipeId,
    } as RecipeItem;

    const isUpdate = this.recipes.some(
      (r) => r.nome.trim().toLowerCase() === recipe.nome.trim().toLowerCase()
    );

    // Optimistic local update
    const existingIndex = this.recipes.findIndex(
      (r) => r.nome.trim().toLowerCase() === recipe.nome.trim().toLowerCase()
    );
    if (existingIndex >= 0) {
      this.recipes[existingIndex] = itemWithId;
    } else {
      this.recipes.unshift(itemWithId);
    }
    setLocalData(STORAGE_KEYS.RECIPES, this.recipes);
    this.recipesListeners.forEach((fn) => fn(this.recipes));

    this.addSyncLog({
      action: isUpdate ? 'Receita atualizada' : 'Adicionada receita',
      description: `${itemWithId.nome}`,
      status: 'success',
      type: 'recipe',
    });

    // Cloud write
    if (db) {
      this.setSyncing(true);
      try {
        const docRef = doc(db, COLLECTIONS.RECIPES, recipeId);
        const payload = sanitizeForFirestore({
          ...itemWithId,
          updatedAt: serverTimestamp(),
        });
        await setDoc(docRef, payload, { merge: true });
        this.setStatus('synced');
      } catch (e) {
        console.warn('Erro ao salvar receita no Firestore:', e);
        handleFirestoreError(e, OperationType.WRITE, `recipes/${recipeId}`);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 8. Excluir Receita Salva
  public async deleteRecipe(recipeName: string): Promise<void> {
    const recipeId = recipeName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Optimistic local update
    this.recipes = this.recipes.filter(
      (r) => r.nome.trim().toLowerCase() !== recipeName.trim().toLowerCase()
    );
    setLocalData(STORAGE_KEYS.RECIPES, this.recipes);
    this.recipesListeners.forEach((fn) => fn(this.recipes));

    this.addSyncLog({
      action: 'Receita removida',
      description: `${recipeName}`,
      status: 'success',
      type: 'recipe',
    });

    // Cloud delete
    if (db) {
      this.setSyncing(true);
      try {
        const docRef = doc(db, COLLECTIONS.RECIPES, recipeId);
        await deleteDoc(docRef);
        this.setStatus('synced');
      } catch (e) {
        console.warn('Erro ao excluir receita no Firestore:', e);
        handleFirestoreError(e, OperationType.DELETE, `recipes/${recipeId}`);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 9. Salvar Sessão da Calculadora Nutricional
  public async saveCalculatorState(data: any): Promise<void> {
    this.calculatorState = data;
    setLocalData(STORAGE_KEYS.CALCULATOR, data);
    this.calculatorListeners.forEach((fn) => fn(this.calculatorState));

    this.addSyncLog({
      action: 'Sessão da calculadora salva',
      description: 'Distribuição calórica e de macronutrientes',
      status: 'success',
      type: 'calculator',
    });

    // Cloud write
    if (db) {
      this.setSyncing(true);
      try {
        const docRef = doc(db, COLLECTIONS.CALCULATOR, 'latest');
        const payload = sanitizeForFirestore({
          ...data,
          updatedAt: serverTimestamp(),
          clientUpdatedAt: new Date().toISOString(),
        });
        await setDoc(docRef, payload, { merge: true });
        this.setStatus('synced');
      } catch (e) {
        console.warn('Erro ao salvar calculadora no Firestore:', e);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 10. Alternar Fixação de Prontuário no Topo em Tempo Real (Multi-dispositivo)
  public async togglePinnedPatientCode(code: string): Promise<string[]> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return [...this.pinnedCodes];

    const exists = this.pinnedCodes.includes(normalized);
    const updated = exists
      ? this.pinnedCodes.filter((c) => c !== normalized)
      : [...this.pinnedCodes, normalized];

    // Atualização otimista imediata na memória e no cache local
    this.pinnedCodes = updated;
    setLocalData(STORAGE_KEYS.PINNED_PATIENTS, updated);
    this.pinnedListeners.forEach((fn) => fn(this.pinnedCodes));

    this.addSyncLog({
      action: exists ? 'Prontuário desafixado' : 'Prontuário fixado no topo',
      description: `Código ${normalized} (Sincronizado na nuvem)`,
      status: 'success',
      type: 'system',
    });

    // Gravação na nuvem Firestore em tempo real
    if (db) {
      this.setSyncing(true);
      try {
        const pinnedDocRef = doc(db, COLLECTIONS.SETTINGS, 'pinned_patients');
        const payload = sanitizeForFirestore({
          id: 'pinned_patients',
          codes: updated,
          updatedAt: serverTimestamp(),
          clientUpdatedAt: new Date().toISOString(),
        });
        await setDoc(pinnedDocRef, payload, { merge: true });
        this.setStatus('synced');
      } catch (err) {
        console.warn('Falha ao sincronizar prontuários fixados no Firestore:', err);
        this.addSyncLog({
          action: 'Falha ao sincronizar fixação',
          description: `Código ${normalized}`,
          status: 'error',
          type: 'system',
        });
      } finally {
        this.setSyncing(false);
      }
    }

    return updated;
  }

  // 11. Salvar Lista Completa de Prontuários Fixados
  public async savePinnedPatientCodes(codes: string[]): Promise<void> {
    const normalizedList = Array.from(
      new Set(codes.map((c) => String(c).trim().toUpperCase()).filter(Boolean))
    );

    this.pinnedCodes = normalizedList;
    setLocalData(STORAGE_KEYS.PINNED_PATIENTS, normalizedList);
    this.pinnedListeners.forEach((fn) => fn(this.pinnedCodes));

    if (db) {
      this.setSyncing(true);
      try {
        const pinnedDocRef = doc(db, COLLECTIONS.SETTINGS, 'pinned_patients');
        const payload = sanitizeForFirestore({
          id: 'pinned_patients',
          codes: normalizedList,
          updatedAt: serverTimestamp(),
          clientUpdatedAt: new Date().toISOString(),
        });
        await setDoc(pinnedDocRef, payload, { merge: true });
        this.setStatus('synced');
      } catch (err) {
        console.warn('Falha ao gravar lista de prontuários fixados no Firestore:', err);
      } finally {
        this.setSyncing(false);
      }
    }
  }

  // 12. Salvar Registro Diário de Ingestão Hídrica (Cloud + Local)
  public async saveWaterIntake(record: WaterIntakeRecord): Promise<void> {
    const docId = `${record.patientCode.toUpperCase()}_${record.date}`;
    const itemWithId: WaterIntakeRecord = {
      ...record,
      id: docId,
      updatedAt: new Date().toISOString(),
    };

    this.waterIntake[docId] = itemWithId;
    setLocalData(STORAGE_KEYS.WATER_INTAKE, this.waterIntake);
    this.waterIntakeListeners.forEach((fn) => fn(this.waterIntake));

    if (db) {
      try {
        const docRef = doc(db, COLLECTIONS.WATER_INTAKE, docId);
        await setDoc(
          docRef,
          {
            ...itemWithId,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        this.addSyncLog({
          action: 'Ingestão hídrica atualizada',
          description: `${itemWithId.currentMl} ml de água registrados para ${itemWithId.patientCode}`,
          status: 'success',
          type: 'report',
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `water_intake/${docId}`);
      }
    }
  }

  // 13. Testar Conexão em Tempo Real com Firestore
  public async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = Date.now();
    this.setSyncing(true);
    try {
      if (!db) throw new Error('Serviço Firestore não inicializado');
      await setDoc(
        doc(db, 'system', 'ping'),
        {
          lastPing: serverTimestamp(),
          clientTimestamp: new Date().toISOString(),
        },
        { merge: true }
      );
      const latencyMs = Math.max(1, Date.now() - startTime);
      this.setStatus('synced');
      this.addSyncLog({
        action: 'Conexão testada com sucesso',
        description: `Resposta em ${latencyMs}ms com o servidor Firestore`,
        status: 'success',
        type: 'system',
      });
      return { success: true, latencyMs, message: `Conexão ativa (${latencyMs}ms)` };
    } catch (e: any) {
      this.setStatus('offline');
      this.addSyncLog({
        action: 'Falha no teste de conexão',
        description: e?.message || 'Servidor indisponível',
        status: 'error',
        type: 'system',
      });
      return { success: false, latencyMs: 0, message: e?.message || 'Falha ao conectar à nuvem' };
    } finally {
      this.setSyncing(false);
    }
  }

  // ==========================================
  // BACKUP & RESTORE CONSOLIDADO
  // ==========================================
  public exportConsolidatedBackup(): string {
    const data = {
      version: '1.20',
      exportedAt: new Date().toISOString(),
      reports: this.reports,
      allMessages: this.messages,
      appointments: this.agenda,
      recipes: this.recipes,
      calculatorState: this.calculatorState,
      pinnedPatients: getPinnedPatientCodes(),
    };
    return JSON.stringify(data, null, 2);
  }

  public async importConsolidatedBackup(
    jsonString: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const data = JSON.parse(jsonString);
      const hasReports = Array.isArray(data.reports);
      const hasMessages = Array.isArray(data.allMessages) || Array.isArray(data.chatMessages);
      const hasAgenda = Array.isArray(data.appointments) || Array.isArray(data.agenda);
      const hasRecipes = Array.isArray(data.recipes);
      const hasCalc = !!data.calculatorState;

      if (!data || (!hasReports && !hasMessages && !hasAgenda && !hasRecipes && !hasCalc)) {
        return {
          success: false,
          count: 0,
          error: 'Formato de arquivo inválido. Backup incompleto ou danificado.',
        };
      }

      let totalImported = 0;

      if (hasReports) {
        for (const r of data.reports) {
          await this.saveReport(r);
        }
        totalImported += data.reports.length;
      }

      const msgs = data.allMessages || data.chatMessages;
      if (Array.isArray(msgs)) {
        for (const m of msgs) {
          await this.sendMessage(m);
        }
        totalImported += msgs.length;
      }

      const appts = data.appointments || data.agenda;
      if (Array.isArray(appts)) {
        for (const a of appts) {
          await this.saveAppointment(a);
        }
        totalImported += appts.length;
      }

      if (hasRecipes) {
        for (const rec of data.recipes) {
          await this.saveRecipe(rec);
        }
        totalImported += data.recipes.length;
      }

      if (hasCalc) {
        await this.saveCalculatorState(data.calculatorState);
        totalImported += 1;
      }

      if (Array.isArray(data.pinnedPatients)) {
        await this.savePinnedPatientCodes(data.pinnedPatients);
      }

      return { success: true, count: totalImported };
    } catch (e: any) {
      return {
        success: false,
        count: 0,
        error: e.message || 'Erro ao processar o arquivo de backup.',
      };
    }
  }

  public async restoreBackup(data: any): Promise<void> {
    if (data.reports && Array.isArray(data.reports)) {
      for (const r of data.reports) {
        await this.saveReport(r);
      }
    }
    if (data.agenda && Array.isArray(data.agenda)) {
      for (const a of data.agenda) {
        await this.saveAppointment(a);
      }
    }
    if (data.pinnedPatients && Array.isArray(data.pinnedPatients)) {
      await this.savePinnedPatientCodes(data.pinnedPatients);
    }
  }

  // ==========================================
  // SEED INITIAL DATA (Disabled - Real data only)
  // ==========================================
  public async seedInitialData(): Promise<void> {
    // Only data added by the nutritionist is stored.
    return Promise.resolve();
  }

  public async injectMockData(): Promise<void> {
    return Promise.resolve();
  }
}

export const dataStore = new DataStore();

export function getWaterIntake(patientCode: string, date: string): WaterIntakeRecord | null {
  return dataStore.getWaterIntake(patientCode, date);
}

export async function saveWaterIntake(record: WaterIntakeRecord): Promise<void> {
  return dataStore.saveWaterIntake(record);
}
