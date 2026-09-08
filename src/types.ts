export interface PatientPhoto {
  id: string;
  label: 'Frente' | 'Costas' | 'Perfil Direito' | 'Perfil Esquerdo' | 'Livre' | string;
  dataUrl: string;
  date: string;
}

export interface PatientFormData {
  nome: string;
  idade: string;
  sexo?: 'M' | 'F' | string;
  telefone: string;
  email: string;
  senha?: string;
  peso: string;
  altura: string;
  // Medidas Legadas / Unilaterais (compatibilidade)
  braco?: string;
  peito?: string;
  cintura: string;
  abdomen: string;
  quadril: string;
  coxa?: string;
  panturrilha?: string;
  // Circunferências Corporais Bilaterais Detalhadas (cm)
  bracoDireitoRelaxado?: string;
  bracoEsquerdoRelaxado?: string;
  bracoDireitoContraido?: string;
  bracoEsquerdoContraido?: string;
  ombros?: string;
  peitoral?: string;
  coxaDireita?: string;
  coxaEsquerda?: string;
  panturrilhaDireita?: string;
  panturrilhaEsquerda?: string;
  // Protocolo de 9 Pregas Cutâneas (mm)
  dobraTriceps?: string;
  dobraSubescapular?: string;
  dobraAxilarMedia?: string;
  dobraPeitoral?: string;
  dobraSuprailiaca?: string;
  dobraAbdominal?: string;
  dobraCoxa?: string;
  dobraPanturrilha?: string;
  dobraBiceps?: string;
  // Composição Corporal Estimada (Jackson & Pollock + Equação de Siri)
  densidadeCorporal?: string;
  percentualGordura?: string;
  classificacaoGordura?: string;
  // Galeria de Fotos Evolutivas
  fotos?: PatientPhoto[];
  // Campos Clínicos
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
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  patientCode: string;
  sender: 'nutri' | 'patient' | 'system';
  text: string;
  imageUrl?: string | null;
  timestamp: string;
  read?: boolean;
}

export type AppointmentCategory =
  | 'Santa Casa'
  | 'Visita Particular'
  | 'Lazer / Pessoal'
  | 'Compromisso Diverso'
  | 'Outro / Personalizado'
  | string;

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
  | 'patient-portal'
  | 'calculator';

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
