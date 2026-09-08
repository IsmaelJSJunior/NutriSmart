import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ClipboardEdit,
  ArrowLeft,
  User,
  Scale,
  Ruler,
  Activity,
  HeartPulse,
  Flame,
  AlertTriangle,
  FileCheck,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Calendar,
  Layers,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  Dice5,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  Percent,
  Droplets,
  Plus,
  Check,
} from 'lucide-react';
import { PatientFormData, ReportRecord, AiNutritionPlan, PatientPhoto } from '../types';
import { calculateIMC, generatePatientCode } from '../lib/utils';
import { requestMealPlanAI } from '../services/ai';
import { dataStore } from '../services/storage';
import { CustomSelect } from './CustomSelect';

interface ClinicalFormViewProps {
  existingReports: ReportRecord[];
  initialPatientCode?: string;
  onPlanGenerated: (report: ReportRecord) => void;
  onBack: () => void;
}

const DIET_STRATEGIES = [
  'Padrão (IA Livre)',
  'Projeto Verão',
  'Restrição de Carboidratos (Low Carb)',
  'Sem Lactose',
  'Sem Glúten',
  'Protocolo GLP-1 (Ozempic / Mounjaro / Rybelsus)',
  'Dieta Bariátrica (Fase Adaptativa)',
  'Manejo de Endometriose & Anti-inflamatória',
  'Hipertrofia Limpa',
  'Dieta Cetogênica (Keto)',
  'Vegetariana / Plant-Based',
];

const PRESET_CALORIES = ['1200', '1500', '1800', '2000', '2200', '2500'];

export function estimateCalorieNeeds(
  pesoStr: string,
  alturaStr: string,
  idadeStr: string,
  exercicioStr: string,
  objetivoStr: string
): number {
  const peso = parseFloat(pesoStr) || 70;
  const altura = parseFloat(alturaStr) || 168;
  const idade = parseFloat(idadeStr) || 30;

  // Equação Mifflin-St Jeor balanceada
  const bmr = 10 * peso + 6.25 * altura - 5 * idade - 50;

  let factor = 1.2;
  if (exercicioStr.includes('Leve')) factor = 1.375;
  else if (exercicioStr.includes('Moderado')) factor = 1.55;
  else if (exercicioStr.includes('Intenso')) factor = 1.725;

  let tdee = bmr * factor;

  if (objetivoStr.includes('Emagrecimento')) {
    tdee -= 450;
  } else if (objetivoStr.includes('Hipertrofia')) {
    tdee += 350;
  } else if (objetivoStr.includes('Definição')) {
    tdee -= 200;
  }

  return Math.round(Math.max(1200, Math.min(4500, tdee)) / 50) * 50;
}

const OBJECTIVE_OPTIONS = [
  { value: 'Emagrecimento', label: 'Emagrecimento / Perda de Gordura' },
  { value: 'Hipertrofia', label: 'Ganho de Massa Muscular (Hipertrofia)' },
  { value: 'Definição', label: 'Definição Corporal / Recomposição' },
  { value: 'Saúde e Longevidade', label: 'Saúde Geral & Longevidade' },
  { value: 'Desempenho Esportivo', label: 'Performance Esportiva' },
  { value: 'Controle Glicêmico / Metabólico', label: 'Controle de Glicemia e Colesterol' },
];

const ACTIVITY_OPTIONS = [
  { value: 'Sedentário (Nenhum ou muito pouco)', label: 'Sedentário (Nenhum ou muito pouco)' },
  { value: 'Leve (1 a 2 vezes por semana)', label: 'Leve (1 a 2 vezes por semana)' },
  { value: 'Moderado (3 a 4 vezes por semana)', label: 'Moderado (3 a 4 vezes por semana)' },
  { value: 'Intenso (5 a 7 vezes por semana)', label: 'Intenso (5 a 7 vezes por semana)' },
];

export const ClinicalFormView: React.FC<ClinicalFormViewProps> = ({
  existingReports,
  initialPatientCode,
  onPlanGenerated,
  onBack,
}) => {
  const [formData, setFormData] = useState<PatientFormData>({
    nome: '',
    idade: '',
    sexo: 'F',
    telefone: '',
    email: '',
    senha: '',
    peso: '',
    altura: '',
    // Circunferências Corporais Bilaterais
    braco: '',
    bracoDireitoRelaxado: '',
    bracoEsquerdoRelaxado: '',
    bracoDireitoContraido: '',
    bracoEsquerdoContraido: '',
    ombros: '',
    peito: '',
    peitoral: '',
    cintura: '',
    abdomen: '',
    quadril: '',
    coxa: '',
    coxaDireita: '',
    coxaEsquerda: '',
    panturrilha: '',
    panturrilhaDireita: '',
    panturrilhaEsquerda: '',
    // 9 Pregas Cutâneas (mm)
    dobraTriceps: '',
    dobraSubescapular: '',
    dobraAxilarMedia: '',
    dobraPeitoral: '',
    dobraSuprailiaca: '',
    dobraAbdominal: '',
    dobraCoxa: '',
    dobraPanturrilha: '',
    dobraBiceps: '',
    // Composição Corporal
    densidadeCorporal: '',
    percentualGordura: '',
    classificacaoGordura: '',
    // Galeria de Fotos
    fotos: [],
    // Campos Clínicos
    objetivo: 'Emagrecimento',
    restricoes: '',
    sintomas: '',
    agua: '2.0',
    exercicio: 'Sedentário (Nenhum ou muito pouco)',
    observacoes: '',
    instrucoesIA: '',
    patientCode: '',
    tipoDieta: 'Padrão (IA Livre)',
    calorias: '1800',
  });

  const [calorieMode, setCalorieMode] = useState<'ai' | 'preset' | 'custom'>('ai');
  const [customCalorie, setCustomCalorie] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic AI Calorie Estimation
  const calculatedAiCalories = useMemo(() => {
    return estimateCalorieNeeds(
      formData.peso,
      formData.altura,
      formData.idade,
      formData.exercicio,
      formData.objetivo
    );
  }, [formData.peso, formData.altura, formData.idade, formData.exercicio, formData.objetivo]);

  // Keep formData.calorias in sync when in 'ai' mode
  useEffect(() => {
    if (calorieMode === 'ai') {
      setFormData((prev) => ({
        ...prev,
        calorias: String(calculatedAiCalories),
      }));
    }
  }, [calorieMode, calculatedAiCalories]);

  // Dynamic Hydration Goal (40 ml/kg)
  const recommendedWaterMl = useMemo(() => {
    const peso = parseFloat(formData.peso);
    if (!peso || peso <= 0) return null;
    return Math.round(peso * 40);
  }, [formData.peso]);

  // 9 Skinfold Protocol & Siri Equation for % Body Fat
  const skinfoldMetrics = useMemo(() => {
    const dTriceps = parseFloat(formData.dobraTriceps || '0') || 0;
    const dSubescapular = parseFloat(formData.dobraSubescapular || '0') || 0;
    const dAxilarMedia = parseFloat(formData.dobraAxilarMedia || '0') || 0;
    const dPeitoral = parseFloat(formData.dobraPeitoral || '0') || 0;
    const dSuprailiaca = parseFloat(formData.dobraSuprailiaca || '0') || 0;
    const dAbdominal = parseFloat(formData.dobraAbdominal || '0') || 0;
    const dCoxa = parseFloat(formData.dobraCoxa || '0') || 0;
    const dPanturrilha = parseFloat(formData.dobraPanturrilha || '0') || 0;
    const dBiceps = parseFloat(formData.dobraBiceps || '0') || 0;

    const soma9 =
      dTriceps +
      dSubescapular +
      dAxilarMedia +
      dPeitoral +
      dSuprailiaca +
      dAbdominal +
      dCoxa +
      dPanturrilha +
      dBiceps;
    const soma7 =
      dTriceps +
      dSubescapular +
      dAxilarMedia +
      dPeitoral +
      dSuprailiaca +
      dAbdominal +
      dCoxa;

    const idade = parseFloat(formData.idade) || 30;
    const isFemale = (formData.sexo || 'F').toUpperCase() === 'F';

    if (soma7 > 0 && idade > 0) {
      let dc = 0;
      if (isFemale) {
        // Jackson & Pollock 7 dobras mulheres
        dc =
          1.097 -
          0.00046971 * soma7 +
          0.00000056 * Math.pow(soma7, 2) -
          0.00012828 * idade;
      } else {
        // Jackson & Pollock 7 dobras homens
        dc =
          1.112 -
          0.00043499 * soma7 +
          0.00000055 * Math.pow(soma7, 2) -
          0.00028826 * idade;
      }

      // Equação de Siri: %GC = ((4.95 / DC) - 4.50) * 100
      let gc = 0;
      if (dc > 0.85 && dc < 1.25) {
        gc = (4.95 / dc - 4.5) * 100;
        gc = Math.max(3, Math.min(60, gc));
      }

      let classificacao = 'Normal';
      let colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';

      if (isFemale) {
        if (gc < 14) {
          classificacao = 'Gordura Essencial';
          colorClass = 'text-sky-700 bg-sky-50 border-sky-200';
        } else if (gc <= 20.9) {
          classificacao = 'Atlético';
          colorClass = 'text-teal-700 bg-teal-50 border-teal-200';
        } else if (gc <= 24.9) {
          classificacao = 'Bom / Normal';
          colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
        } else if (gc <= 31.9) {
          classificacao = 'Moderado';
          colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
        } else {
          classificacao = 'Elevado';
          colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
        }
      } else {
        if (gc < 6) {
          classificacao = 'Gordura Essencial';
          colorClass = 'text-sky-700 bg-sky-50 border-sky-200';
        } else if (gc <= 13.9) {
          classificacao = 'Atlético';
          colorClass = 'text-teal-700 bg-teal-50 border-teal-200';
        } else if (gc <= 17.9) {
          classificacao = 'Bom / Normal';
          colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
        } else if (gc <= 24.9) {
          classificacao = 'Moderado';
          colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
        } else {
          classificacao = 'Elevado';
          colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
        }
      }

      return {
        soma9: soma9.toFixed(1),
        soma7: soma7.toFixed(1),
        dc: dc.toFixed(4),
        gc: gc.toFixed(1),
        classificacao,
        colorClass,
      };
    }

    return {
      soma9: soma9 > 0 ? soma9.toFixed(1) : '0.0',
      soma7: soma7 > 0 ? soma7.toFixed(1) : '0.0',
      dc: null,
      gc: null,
      classificacao: null,
      colorClass: '',
    };
  }, [
    formData.dobraTriceps,
    formData.dobraSubescapular,
    formData.dobraAxilarMedia,
    formData.dobraPeitoral,
    formData.dobraSuprailiaca,
    formData.dobraAbdominal,
    formData.dobraCoxa,
    formData.dobraPanturrilha,
    formData.dobraBiceps,
    formData.idade,
    formData.sexo,
  ]);

  // Client-side Canvas Image Compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.75);
            const newPhoto: PatientPhoto = {
              id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              label: 'Frente',
              dataUrl: compressed,
              date: new Date().toISOString(),
            };
            setFormData((prev) => ({
              ...prev,
              fotos: [...(prev.fotos || []), newPhoto],
            }));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = (photoId: string) => {
    setFormData((prev) => ({
      ...prev,
      fotos: (prev.fotos || []).filter((p) => p.id !== photoId),
    }));
  };

  const handleChangePhotoLabel = (photoId: string, newLabel: string) => {
    setFormData((prev) => ({
      ...prev,
      fotos: (prev.fotos || []).map((p) => (p.id === photoId ? { ...p, label: newLabel } : p)),
    }));
  };

  // 100% Random & Coherent Clinical Data Generator (Dice5)
  const handleFillTestData = () => {
    const FEMALE_NAMES = [
      'Mariana Duarte Silveira',
      'Beatriz Albuquerque Lima',
      'Camila Ferreira Santos',
      'Juliana Paes Ferreira',
      'Fernanda Costa Ribeiro',
      'Larissa Manoela Souza',
      'Gabriela Pugliesi Alves',
      'Rafaela Santos Mendes',
      'Amanda Meirelles Gomes',
      'Letícia Colin Pereira',
    ];
    const MALE_NAMES = [
      'Lucas Ferreira Castro',
      'Carlos Eduardo Lima',
      'Rodrigo Hilbert Ramos',
      'Rafael Zulu Barbosa',
      'Matheus Nachtergaele',
      'Thiago Lacerda Prado',
      'Felipe Titto Azevedo',
      'Gabriel Medina Rocha',
      'Bruno Gagliasso Dias',
      'Leonardo Vieira Neves',
    ];

    const COMPLAINTS = [
      'Inchaço abdominal no fim do dia, sono agitado e vontade de doce pós-almoço.',
      'Dificuldade para ganho de massa muscular em membros inferiores e fadiga matinal.',
      'Episódios de compulsão alimentar noturna, refluxo e sensação constante de estufamento.',
      'Metabolismo lento percebido pós-30 anos, retenção hídrica pré-menstrual e ansiedade.',
      'Baixo rendimento nos treinos de crossfit, recuperação muscular lenta e câimbras.',
      'Constipação intestinal crônica, baixa ingestão hídrica espontânea e estresse rotineiro.',
    ];

    const RESTRICTIONS = [
      'Sem restrições severas; evitar excesso de glúten e laticínios à noite.',
      'Intolerância leve a lactose (desconforto com leite puro) e sensibilidade a pimenta.',
      'Sem restrições alimentares declaradas. Preferência por comida de verdade e preparos simples.',
      'Sensibilidade a cafeína após as 15h. Evitar frituras por refluxo.',
      'Alergia a frutos do mar e amendoim. Não consome carne de porco.',
    ];

    const OBJECTIVES = [
      'Emagrecimento',
      'Hipertrofia',
      'Definição',
      'Saúde e Longevidade',
      'Desempenho Esportivo',
    ];
    const DIETS = [
      'Restrição de Carboidratos (Low Carb)',
      'Padrão (IA Livre)',
      'Hipertrofia Limpa',
      'Projeto Verão',
      'Manejo de Endometriose & Anti-inflamatória',
    ];
    const EXERCISES = [
      'Sedentário (Nenhum ou muito pouco)',
      'Leve (1 a 2 vezes por semana)',
      'Moderado (3 a 4 vezes por semana)',
      'Intenso (5 a 7 vezes por semana)',
    ];

    const isFemale = Math.random() > 0.45;
    const name = isFemale
      ? FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)]
      : MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)];
    const sex = isFemale ? 'F' : 'M';
    const age = String(Math.floor(20 + Math.random() * 52));

    // Height & Weight
    const heightNum = isFemale
      ? Math.floor(155 + Math.random() * 19)
      : Math.floor(168 + Math.random() * 23);
    const targetBmi = 20.5 + Math.random() * 7.5;
    const weightNum = (targetBmi * Math.pow(heightNum / 100, 2)).toFixed(1);

    // Circumferences
    const armRelaxed = isFemale
      ? (25 + Math.random() * 6).toFixed(1)
      : (31 + Math.random() * 8).toFixed(1);
    const armDiff = (0.2 + Math.random() * 0.4).toFixed(1);
    const armContractedDiff = (2.8 + Math.random() * 1.5).toFixed(1);

    const shoulders = isFemale
      ? (94 + Math.random() * 12).toFixed(1)
      : (108 + Math.random() * 16).toFixed(1);
    const chest = isFemale
      ? (86 + Math.random() * 12).toFixed(1)
      : (96 + Math.random() * 16).toFixed(1);
    const waist = isFemale
      ? (66 + Math.random() * 14).toFixed(1)
      : (78 + Math.random() * 16).toFixed(1);
    const abdomen = (parseFloat(waist) + 4 + Math.random() * 6).toFixed(1);
    const hips = isFemale
      ? (95 + Math.random() * 16).toFixed(1)
      : (92 + Math.random() * 12).toFixed(1);
    const thigh = isFemale
      ? (54 + Math.random() * 10).toFixed(1)
      : (52 + Math.random() * 12).toFixed(1);
    const calf = (33 + Math.random() * 7).toFixed(1);

    // 9 Skinfolds (mm)
    const dTriceps = isFemale
      ? (14 + Math.random() * 12).toFixed(1)
      : (8 + Math.random() * 9).toFixed(1);
    const dSubescapular = (10 + Math.random() * 10).toFixed(1);
    const dAxilarMedia = (9 + Math.random() * 8).toFixed(1);
    const dPeitoral = isFemale
      ? (8 + Math.random() * 6).toFixed(1)
      : (7 + Math.random() * 10).toFixed(1);
    const dSuprailiaca = (11 + Math.random() * 12).toFixed(1);
    const dAbdominal = (14 + Math.random() * 14).toFixed(1);
    const dCoxa = isFemale
      ? (18 + Math.random() * 12).toFixed(1)
      : (10 + Math.random() * 10).toFixed(1);
    const dPanturrilha = (9 + Math.random() * 8).toFixed(1);
    const dBiceps = (5 + Math.random() * 7).toFixed(1);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 3)
      .join('')
      .toUpperCase();
    const mockCode = (initials || 'PAC') + randomSuffix.toString().slice(0, 2);
    const mockPass = 'Nutri' + Math.floor(100 + Math.random() * 900) + '@';

    const obj = OBJECTIVES[Math.floor(Math.random() * OBJECTIVES.length)];
    const diet = DIETS[Math.floor(Math.random() * DIETS.length)];
    const exer = EXERCISES[Math.floor(Math.random() * EXERCISES.length)];
    const comp = COMPLAINTS[Math.floor(Math.random() * COMPLAINTS.length)];
    const restr = RESTRICTIONS[Math.floor(Math.random() * RESTRICTIONS.length)];
    const water = (1.8 + Math.random() * 1.5).toFixed(1);

    const mockData: PatientFormData = {
      nome: name,
      idade: age,
      sexo: sex,
      telefone: `(${Math.floor(11 + Math.random() * 78)}) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      email: `${name.toLowerCase().split(' ')[0]}.${name.toLowerCase().split(' ')[1] || 'pac'}@email.com`,
      senha: mockPass,
      peso: weightNum,
      altura: String(heightNum),
      // Bilateral
      braco: armRelaxed,
      bracoDireitoRelaxado: armRelaxed,
      bracoEsquerdoRelaxado: (parseFloat(armRelaxed) + parseFloat(armDiff)).toFixed(1),
      bracoDireitoContraido: (parseFloat(armRelaxed) + parseFloat(armContractedDiff)).toFixed(1),
      bracoEsquerdoContraido: (parseFloat(armRelaxed) + parseFloat(armContractedDiff) + 0.2).toFixed(1),
      ombros: shoulders,
      peito: chest,
      peitoral: chest,
      cintura: waist,
      abdomen: abdomen,
      quadril: hips,
      coxa: thigh,
      coxaDireita: thigh,
      coxaEsquerda: (parseFloat(thigh) + 0.3).toFixed(1),
      panturrilha: calf,
      panturrilhaDireita: calf,
      panturrilhaEsquerda: calf,
      // 9 Dobras
      dobraTriceps: dTriceps,
      dobraSubescapular: dSubescapular,
      dobraAxilarMedia: dAxilarMedia,
      dobraPeitoral: dPeitoral,
      dobraSuprailiaca: dSuprailiaca,
      dobraAbdominal: dAbdominal,
      dobraCoxa: dCoxa,
      dobraPanturrilha: dPanturrilha,
      dobraBiceps: dBiceps,
      // Campos clínicos
      objetivo: obj,
      restricoes: restr,
      sintomas: comp,
      agua: water,
      exercicio: exer,
      observacoes: `Paciente busca acompanhamento nutricional com foco em ${obj.toLowerCase()}.`,
      instrucoesIA: `Priorizar adesão alimentar, fracionamento adequado de refeições e densidade nutricional.`,
      patientCode: mockCode,
      tipoDieta: diet,
      calorias: '1800',
      fotos: formData.fotos || [],
    };

    setFormData(mockData);
    setCalorieMode('ai');
  };

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If initialPatientCode was passed, pre-fill with latest report
  useEffect(() => {
    if (initialPatientCode) {
      const patientReports = existingReports.filter(
        (r) => r.patientCode.toUpperCase() === initialPatientCode.toUpperCase()
      );
      if (patientReports.length > 0) {
        const latest = patientReports[0];
        setFormData({
          ...latest.formData,
        });
      }
    }
  }, [initialPatientCode, existingReports]);

  // Return patient detector: check if name matches any existing patient
  const matchingPatient = useMemo(() => {
    if (!formData.nome || formData.nome.trim().length < 3) return null;
    const match = existingReports.find(
      (r) => r.formData.nome.trim().toLowerCase() === formData.nome.trim().toLowerCase()
    );
    return match || null;
  }, [formData.nome, existingReports]);

  const handleApplyExistingPatient = (existing: ReportRecord) => {
    setFormData((prev) => ({
      ...prev,
      ...existing.formData,
      peso: prev.peso || existing.formData.peso,
      altura: existing.formData.altura,
      patientCode: existing.patientCode,
      idade: existing.formData.idade,
      telefone: existing.formData.telefone,
      email: existing.formData.email,
      senha: existing.formData.senha || prev.senha,
    }));
  };

  // Live IMC calculation
  const imcResult = useMemo(() => {
    return calculateIMC(formData.peso, formData.altura);
  }, [formData.peso, formData.altura]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setErrorMessage('Por favor, informe o nome do paciente.');
      return;
    }
    if (!formData.peso || !formData.altura) {
      setErrorMessage('Peso e altura são obrigatórios para o cálculo nutricional.');
      return;
    }
    if (!formData.patientCode?.trim()) {
      setErrorMessage('Por favor, defina o Código Localizador do Paciente.');
      return;
    }
    if (!formData.senha?.trim()) {
      setErrorMessage('Por favor, defina a Senha de Acesso do Paciente para o portal.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    // Assign or preserve patient code
    let pCode = formData.patientCode.trim().toUpperCase();
    if (!pCode) {
      const existingCodes = existingReports.map((r) => r.patientCode);
      pCode = generatePatientCode(existingCodes);
    }

    const payload: PatientFormData = {
      ...formData,
      patientCode: pCode,
      senha: formData.senha.trim(),
      densidadeCorporal: skinfoldMetrics.dc || formData.densidadeCorporal || '',
      percentualGordura: skinfoldMetrics.gc || formData.percentualGordura || '',
      classificacaoGordura: skinfoldMetrics.classificacao || formData.classificacaoGordura || '',
    };

    try {
      setLoadingStep('Analisando perfil metabólico e queixas clínicas...');
      await new Promise((r) => setTimeout(r, 400));

      setLoadingStep('Calculando macros, estratégia e carências com IA NutriClinical...');
      const aiResponse: AiNutritionPlan = await requestMealPlanAI(payload);

      setLoadingStep('Formatando prescrição clínica...');

      const newReport: ReportRecord = {
        id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: new Date().toISOString(),
        patientCode: pCode,
        formData: payload,
        aiData: aiResponse,
        aiMealPlan: aiResponse.mealPlan,
        fichaNumber: existingReports.filter((r) => r.patientCode === pCode).length + 1,
      };

      await dataStore.saveReport(newReport);
      setLoading(false);
      onPlanGenerated(newReport);
    } catch (err: any) {
      console.error('Erro na criação da ficha:', err);
      setLoading(false);
      setErrorMessage(err?.message || 'Falha ao processar com a IA. Verifique sua conexão e tente novamente.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-10 space-y-2.5 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Top Header Card - Standardized Design System */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-emerald-100/90 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-2xs border border-emerald-200/60 shrink-0">
            <ClipboardEdit className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Nova Ficha</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Anamnese clínica, dados antropométricos e prescrição personalizada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleFillTestData}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer group"
            title="Preencher dados de teste 100% aleatórios"
          >
            <Dice5 className="w-4 h-4 text-amber-600 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Dados de Teste</span>
          </button>
        </div>
      </div>

      {/* Existing Patient Matched Banner */}
      {matchingPatient && matchingPatient.patientCode !== formData.patientCode && (
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-200 text-sky-800 flex items-center justify-center font-black text-xs shrink-0">
              {matchingPatient.patientCode}
            </div>
            <div>
              <h4 className="text-xs font-bold text-sky-900">
                Paciente já cadastrado: {matchingPatient.formData.nome}
              </h4>
              <p className="text-[11px] text-sky-700">
                Deseja vincular ao código existente para manter a evolução temporal?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleApplyExistingPatient(matchingPatient)}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
          >
            Vincular ({matchingPatient.patientCode})
          </button>
        </div>
      )}

      {/* Main Anamnese Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* Section 1: Identificação & Credenciais */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              1. Identificação & Acesso do Paciente
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome Completo do Paciente <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Carlos Mendes"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sexo Biológico <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 h-[42px]">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, sexo: 'F' }))}
                  className={`rounded-xl border font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                    (formData.sexo || 'F') === 'F'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs font-extrabold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Feminino (F)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, sexo: 'M' }))}
                  className={`rounded-xl border font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                    formData.sexo === 'M'
                      ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-2xs font-extrabold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Masculino (M)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Idade
              </label>
              <input
                type="number"
                name="idade"
                value={formData.idade}
                onChange={handleChange}
                placeholder="Ex: 34"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código Localizador <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="patientCode"
                required
                value={formData.patientCode}
                onChange={(e) => setFormData((p) => ({ ...p, patientCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                placeholder="Ex: CAR1"
                maxLength={8}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Senha de Acesso do Paciente <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="senha"
                  required
                  value={formData.senha || ''}
                  onChange={handleChange}
                  placeholder="Defina a senha para o portal"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Antropometria & Circunferências Corporais Bilaterais */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                2. Antropometria & Circunferências Bilaterais
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Medidas em Centímetros (cm)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Peso Atual (kg) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  name="peso"
                  required
                  value={formData.peso}
                  onChange={handleChange}
                  placeholder="Ex: 82.5"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition pr-9"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">kg</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Altura (cm) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="altura"
                  required
                  value={formData.altura}
                  onChange={handleChange}
                  placeholder="Ex: 175"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition pr-9"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">cm</span>
              </div>
            </div>

            {/* Live IMC Widget */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center text-emerald-700 font-black text-xs">
                  IMC
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700">
                    IMC: <span className="text-sm font-black text-slate-900">{imcResult.value}</span>
                  </div>
                  <span className={`text-[11px] font-black ${imcResult.colorClass}`}>
                    {imcResult.classification}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-bloco 1: Braços Bilaterais */}
          <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Membros Superiores: Braços (cm)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Relaxado vs. Contraído</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Braço Direito (Relaxado)</span>
                <input
                  type="number"
                  step="0.1"
                  name="bracoDireitoRelaxado"
                  value={formData.bracoDireitoRelaxado || formData.braco || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((p) => ({ ...p, bracoDireitoRelaxado: v, braco: v }));
                  }}
                  placeholder="Ex: 32.5"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Braço Esquerdo (Relaxado)</span>
                <input
                  type="number"
                  step="0.1"
                  name="bracoEsquerdoRelaxado"
                  value={formData.bracoEsquerdoRelaxado || ''}
                  onChange={handleChange}
                  placeholder="Ex: 32.2"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Braço Direito (Contraído)</span>
                <input
                  type="number"
                  step="0.1"
                  name="bracoDireitoContraido"
                  value={formData.bracoDireitoContraido || ''}
                  onChange={handleChange}
                  placeholder="Ex: 35.8"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Braço Esquerdo (Contraído)</span>
                <input
                  type="number"
                  step="0.1"
                  name="bracoEsquerdoContraido"
                  value={formData.bracoEsquerdoContraido || ''}
                  onChange={handleChange}
                  placeholder="Ex: 35.5"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sub-bloco 2: Tronco */}
          <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Tronco & Perímetros Centrais (cm)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Ombros</span>
                <input
                  type="number"
                  step="0.1"
                  name="ombros"
                  value={formData.ombros || ''}
                  onChange={handleChange}
                  placeholder="Ex: 112"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Peitoral / Tórax</span>
                <input
                  type="number"
                  step="0.1"
                  name="peitoral"
                  value={formData.peitoral || formData.peito || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((p) => ({ ...p, peitoral: v, peito: v }));
                  }}
                  placeholder="Ex: 98"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Cintura</span>
                <input
                  type="number"
                  step="0.1"
                  name="cintura"
                  value={formData.cintura}
                  onChange={handleChange}
                  placeholder="Ex: 78"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Abdômen</span>
                <input
                  type="number"
                  step="0.1"
                  name="abdomen"
                  value={formData.abdomen}
                  onChange={handleChange}
                  placeholder="Ex: 85"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Quadril</span>
                <input
                  type="number"
                  step="0.1"
                  name="quadril"
                  value={formData.quadril}
                  onChange={handleChange}
                  placeholder="Ex: 102"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sub-bloco 3: Membros Inferiores Bilaterais */}
          <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Membros Inferiores Bilaterais (cm)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Coxa Direita</span>
                <input
                  type="number"
                  step="0.1"
                  name="coxaDireita"
                  value={formData.coxaDireita || formData.coxa || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((p) => ({ ...p, coxaDireita: v, coxa: v }));
                  }}
                  placeholder="Ex: 56.5"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Coxa Esquerda</span>
                <input
                  type="number"
                  step="0.1"
                  name="coxaEsquerda"
                  value={formData.coxaEsquerda || ''}
                  onChange={handleChange}
                  placeholder="Ex: 56.2"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Panturrilha Direita</span>
                <input
                  type="number"
                  step="0.1"
                  name="panturrilhaDireita"
                  value={formData.panturrilhaDireita || formData.panturrilha || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((p) => ({ ...p, panturrilhaDireita: v, panturrilha: v }));
                  }}
                  placeholder="Ex: 37"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-600 block mb-1">Panturrilha Esquerda</span>
                <input
                  type="number"
                  step="0.1"
                  name="panturrilhaEsquerda"
                  value={formData.panturrilhaEsquerda || ''}
                  onChange={handleChange}
                  placeholder="Ex: 37"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Protocolo de Pregas Cutâneas & Composição Corporal (9 Dobras em mm) */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                3. Pregas Cutâneas (Protocolo de 9 Dobras em mm)
              </h2>
            </div>
          </div>

          {/* 9 Dobras Inputs Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Tríceps">
                1. Tríceps
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraTriceps"
                value={formData.dobraTriceps || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Subescapular">
                2. Subescapular
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraSubescapular"
                value={formData.dobraSubescapular || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Axilar Média">
                3. Axilar Média
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraAxilarMedia"
                value={formData.dobraAxilarMedia || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Peitoral">
                4. Peitoral
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraPeitoral"
                value={formData.dobraPeitoral || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Supra-ilíaca">
                5. Supra-ilíaca
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraSuprailiaca"
                value={formData.dobraSuprailiaca || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Abdominal">
                6. Abdominal
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraAbdominal"
                value={formData.dobraAbdominal || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Coxa">
                7. Coxa
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraCoxa"
                value={formData.dobraCoxa || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Panturrilha">
                8. Panturrilha
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraPanturrilha"
                value={formData.dobraPanturrilha || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-600 block mb-1 truncate" title="Bíceps">
                9. Bíceps
              </span>
              <input
                type="number"
                step="0.1"
                name="dobraBiceps"
                value={formData.dobraBiceps || ''}
                onChange={handleChange}
                placeholder="mm"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Real-time Siri & Body Density Highlights Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/80 to-sky-50/80 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-sm flex items-center justify-center shadow-2xs shrink-0">
                %GC
              </div>
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Gordura Corporal Estimada
                </div>
                {skinfoldMetrics.gc ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-emerald-800">
                      {skinfoldMetrics.gc}%
                    </span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${skinfoldMetrics.colorClass}`}>
                      {skinfoldMetrics.classificacao}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">
                    Preencha as dobras para o cálculo automático em tempo real
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center border-t sm:border-t-0 sm:border-l border-emerald-200/80 pt-2 sm:pt-0 sm:pl-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Densidade (DC)</span>
                <span className="font-bold text-slate-700">{skinfoldMetrics.dc ? `${skinfoldMetrics.dc} g/cm³` : '--'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Soma 7 Dobras</span>
                <span className="font-bold text-slate-700">{skinfoldMetrics.soma7} mm</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Total 9 Dobras</span>
                <span className="font-bold text-slate-700">{skinfoldMetrics.soma9} mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Galeria de Fotos do Paciente (Evolução Visual) */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                4. Fotos de Acompanhamento & Evolução Visual
              </h2>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="patient-photo-upload"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Anexar Fotos</span>
              </button>
            </div>
          </div>

          {(formData.fotos || []).length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="py-6 px-4 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl text-center cursor-pointer transition bg-slate-50/50 hover:bg-indigo-50/20 group"
            >
              <ImageIcon className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 mx-auto mb-1.5 transition-colors" />
              <p className="text-xs font-bold text-slate-600">
                Nenhuma foto anexada para esta consulta
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique para carregar fotos corporais (Frente, Costas, Perfil). Imagens são comprimidas automaticamente no navegador.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {(formData.fotos || []).map((photo) => (
                <div
                  key={photo.id}
                  className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-2xs flex flex-col"
                >
                  <div className="aspect-3/4 w-full overflow-hidden bg-slate-100 relative">
                    <img
                      src={photo.dataUrl}
                      alt={photo.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100 cursor-pointer shadow-xs"
                      title="Excluir foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-1.5 bg-white border-t border-slate-100">
                    <select
                      value={photo.label}
                      onChange={(e) => handleChangePhotoLabel(photo.id, e.target.value)}
                      className="w-full text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md py-1 px-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Frente">Frente</option>
                      <option value="Costas">Costas</option>
                      <option value="Perfil Direito">Perfil Direito</option>
                      <option value="Perfil Esquerdo">Perfil Esquerdo</option>
                      <option value="Livre">Livre / Detalhe</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Hábitos, Queixas & Estratégia Dietética */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <HeartPulse className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              5. Hábitos, Queixas & Estratégia Nutricional
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <CustomSelect
              label="Objetivo Clínico"
              value={formData.objetivo}
              onChange={(val) => setFormData((p) => ({ ...p, objetivo: val }))}
              options={OBJECTIVE_OPTIONS}
            />

            <CustomSelect
              label="Nível de Atividade Física"
              value={formData.exercicio}
              onChange={(val) => setFormData((p) => ({ ...p, exercicio: val }))}
              options={ACTIVITY_OPTIONS}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Consumo Médio de Água
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="agua"
                  value={formData.agua}
                  onChange={handleChange}
                  placeholder="Ex: 2.5"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition pr-12"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">L/dia</span>
              </div>
              {recommendedWaterMl && recommendedWaterMl > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-lg">
                  <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>
                    Recomendado: {recommendedWaterMl.toLocaleString('pt-BR')} ml/dia ({(recommendedWaterMl / 1000).toFixed(1).replace('.', ',')} L)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomSelect
              label="Estratégia Nutricional"
              value={formData.tipoDieta}
              onChange={(val) => setFormData((p) => ({ ...p, tipoDieta: val }))}
              options={DIET_STRATEGIES}
            />

            {/* 3-Mode Caloric Goal Control (IA, Predefinidas, Digitação Livre) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Meta Calórica Estipulada
              </label>

              {/* Mode Selector Tabs */}
              <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCalorieMode('ai');
                    setFormData((p) => ({ ...p, calorias: String(calculatedAiCalories) }));
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                    calorieMode === 'ai'
                      ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Cálculo automático baseado no gasto metabólico/antropometria"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>IA: {calculatedAiCalories} kcal</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalorieMode('preset');
                    if (!PRESET_CALORIES.includes(formData.calorias)) {
                      setFormData((p) => ({ ...p, calorias: '1800' }));
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                    calorieMode === 'preset'
                      ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Opções predefinidas rápidas"
                >
                  <span>Predefinidas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCalorieMode('custom');
                    setCustomCalorie(formData.calorias.replace(/\D/g, '') || String(calculatedAiCalories));
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                    calorieMode === 'custom'
                      ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Digitação livre personalizada"
                >
                  <span>Digitação Livre</span>
                </button>
              </div>

              {calorieMode === 'preset' && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-0.5">
                  {PRESET_CALORIES.map((cal) => (
                    <button
                      key={cal}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, calorias: cal }))}
                      className={`py-1.5 px-1 rounded-lg text-xs font-black transition border cursor-pointer ${
                        formData.calorias === cal
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs scale-[1.02]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cal}
                    </button>
                  ))}
                </div>
              )}

              {calorieMode === 'custom' && (
                <div className="relative pt-0.5">
                  <input
                    type="number"
                    min="800"
                    max="6000"
                    step="10"
                    value={customCalorie}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomCalorie(val);
                      if (val) {
                        setFormData((p) => ({ ...p, calorias: val }));
                      }
                    }}
                    placeholder="Digite o valor exato (Ex: 1730)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition pr-14"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">kcal</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Restrições & Alergias Alimentares
              </label>
              <textarea
                name="restricoes"
                rows={2}
                value={formData.restricoes}
                onChange={handleChange}
                placeholder="Ex: Intolerância à lactose, alergia a frutos do mar..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sintomas & Queixas Clínicas (Carências)
              </label>
              <textarea
                name="sintomas"
                rows={2}
                value={formData.sintomas}
                onChange={handleChange}
                placeholder="Ex: Queda de cabelo, fadiga matinal, unhas fracas..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Diretrizes & Observações Personalizadas
            </label>
            <input
              type="text"
              name="instrucoesIA"
              value={formData.instrucoesIA}
              onChange={handleChange}
              placeholder="Ex: Priorizar fontes vegetais de ferro, prescrever ceia relaxante..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition active:scale-95 cursor-pointer shadow-2xs"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 disabled:opacity-50 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStep || 'Gerando Ficha...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Ficha</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

