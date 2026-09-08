import { ReportRecord, ChatMessage, Appointment, PatientFormData, RecipeItem } from '../types';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  Firestore,
} from 'firebase/firestore';

// Storage keys for local fallback / caching
const STORAGE_KEYS = {
  REPORTS: 'nutriclinical_reports_v1',
  MESSAGES: 'nutriclinical_messages_v1',
  AGENDA: 'nutriclinical_agenda_v1',
  RECIPES: 'nutriclinical_saved_recipes_v1',
  CALCULATOR: 'nutriclinical_calculator_v1',
};

declare global {
  interface Window {
    __firebase_config?: string;
    __app_id?: string;
    __initial_auth_token?: string;
  }
}

let firebaseDb: Firestore | null = null;
let appId = 'default-nutriclinical-id';

// Initialize Firebase if configuration exists
try {
  const configStr = typeof window !== 'undefined' ? window.__firebase_config : undefined;
  if (configStr) {
    const config = JSON.parse(configStr);
    if (Object.keys(config).length > 0) {
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      firebaseDb = getFirestore(app);
      const auth = getAuth(app);
      appId = window.__app_id || 'nutriclinical-prod';

      if (window.__initial_auth_token) {
        signInWithCustomToken(auth, window.__initial_auth_token).catch(() => signInAnonymously(auth));
      } else {
        signInAnonymously(auth).catch((err) => console.warn('Firebase Auth:', err));
      }
    }
  }
} catch (e) {
  console.warn('Firebase initialization skipped or in local mode:', e);
}

// Local Storage helpers
export function getLocalData<T>(key: string, fallback: T): T {
  try {
    let item = localStorage.getItem(key);
    // Backward compatibility with previous storage keys
    if (!item && key.startsWith('nutriclinical_')) {
      const legacyKey = key.replace('nutriclinical_', 'nutrismart_');
      item = localStorage.getItem(legacyKey);
    }
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('nutriclinical_storage_updated'));
    window.dispatchEvent(new Event('nutrismart_storage_updated'));
  } catch (e) {
    console.error('Local storage write error:', e);
  }
}

export function getPinnedPatientCodes(): string[] {
  return getLocalData<string[]>('nutriclinical_pinned_patients_v1', []);
}

export function togglePinnedPatientCode(code: string): string[] {
  const current = getPinnedPatientCodes();
  const upper = code.toUpperCase();
  const updated = current.includes(upper) ? current.filter((c) => c !== upper) : [upper, ...current];
  setLocalData('nutriclinical_pinned_patients_v1', updated);
  return updated;
}

export interface PatientRecipeQuota {
  recipesGeneratedToday: number;
  lastGenerationDate: string;
}

export function getPatientRecipeQuota(patientCode?: string): PatientRecipeQuota {
  const todayStr = new Date().toISOString().split('T')[0];
  if (!patientCode) {
    return { recipesGeneratedToday: 0, lastGenerationDate: todayStr };
  }
  const key = `nutriclinical_quota_${patientCode.toUpperCase()}`;
  const stored = getLocalData<PatientRecipeQuota | null>(key, null);
  if (!stored || stored.lastGenerationDate !== todayStr) {
    const fresh: PatientRecipeQuota = {
      recipesGeneratedToday: 0,
      lastGenerationDate: todayStr,
    };
    setLocalData(key, fresh);
    return fresh;
  }
  return stored;
}

export function incrementPatientRecipeQuota(patientCode?: string, count: number = 1): PatientRecipeQuota {
  const todayStr = new Date().toISOString().split('T')[0];
  if (!patientCode) {
    return { recipesGeneratedToday: 0, lastGenerationDate: todayStr };
  }
  const key = `nutriclinical_quota_${patientCode.toUpperCase()}`;
  const current = getPatientRecipeQuota(patientCode);
  const updated: PatientRecipeQuota = {
    recipesGeneratedToday: Math.min(4, (current.recipesGeneratedToday || 0) + count),
    lastGenerationDate: todayStr,
  };
  setLocalData(key, updated);
  return updated;
}

// Multi-storage synchronization interface
export class DataStore {
  private reportsListeners: Array<(reports: ReportRecord[]) => void> = [];
  private messagesListeners: Array<(messages: ChatMessage[]) => void> = [];
  private agendaListeners: Array<(agenda: Appointment[]) => void> = [];
  private recipesListeners: Array<(recipes: RecipeItem[]) => void> = [];
  private calculatorListeners: Array<(data: any) => void> = [];
  private statusListeners: Array<(status: 'synced' | 'connecting' | 'offline') => void> = [];

  private status: 'synced' | 'connecting' | 'offline' = 'connecting';
  private reports: ReportRecord[] = [];
  private messages: ChatMessage[] = [];
  private agenda: Appointment[] = [];
  private recipes: RecipeItem[] = [];
  private calculatorState: any = null;
  private syncChannel: BroadcastChannel | null = null;

  constructor() {
    this.reports = getLocalData<ReportRecord[]>(STORAGE_KEYS.REPORTS, []);
    this.messages = getLocalData<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []);
    this.agenda = getLocalData<Appointment[]>(STORAGE_KEYS.AGENDA, []);
    this.recipes = getLocalData<RecipeItem[]>(STORAGE_KEYS.RECIPES, []);
    this.calculatorState = getLocalData<any>(STORAGE_KEYS.CALCULATOR, null);

    // Instant Cross-Tab & Cross-Window Local Synchronization
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.syncChannel = new BroadcastChannel('nutriclinical_sync_channel');
        this.syncChannel.onmessage = () => {
          this.syncFromLocal();
        };
      }
    } catch {
      // Ignore if not supported in environment
    }

    // Ensure initial mock messages are marked as read so no false badge appears
    let cleaned = false;
    this.messages = this.messages.map((m) => {
      if (m.id === 'msg_init_2' && m.read !== true) {
        cleaned = true;
        return { ...m, read: true };
      }
      return m;
    });
    if (cleaned) {
      setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
    }

    // Ensure all existing reports have a registered password so credentials block is always populated
    let reportsCleaned = false;
    this.reports = this.reports.map((r) => {
      if (!r.formData.senha) {
        reportsCleaned = true;
        const fallbackPass = r.patientCode.toUpperCase() === 'ANA1' ? 'ana123' : `Nutri${r.patientCode || '123'}$`;
        return {
          ...r,
          formData: {
            ...r.formData,
            senha: fallbackPass,
          },
        };
      }
      return r;
    });
    if (reportsCleaned) {
      setLocalData(STORAGE_KEYS.REPORTS, this.reports);
    }

    if (firebaseDb) {
      this.initFirestoreSync();
    } else {
      this.status = 'synced';
      this.notifyStatus();
    }

    // Cross-tab sync
    window.addEventListener('storage', () => this.syncFromLocal());
    window.addEventListener('nutriclinical_storage_updated', () => this.syncFromLocal());
    window.addEventListener('nutrismart_storage_updated', () => this.syncFromLocal());
  }

  private notifyStatus() {
    this.statusListeners.forEach((fn) => fn(this.status));
  }

  private broadcastLocalUpdate() {
    try {
      this.syncChannel?.postMessage({ type: 'sync', timestamp: Date.now() });
    } catch {
      // Ignore broadcast errors
    }
  }

  private syncFromLocal() {
    this.reports = getLocalData<ReportRecord[]>(STORAGE_KEYS.REPORTS, []);
    this.messages = getLocalData<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []);
    this.agenda = getLocalData<Appointment[]>(STORAGE_KEYS.AGENDA, []);
    this.recipes = getLocalData<RecipeItem[]>(STORAGE_KEYS.RECIPES, []);
    this.calculatorState = getLocalData<any>(STORAGE_KEYS.CALCULATOR, null);
    this.notifyAll();
  }

  private notifyAll() {
    this.reportsListeners.forEach((fn) => fn(this.reports));
    this.messagesListeners.forEach((fn) => fn(this.messages));
    this.agendaListeners.forEach((fn) => fn(this.agenda));
    this.recipesListeners.forEach((fn) => fn(this.recipes));
    this.calculatorListeners.forEach((fn) => fn(this.calculatorState));
  }

  private initFirestoreSync() {
    if (!firebaseDb) return;
    try {
      this.status = 'connecting';
      this.notifyStatus();

      const reportsRef = collection(firebaseDb, 'artifacts', appId, 'public', 'data', 'reports');
      onSnapshot(
        reportsRef,
        (snapshot) => {
          const remoteReports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ReportRecord));
          remoteReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          this.reports = remoteReports;
          setLocalData(STORAGE_KEYS.REPORTS, this.reports);
          this.reportsListeners.forEach((fn) => fn(this.reports));
          this.status = 'synced';
          this.notifyStatus();
        },
        (err) => {
          console.warn('Firestore reports snapshot failed, using local storage:', err);
          this.status = 'offline';
          this.notifyStatus();
        }
      );

      const msgsRef = collection(firebaseDb, 'artifacts', appId, 'public', 'data', 'messages');
      onSnapshot(
        msgsRef,
        (snapshot) => {
          const remoteMsgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ChatMessage));
          this.messages = remoteMsgs;
          setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
          this.messagesListeners.forEach((fn) => fn(this.messages));
        },
        () => {}
      );

      const agendaRef = collection(firebaseDb, 'artifacts', appId, 'public', 'data', 'agenda');
      onSnapshot(
        agendaRef,
        (snapshot) => {
          const remoteAgenda = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Appointment));
          this.agenda = remoteAgenda;
          setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
          this.agendaListeners.forEach((fn) => fn(this.agenda));
        },
        () => {}
      );

      const recipesRef = collection(firebaseDb, 'artifacts', appId, 'public', 'data', 'recipes');
      onSnapshot(
        recipesRef,
        (snapshot) => {
          const remoteRecipes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as unknown as RecipeItem));
          this.recipes = remoteRecipes;
          setLocalData(STORAGE_KEYS.RECIPES, this.recipes);
          this.recipesListeners.forEach((fn) => fn(this.recipes));
        },
        () => {}
      );

      const calculatorRef = collection(firebaseDb, 'artifacts', appId, 'public', 'data', 'calculator');
      onSnapshot(
        calculatorRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            this.calculatorState = data;
            setLocalData(STORAGE_KEYS.CALCULATOR, this.calculatorState);
            this.calculatorListeners.forEach((fn) => fn(this.calculatorState));
          }
        },
        () => {}
      );
    } catch (e) {
      console.warn('Firestore subscription error:', e);
      this.status = 'offline';
      this.notifyStatus();
    }
  }

  public onReports(callback: (reports: ReportRecord[]) => void) {
    this.reportsListeners.push(callback);
    callback(this.reports);
    return () => {
      this.reportsListeners = this.reportsListeners.filter((fn) => fn !== callback);
    };
  }

  public onMessages(callback: (messages: ChatMessage[]) => void) {
    this.messagesListeners.push(callback);
    callback(this.messages);
    return () => {
      this.messagesListeners = this.messagesListeners.filter((fn) => fn !== callback);
    };
  }

  public onAgenda(callback: (agenda: Appointment[]) => void) {
    this.agendaListeners.push(callback);
    callback(this.agenda);
    return () => {
      this.agendaListeners = this.agendaListeners.filter((fn) => fn !== callback);
    };
  }

  public onRecipes(callback: (recipes: RecipeItem[]) => void) {
    this.recipesListeners.push(callback);
    callback(this.recipes);
    return () => {
      this.recipesListeners = this.recipesListeners.filter((fn) => fn !== callback);
    };
  }

  public onCalculator(callback: (data: any) => void) {
    this.calculatorListeners.push(callback);
    callback(this.calculatorState);
    return () => {
      this.calculatorListeners = this.calculatorListeners.filter((fn) => fn !== callback);
    };
  }

  public onStatus(callback: (status: 'synced' | 'connecting' | 'offline') => void) {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((fn) => fn !== callback);
    };
  }

  // Aliases for clean reactive bindings
  public subscribeReports(callback: (reports: ReportRecord[]) => void) {
    return this.onReports(callback);
  }

  public subscribeAgenda(callback: (agenda: Appointment[]) => void) {
    return this.onAgenda(callback);
  }

  public subscribeChat(callback: (messages: ChatMessage[]) => void) {
    return this.onMessages(callback);
  }

  public subscribeRecipes(callback: (recipes: RecipeItem[]) => void) {
    return this.onRecipes(callback);
  }

  public subscribeCalculator(callback: (data: any) => void) {
    return this.onCalculator(callback);
  }

  public getReports(): ReportRecord[] {
    return [...this.reports];
  }

  public getAgenda(): Appointment[] {
    return [...this.agenda];
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public getRecipes(): RecipeItem[] {
    return [...this.recipes];
  }

  public getCalculatorState(): any {
    return this.calculatorState;
  }

  public async seedInitialData(): Promise<void> {
    return this.injectMockData();
  }

  public async restoreBackup(data: {
    reports?: ReportRecord[];
    agenda?: Appointment[];
    appointments?: Appointment[];
    chatMessages?: ChatMessage[];
    allMessages?: ChatMessage[];
    recipes?: RecipeItem[];
    calculatorState?: any;
    pinnedPatients?: string[];
  }): Promise<void> {
    if (data.reports) {
      for (const r of data.reports) {
        await this.saveReport(r);
      }
    }
    const appts = data.agenda || data.appointments;
    if (appts) {
      for (const a of appts) {
        await this.saveAppointment(a);
      }
    }
    const msgs = data.chatMessages || data.allMessages;
    if (msgs) {
      for (const m of msgs) {
        await this.sendMessage(m);
      }
    }
    if (data.recipes && Array.isArray(data.recipes)) {
      for (const rec of data.recipes) {
        await this.saveRecipe(rec);
      }
    }
    if (data.calculatorState) {
      await this.saveCalculatorState(data.calculatorState);
    }
    if (data.pinnedPatients && Array.isArray(data.pinnedPatients)) {
      setLocalData('nutriclinical_pinned_patients_v1', data.pinnedPatients);
    }
  }

  // Save or update a clinical report
  public async saveReport(report: ReportRecord): Promise<void> {
    const existingIndex = this.reports.findIndex((r) => r.id === report.id);
    if (existingIndex >= 0) {
      this.reports[existingIndex] = report;
    } else {
      this.reports.unshift(report);
    }
    setLocalData(STORAGE_KEYS.REPORTS, this.reports);
    this.reportsListeners.forEach((fn) => fn(this.reports));
    this.broadcastLocalUpdate();

    if (firebaseDb) {
      try {
        const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'reports', report.id);
        await setDoc(docRef, report, { merge: true });
      } catch (e) {
        console.warn('Firestore report save error:', e);
      }
    }
  }

  // Delete a report
  public async deleteReport(id: string): Promise<void> {
    this.reports = this.reports.filter((r) => r.id !== id);
    setLocalData(STORAGE_KEYS.REPORTS, this.reports);
    this.reportsListeners.forEach((fn) => fn(this.reports));
    this.broadcastLocalUpdate();

    if (firebaseDb) {
      try {
        await deleteDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'reports', id));
      } catch (e) {
        console.warn('Firestore report delete error:', e);
      }
    }
  }

  // Send a chat message
  public async sendMessage(msg: Omit<ChatMessage, 'id'>): Promise<void> {
    const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newMsg: ChatMessage = {
      id,
      ...msg,
      read: msg.read ?? (msg.sender === 'nutri' ? true : false),
    };
    this.messages.push(newMsg);
    setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
    this.messagesListeners.forEach((fn) => fn(this.messages));
    this.broadcastLocalUpdate();

    if (firebaseDb) {
      try {
        const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'messages', id);
        await setDoc(docRef, newMsg);
      } catch (e) {
        console.warn('Firestore message save error:', e);
      }
    }
  }

  // Mark all messages from a patient as read
  public async markMessagesAsRead(patientCode: string): Promise<void> {
    let changed = false;
    this.messages = this.messages.map((m) => {
      if (m.patientCode.toUpperCase() === patientCode.toUpperCase() && m.sender === 'patient' && !m.read) {
        changed = true;
        return { ...m, read: true };
      }
      return m;
    });

    if (changed) {
      setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
      this.messagesListeners.forEach((fn) => fn(this.messages));
      this.broadcastLocalUpdate();

      if (firebaseDb) {
        try {
          const patientMsgs = this.messages.filter(
            (m) => m.patientCode.toUpperCase() === patientCode.toUpperCase() && m.sender === 'patient'
          );
          for (const m of patientMsgs) {
            const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'messages', m.id);
            await setDoc(docRef, m, { merge: true });
          }
        } catch (e) {
          console.warn('Firestore mark as read error:', e);
        }
      }
    }
  }

  // Save or update appointment
  public async saveAppointment(appointment: Omit<Appointment, 'id'> & { id?: string }): Promise<void> {
    const id = appointment.id || 'appnt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const item: Appointment = {
      ...appointment,
      id,
      timestamp: appointment.timestamp || new Date().toISOString(),
    };

    const existingIndex = this.agenda.findIndex((a) => a.id === id);
    if (existingIndex >= 0) {
      this.agenda[existingIndex] = item;
    } else {
      this.agenda.push(item);
    }
    setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
    this.agendaListeners.forEach((fn) => fn(this.agenda));
    this.broadcastLocalUpdate();

    if (firebaseDb) {
      try {
        const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'agenda', id);
        await setDoc(docRef, item, { merge: true });
      } catch (e) {
        console.warn('Firestore agenda save error:', e);
      }
    }
  }

  // Delete appointment
  public async deleteAppointment(id: string): Promise<void> {
    this.agenda = this.agenda.filter((a) => a.id !== id);
    setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
    this.agendaListeners.forEach((fn) => fn(this.agenda));
    this.broadcastLocalUpdate();

    if (firebaseDb) {
      try {
        await deleteDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'agenda', id));
      } catch (e) {
        console.warn('Firestore agenda delete error:', e);
      }
    }
  }

  // Save or toggle recipe
  public async saveRecipe(recipe: RecipeItem): Promise<void> {
    const recipeId = (recipe as any).id || recipe.nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const itemWithId = { ...recipe, id: recipeId };
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
    this.broadcastLocalUpdate();

    if (firebaseDb) {
      try {
        const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'recipes', recipeId);
        await setDoc(docRef, itemWithId, { merge: true });
      } catch (e) {
        console.warn('Firestore recipe save error:', e);
      }
    }
  }

  // Delete saved recipe
  public async deleteRecipe(recipeName: string): Promise<void> {
    const recipeId = recipeName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.recipes = this.recipes.filter(
      (r) => r.nome.trim().toLowerCase() !== recipeName.trim().toLowerCase()
    );
    setLocalData(STORAGE_KEYS.RECIPES, this.recipes);
    this.recipesListeners.forEach((fn) => fn(this.recipes));
    this.broadcastLocalUpdate();

    if (firebaseDb) {
      try {
        await deleteDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'recipes', recipeId));
      } catch (e) {
        console.warn('Firestore recipe delete error:', e);
      }
    }
  }

  // Save calculator session state
  public async saveCalculatorState(data: any): Promise<void> {
    this.calculatorState = data;
    setLocalData(STORAGE_KEYS.CALCULATOR, data);
    this.calculatorListeners.forEach((fn) => fn(this.calculatorState));
    this.broadcastLocalUpdate();

    if (firebaseDb) {
      try {
        const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'calculator', 'latest');
        await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('Firestore calculator save error:', e);
      }
    }
  }

  // Export consolidated JSON backup with all system entities
  public exportConsolidatedBackup(): string {
    const data = {
      version: '1.10',
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

  // Import complete backup with full schema validation
  public async importConsolidatedBackup(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const data = JSON.parse(jsonString);
      const hasReports = Array.isArray(data.reports);
      const hasMessages = Array.isArray(data.allMessages) || Array.isArray(data.chatMessages);
      const hasAgenda = Array.isArray(data.appointments) || Array.isArray(data.agenda);
      const hasRecipes = Array.isArray(data.recipes);
      const hasCalc = !!data.calculatorState;

      if (!data || (!hasReports && !hasMessages && !hasAgenda && !hasRecipes && !hasCalc)) {
        return { success: false, count: 0, error: 'Formato de arquivo inválido. Backup incompleto ou danificado.' };
      }

      let totalImported = 0;

      if (hasReports) {
        this.reports = data.reports;
        setLocalData(STORAGE_KEYS.REPORTS, this.reports);
        totalImported += this.reports.length;
        if (firebaseDb) {
          for (const r of data.reports) {
            await setDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'reports', r.id), r);
          }
        }
      }

      const msgs = data.allMessages || data.chatMessages;
      if (Array.isArray(msgs)) {
        this.messages = msgs;
        setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
        totalImported += this.messages.length;
        if (firebaseDb) {
          for (const m of msgs) {
            await setDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'messages', m.id), m);
          }
        }
      }

      const appts = data.appointments || data.agenda;
      if (Array.isArray(appts)) {
        this.agenda = appts;
        setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
        totalImported += this.agenda.length;
        if (firebaseDb) {
          for (const a of appts) {
            await setDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'agenda', a.id), a);
          }
        }
      }

      if (hasRecipes) {
        this.recipes = data.recipes;
        setLocalData(STORAGE_KEYS.RECIPES, this.recipes);
        totalImported += this.recipes.length;
        if (firebaseDb) {
          for (const rec of data.recipes) {
            const recipeId = rec.id || rec.nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
            await setDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'recipes', recipeId), { ...rec, id: recipeId });
          }
        }
      }

      if (hasCalc) {
        this.calculatorState = data.calculatorState;
        setLocalData(STORAGE_KEYS.CALCULATOR, this.calculatorState);
        totalImported += 1;
        if (firebaseDb) {
          await setDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'calculator', 'latest'), {
            ...this.calculatorState,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      if (Array.isArray(data.pinnedPatients)) {
        setLocalData('nutriclinical_pinned_patients_v1', data.pinnedPatients);
      }

      this.notifyAll();
      return { success: true, count: totalImported };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'Erro ao processar o arquivo de backup.' };
    }
  }

  // Inject Rich Mock Data for Immediate Testing
  public async injectMockData(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const prevDate1 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const prevDate2 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const currDate = new Date().toISOString();

    const mockReports: ReportRecord[] = [
      {
        id: 'mock_ana_silva_1',
        date: prevDate1,
        patientCode: 'ANA1',
        formData: {
          nome: 'Ana Silva',
          idade: '32',
          telefone: '(11) 98765-4321',
          email: 'ana.silva@email.com',
          peso: '86.5',
          altura: '165',
          braco: '34',
          peito: '102',
          cintura: '88',
          abdomen: '96',
          quadril: '112',
          coxa: '64',
          panturrilha: '39',
          objetivo: 'Emagrecimento',
          restricoes: 'Intolerância moderada à lactose',
          sintomas: 'Queda de cabelo intensa, cansaço extremo pela manhã e unhas quebradiças.',
          agua: '1.5',
          exercicio: 'Sedentário (Nenhum ou muito pouco)',
          observacoes: 'Dificuldade para jantar cedo.',
          instrucoesIA: 'Focar em fontes vegetais de cálcio e densidade de nutrientes.',
          patientCode: 'ANA1',
          senha: 'ana123',
          tipoDieta: 'Projeto Verão',
          calorias: '1500',
        },
        aiMealPlan: `🎯 Dieta baseada em: Projeto Verão | Meta Calórica: 1500 kcal

🌅 Café da Manhã:
• 2 ovos mexidos com azeite de oliva e orégano
• 1 fatia de pão 100% integral ou 2 torradas integrais
• 1 xícara de café preto ou chá verde sem açúcar

🍽️ Almoço:
• 140g de filé de peito de frango grelhado em cubos
• 100g de batata doce cozida ou arroz integral
• Salada à vontade: folhas verdes escuras, pepino, tomate cereja e cenoura ralada
• 1 colher de sobremesa de azeite extravirgem

🍎 Lanche da Tarde:
• 1 porção de fruta fresca (maçã com canela ou 150g de morangos)
• 20g de mix de castanhas (do Pará e de caju)

🌙 Jantar:
• 1 prato fundo de sopa de legumes com carne magra desfiada (sem batata inglesa)
• Omelete de 2 claras e 1 gema com espinafre e tomate picado`,
        aiData: {
          mealPlan: `🎯 Dieta baseada em: Projeto Verão | Meta Calórica: 1500 kcal

🌅 Café da Manhã:
• 2 ovos mexidos com azeite de oliva e orégano
• 1 fatia de pão 100% integral ou 2 torradas integrais
• 1 xícara de café preto ou chá verde sem açúcar

🍽️ Almoço:
• 140g de filé de peito de frango grelhado em cubos
• 100g de batata doce cozida ou arroz integral
• Salada à vontade: folhas verdes escuras, pepino, tomate cereja e cenoura ralada
• 1 colher de sobremesa de azeite extravirgem

🍎 Lanche da Tarde:
• 1 porção de fruta fresca (maçã com canela ou 150g de morangos)
• 20g de mix de castanhas (do Pará e de caju)

🌙 Jantar:
• 1 prato fundo de sopa de legumes com carne magra desfiada (sem batata inglesa)
• Omelete de 2 claras e 1 gema com espinafre e tomate picado`,
          training: 'Caminhada moderada de 30 a 40 minutos 3x na semana + musculação leve adaptativa.',
          supplements: '• Ómega 3 (1000mg no almoço)\n• Vitamina D3 (2000 UI com refeição gordurosa)\n• Complexo B com Biotina',
          deficiencias: 'A queixa de queda de cabelo intensa associada a fadiga matinal sugere possível carência de Ferro (Ferritina sérica baixa), Vitamina D e Zinco. Recomenda-se solicitação de hemograma completo, ferritina, zinco e 25-OH VitD no próximo retorno.',
        },
      },
      {
        id: 'mock_ana_silva_2',
        date: currDate,
        patientCode: 'ANA1',
        formData: {
          nome: 'Ana Silva',
          idade: '32',
          telefone: '(11) 98765-4321',
          email: 'ana.silva@email.com',
          peso: '77.8',
          altura: '165',
          braco: '30.5',
          peito: '96',
          cintura: '79',
          abdomen: '84',
          quadril: '104',
          coxa: '58.5',
          panturrilha: '37',
          objetivo: 'Emagrecimento',
          restricoes: 'Intolerância moderada à lactose',
          sintomas: 'Queda de cabelo estabilizou; boa disposição para treinar.',
          agua: '2.5',
          exercicio: 'Moderado (3 a 4 vezes por semana)',
          observacoes: 'Excelente aderência!',
          instrucoesIA: 'Aumentar aporte proteico pós-treino.',
          patientCode: 'ANA1',
          senha: 'ana123',
          tipoDieta: 'Restrição de Carboidratos (Low Carb)',
          calorias: '1400',
        },
        aiMealPlan: `🎯 Dieta baseada em: Restrição de Carboidratos (Low Carb) | Meta Calórica: 1400 kcal

🌅 Café da Manhã:
• 2 ovos pochê com avocado fatiado (50g)
• 1 xícara de café expresso com canela

🍽️ Almoço:
• 160g de salmão grelhado ou sobrecoxa desossada
• Mix generoso de brócolis ao vapor, couve-flor e abobrinha grelhada
• Salada de rúcula com azeite extravirgem e sementes de abóbora

🍎 Lanche da Tarde:
• 1 dose de proteína vegetal ou isolada sem lactose batida com leite vegetal
• 1 punhado pequeno de morangos ou mirtilos

🌙 Jantar:
• 150g de carne moída de patinho com abobrinha em cubos
• Salada de folhas verdes com palmito pupunha`,
        aiData: {
          mealPlan: `🎯 Dieta baseada em: Restrição de Carboidratos (Low Carb) | Meta Calórica: 1400 kcal

🌅 Café da Manhã:
• 2 ovos pochê com avocado fatiado (50g)
• 1 xícara de café expresso com canela

🍽️ Almoço:
• 160g de salmão grelhado ou sobrecoxa desossada
• Mix generoso de brócolis ao vapor, couve-flor e abobrinha grelhada
• Salada de rúcula com azeite extravirgem e sementes de abóbora

🍎 Lanche da Tarde:
• 1 dose de proteína vegetal ou isolada sem lactose batida com leite vegetal
• 1 punhado pequeno de morangos ou mirtilos

🌙 Jantar:
• 150g de carne moída de patinho com abobrinha em cubos
• Salada de folhas verdes com palmito pupunha`,
          training: 'Treino de força (musculação) 4x na semana com foco em membros inferiores + 20min de cardio.',
          supplements: '• Creatina Monoidratada (3g diárias)\n• Magnésio Dimalato (300mg à noite)\n• Whey Protein Isolado sem lactose',
          deficiencias: 'Evolução clínica notável. Queda capilar controlada. Manter acompanhamento de hemograma semestral.',
        },
      },
    ];

    const mockMessages: ChatMessage[] = [
      {
        id: 'msg_init_1',
        patientCode: 'ANA1',
        sender: 'nutri',
        text: 'Olá Ana! Bem-vinda ao seu acompanhamento no NutriClinical. Qualquer dúvida com as receitas ou substituições, pode me enviar aqui!',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
      },
      {
        id: 'msg_init_2',
        patientCode: 'ANA1',
        sender: 'patient',
        text: 'Oi Dra. Maria Eduarda! Estou amando a panqueca de aveia da Cozinha Inteligente. Consegui treinar 4x essa semana!',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        read: true,
      },
    ];

    const mockAppointments: Appointment[] = [
      {
        id: 'appnt_1',
        title: 'Consulta Qualisan - Ana Silva',
        date: today,
        time: '14:30',
        notes: 'Avaliação de bioimpedância e reajuste calórico.',
        type: 'Consulta Qualisan',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'appnt_2',
        title: 'Visita Particular - Dr. Ricardo',
        date: today,
        time: '17:00',
        notes: 'Alinhamento de dieta para prova de corrida 10km.',
        type: 'Visita Particular',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'appnt_3',
        title: 'Revisão de Casos Clínicos',
        date: today,
        time: '19:00',
        notes: 'Estudo de artigos sobre modulação intestinal.',
        type: 'Lazer / Pessoal',
        timestamp: new Date().toISOString(),
      },
    ];

    for (const r of mockReports) await this.saveReport(r);
    for (const m of mockMessages) await this.sendMessage(m);
    for (const a of mockAppointments) await this.saveAppointment(a);
  }
}

export const dataStore = new DataStore();
