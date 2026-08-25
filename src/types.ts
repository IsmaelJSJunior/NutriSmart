export interface PatientFormData {
  nome: string;
  idade: string;
  telefone: string;
  email: string;
  peso: string;
  altura: string;
  braco: string;
  peito: string;
  cintura: string;
  abdomen: string;
  quadril: string;
  coxa: string;
  panturrilha: string;
  objetivo: string;
  restricoes: string;
  sintomas: string;
  agua: string;
  exercicio: string;
  observacoes: string;
  instrucoesIA: string;
  patientCode: string;
  tipoDieta: string;
  calorias: string;
}

export interface AiNutritionPlan {
  mealPlan: string;
  training: string;
  supplements: string;
  deficiencias: string;
}

export interface ReportRecord {
  id: string;
  date: string;
  patientCode: string;
  formData: PatientFormData;
  aiData?: AiNutritionPlan | null;
  aiMealPlan?: string;
  fichaNumber?: number;
}

export interface ChatMessage {
  id: string;
  patientCode: string;
  sender: 'nutri' | 'patient' | 'system';
  text: string;
  imageUrl?: string | null;
  timestamp: string;
}

export type AppointmentCategory =
  | 'Consulta Qualisan'
  | 'Visita Particular'
  | 'Lazer / Pessoal'
  | 'Compromisso Diverso';

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
  type: AppointmentCategory;
  timestamp?: string;
}

export interface RecipeItem {
  nome: string;
  tempo: string;
  ingredientes: string;
  preparo: string;
  nutricao: string;
}

export type UserRole = 'guest' | 'nutri' | 'patient';

export type AppView =
  | 'dashboard'
  | 'new-form'
  | 'report-view'
  | 'patients'
  | 'agenda'
  | 'kitchen'
  | 'chat-hub'
  | 'chat-room'
  | 'patient-portal';

export interface PatientGroup {
  code: string;
  name: string;
  consultationCount: number;
  lastDate: string;
  latestReport: ReportRecord;
  history: ReportRecord[];
}

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  color: string;
}

export interface IMCResult {
  value: string;
  classification: string;
  colorClass: string;
  numericValue: number;
}
