import { ReportRecord, ChatMessage, Appointment, PatientFormData } from '../types';
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
  REPORTS: 'nutrismart_reports_v1',
  MESSAGES: 'nutrismart_messages_v1',
  AGENDA: 'nutrismart_agenda_v1',
};

declare global {
  interface Window {
    __firebase_config?: string;
    __app_id?: string;
    __initial_auth_token?: string;
  }
}

let firebaseDb: Firestore | null = null;
let appId = 'default-nutrismart-id';

// Initialize Firebase if configuration exists
try {
  const configStr = typeof window !== 'undefined' ? window.__firebase_config : undefined;
  if (configStr) {
    const config = JSON.parse(configStr);
    if (Object.keys(config).length > 0) {
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      firebaseDb = getFirestore(app);
      const auth = getAuth(app);
      appId = window.__app_id || 'nutrismart-prod';

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
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('nutrismart_storage_updated'));
  } catch (e) {
    console.error('Local storage write error:', e);
  }
}

// Multi-storage synchronization interface
export class DataStore {
  private reportsListeners: Array<(reports: ReportRecord[]) => void> = [];
  private messagesListeners: Array<(messages: ChatMessage[]) => void> = [];
  private agendaListeners: Array<(agenda: Appointment[]) => void> = [];
  private statusListeners: Array<(status: 'synced' | 'connecting' | 'offline') => void> = [];

  private status: 'synced' | 'connecting' | 'offline' = 'connecting';
  private reports: ReportRecord[] = [];
  private messages: ChatMessage[] = [];
  private agenda: Appointment[] = [];

  constructor() {
    this.reports = getLocalData<ReportRecord[]>(STORAGE_KEYS.REPORTS, []);
    this.messages = getLocalData<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []);
    this.agenda = getLocalData<Appointment[]>(STORAGE_KEYS.AGENDA, []);

    if (firebaseDb) {
      this.initFirestoreSync();
    } else {
      this.status = 'synced';
      this.notifyStatus();
    }

    // Cross-tab sync
    window.addEventListener('storage', () => this.syncFromLocal());
    window.addEventListener('nutrismart_storage_updated', () => this.syncFromLocal());
  }

  private notifyStatus() {
    this.statusListeners.forEach((fn) => fn(this.status));
  }

  private syncFromLocal() {
    this.reports = getLocalData<ReportRecord[]>(STORAGE_KEYS.REPORTS, []);
    this.messages = getLocalData<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []);
    this.agenda = getLocalData<Appointment[]>(STORAGE_KEYS.AGENDA, []);
    this.notifyAll();
  }

  private notifyAll() {
    this.reportsListeners.forEach((fn) => fn(this.reports));
    this.messagesListeners.forEach((fn) => fn(this.messages));
    this.agendaListeners.forEach((fn) => fn(this.agenda));
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

  public getReports(): ReportRecord[] {
    return [...this.reports];
  }

  public getAgenda(): Appointment[] {
    return [...this.agenda];
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public async seedInitialData(): Promise<void> {
    return this.injectMockData();
  }

  public async restoreBackup(data: {
    reports?: ReportRecord[];
    agenda?: Appointment[];
    chatMessages?: ChatMessage[];
  }): Promise<void> {
    if (data.reports) {
      for (const r of data.reports) {
        await this.saveReport(r);
      }
    }
    if (data.agenda) {
      for (const a of data.agenda) {
        await this.saveAppointment(a);
      }
    }
    if (data.chatMessages) {
      for (const m of data.chatMessages) {
        await this.sendMessage(m);
      }
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
    const newMsg: ChatMessage = { id, ...msg };
    this.messages.push(newMsg);
    setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
    this.messagesListeners.forEach((fn) => fn(this.messages));

    if (firebaseDb) {
      try {
        const docRef = doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'messages', id);
        await setDoc(docRef, newMsg);
      } catch (e) {
        console.warn('Firestore message save error:', e);
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

    if (firebaseDb) {
      try {
        await deleteDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'agenda', id));
      } catch (e) {
        console.warn('Firestore agenda delete error:', e);
      }
    }
  }

  // Export 3-in-1 consolidated JSON backup
  public exportConsolidatedBackup(): string {
    const data = {
      version: '1.00',
      exportedAt: new Date().toISOString(),
      reports: this.reports,
      allMessages: this.messages,
      appointments: this.agenda,
    };
    return JSON.stringify(data, null, 2);
  }

  // Import 3-in-1 backup with validation
  public async importConsolidatedBackup(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const data = JSON.parse(jsonString);
      if (!data || (!data.reports && !data.allMessages && !data.appointments)) {
        return { success: false, count: 0, error: 'Formato de arquivo inválido. Backup incompleto ou danificado.' };
      }

      let totalImported = 0;

      if (Array.isArray(data.reports)) {
        this.reports = data.reports;
        setLocalData(STORAGE_KEYS.REPORTS, this.reports);
        totalImported += this.reports.length;
        if (firebaseDb) {
          for (const r of data.reports) {
            await setDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'reports', r.id), r);
          }
        }
      }

      if (Array.isArray(data.allMessages)) {
        this.messages = data.allMessages;
        setLocalData(STORAGE_KEYS.MESSAGES, this.messages);
        totalImported += this.messages.length;
        if (firebaseDb) {
          for (const m of data.allMessages) {
            await setDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'messages', m.id), m);
          }
        }
      }

      if (Array.isArray(data.appointments)) {
        this.agenda = data.appointments;
        setLocalData(STORAGE_KEYS.AGENDA, this.agenda);
        totalImported += this.agenda.length;
        if (firebaseDb) {
          for (const a of data.appointments) {
            await setDoc(doc(firebaseDb, 'artifacts', appId, 'public', 'data', 'agenda', a.id), a);
          }
        }
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
        text: 'Olá Ana! Bem-vinda ao seu acompanhamento no NutriSmart. Qualquer dúvida com as receitas ou substituições, pode me enviar aqui!',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg_init_2',
        patientCode: 'ANA1',
        sender: 'patient',
        text: 'Oi Dra. Maria Eduarda! Estou amando a panqueca de aveia da Cozinha Inteligente. Consegui treinar 4x essa semana!',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
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
