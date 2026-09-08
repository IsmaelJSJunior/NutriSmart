import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calculator,
  ArrowLeft,
  RotateCcw,
  Copy,
  Check,
  Dice5,
  Flame,
  Droplets,
  Ruler,
  Weight,
  Info,
  ChevronDown,
  X,
  Share2,
  Layers,
} from 'lucide-react';

export interface CalculatorSessionData {
  sexo: 'M' | 'F';
  idade: string;
  alturaJoelho: string;
  circunferenciaBraco: string;
  pesoManual: string;
  alturaManual: string;
  fatorLesao: number;
  fatorTermico: number;
}

export const DEFAULT_CALCULATOR_SESSION: CalculatorSessionData = {
  sexo: 'M',
  idade: '',
  alturaJoelho: '',
  circunferenciaBraco: '',
  pesoManual: '',
  alturaManual: '',
  fatorLesao: 1.0,
  fatorTermico: 1.0,
};

interface NutritionCalculatorViewProps {
  onBack?: () => void;
  sessionData?: CalculatorSessionData;
  onUpdateSession?: (data: CalculatorSessionData) => void;
}

// Opções de Fator Lesão (FL)
const FATOR_LESAO_OPTIONS = [
  { value: 1.0, label: 'Não complicado', desc: 'Paciente estável, sem complicações agudas ou sepse' },
  { value: 1.1, label: 'Pós Operatório de Câncer (P.O de C.A)', desc: 'Recuperação pós-cirúrgica oncológica' },
  { value: 1.2, label: 'Fratura', desc: 'Fraturas ósseas, traumas ortopédicos' },
  { value: 1.5, label: 'Multitrauma', desc: 'Múltiplos traumas graves, politraumatizado' },
  { value: 1.6, label: 'Sepse', desc: 'Quadro infeccioso sistêmico grave' },
  { value: 1.8, label: 'Queimadura', desc: 'Grandes queimados em fase de hipercatabolismo' },
];

// Opções de Fator Térmico (FT)
const FATOR_TERMICO_OPTIONS = [
  { value: 1.0, label: 'Afebril (< 38 ºC)', desc: 'Temperatura corporal normal / estável' },
  { value: 1.1, label: '38 ºC', desc: 'Febre moderada' },
  { value: 1.2, label: '39 ºC', desc: 'Febre alta' },
  { value: 1.3, label: '40 ºC', desc: 'Hipertermia grave' },
];

export const NutritionCalculatorView: React.FC<NutritionCalculatorViewProps> = ({
  onBack,
  sessionData,
  onUpdateSession,
}) => {
  // Aba ativa: 'all' (Visão Integrada), 'antropometria', 'tmb-get', 'vazao'
  const [activeTab, setActiveTab] = useState<'all' | 'antropometria' | 'tmb-get' | 'vazao'>('all');

  // Estado dos Parâmetros Clínicos (inicia completamente limpo por sessão)
  const [localData, setLocalData] = useState<CalculatorSessionData>(DEFAULT_CALCULATOR_SESSION);
  const data = sessionData || localData;

  const updateData = (updater: Partial<CalculatorSessionData>) => {
    if (onUpdateSession && sessionData) {
      onUpdateSession({ ...sessionData, ...updater });
    } else {
      setLocalData((prev) => ({ ...prev, ...updater }));
    }
  };

  // Estados dos Modais de Pickers Globais Centralizados
  const [showFlModal, setShowFlModal] = useState<boolean>(false);
  const [showFtModal, setShowFtModal] = useState<boolean>(false);

  // Feedback de cópia
  const [copied, setCopied] = useState<boolean>(false);

  // Conversões numéricas seguras
  const ajNum = parseFloat(data.alturaJoelho.replace(',', '.')) || 0;
  const cbNum = parseFloat(data.circunferenciaBraco.replace(',', '.')) || 0;
  const idadeNum = parseFloat(data.idade.replace(',', '.')) || 0;

  // 1. A - Estimativa de Altura (Acamados)
  // Homens: 70 + (2,04 * AJ) - (0,04 * I)
  // Mulheres: 84,88 + (1,83 * AJ) - (0,24 * I)
  const alturaEstimada = useMemo(() => {
    if (ajNum <= 0 || idadeNum <= 0) return null;
    if (data.sexo === 'M') {
      return 70 + (2.04 * ajNum) - (0.04 * idadeNum);
    } else {
      return 84.88 + (1.83 * ajNum) - (0.24 * idadeNum);
    }
  }, [data.sexo, ajNum, idadeNum]);

  // 1. B - Estimativa de Peso (Acamados)
  // Homens: (AJ * 1,1) + (CB * 3,07) - 75,81
  // Mulheres: (AJ * 1,5) + (CB * 2,58) - 84,22
  const pesoEstimado = useMemo(() => {
    if (ajNum <= 0 || cbNum <= 0) return null;
    if (data.sexo === 'M') {
      return (ajNum * 1.1) + (cbNum * 3.07) - 75.81;
    } else {
      return (ajNum * 1.5) + (cbNum * 2.58) - 84.22;
    }
  }, [data.sexo, ajNum, cbNum]);

  // 1. C - Integração 100% Reativa e Automática para TMB
  const pesoEfetivo = data.pesoManual
    ? parseFloat(data.pesoManual.replace(',', '.')) || 0
    : pesoEstimado && pesoEstimado > 0
    ? pesoEstimado
    : 0;

  const alturaEfetiva = data.alturaManual
    ? parseFloat(data.alturaManual.replace(',', '.')) || 0
    : alturaEstimada && alturaEstimada > 0
    ? alturaEstimada
    : 0;

  // 1. D - Taxa Metabólica Basal - TMB (Harris-Benedict)
  // Homens: 66,47 + (13,75 * P) + (5 * A) - (6,76 * I)
  // Mulheres: 655,1 + (9,56 * P) + (1,85 * A) - (4,58 * I)
  const tmb = useMemo(() => {
    if (pesoEfetivo <= 0 || alturaEfetiva <= 0 || idadeNum <= 0) return null;
    if (data.sexo === 'M') {
      return 66.47 + (13.75 * pesoEfetivo) + (5 * alturaEfetiva) - (6.76 * idadeNum);
    } else {
      return 655.1 + (9.56 * pesoEfetivo) + (1.85 * alturaEfetiva) - (4.58 * idadeNum);
    }
  }, [data.sexo, pesoEfetivo, alturaEfetiva, idadeNum]);

  // 1. E - Gasto Energético Total (GET)
  // GET = TMB * 1,27 * FL * FT
  const get = useMemo(() => {
    if (!tmb || tmb <= 0) return null;
    return tmb * 1.27 * data.fatorLesao * data.fatorTermico;
  }, [tmb, data.fatorLesao, data.fatorTermico]);

  // 1. F - Taxa de Administração / Vazão Enteral
  // Vazão = GET / 24
  const vazao = useMemo(() => {
    if (!get || get <= 0) return null;
    return get / 24;
  }, [get]);

  // Resetar todos os campos para o estado limpo
  const handleReset = () => {
    updateData(DEFAULT_CALCULATOR_SESSION);
  };

  // Gerar Dados de Exemplo Clínico Dinâmicos (Realmente Aleatórios e Plausíveis)
  const generateRandomClinicalCase = (): CalculatorSessionData => {
    const randomSexo: 'M' | 'F' = Math.random() > 0.5 ? 'M' : 'F';
    // Idade: entre 25 e 85 anos
    const randomIdade = Math.floor(Math.random() * (85 - 25 + 1)) + 25;
    // Altura do Joelho (AJ): entre 45 e 58 cm, 1 casa decimal
    const randomAJ = (Math.random() * (58 - 45) + 45).toFixed(1).replace('.', ',');
    // Circunferência do Braço (CB): entre 22 e 38 cm, 1 casa decimal
    const randomCB = (Math.random() * (38 - 22) + 22).toFixed(1).replace('.', ',');
    // Sorteio de Fator Lesão (FL) e Fator Térmico (FT)
    const randomFL = FATOR_LESAO_OPTIONS[Math.floor(Math.random() * FATOR_LESAO_OPTIONS.length)].value;
    const randomFT = FATOR_TERMICO_OPTIONS[Math.floor(Math.random() * FATOR_TERMICO_OPTIONS.length)].value;

    return {
      sexo: randomSexo,
      idade: String(randomIdade),
      alturaJoelho: randomAJ,
      circunferenciaBraco: randomCB,
      pesoManual: '',
      alturaManual: '',
      fatorLesao: randomFL,
      fatorTermico: randomFT,
    };
  };

  const handleLoadDemo = () => {
    updateData(generateRandomClinicalCase());
  };

  // Copiar Resumo Clínico para Prontuário / WhatsApp
  const handleCopySummary = () => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const flItem = FATOR_LESAO_OPTIONS.find((o) => o.value === data.fatorLesao);
    const ftItem = FATOR_TERMICO_OPTIONS.find((o) => o.value === data.fatorTermico);

    let texto = `*📊 AVALIAÇÃO NUTRICIONAL & METABÓLICA • NUTRICLINICAL*\n`;
    texto += `📅 *Data:* ${hoje}\n`;
    texto += `👤 *Paciente:* ${data.sexo === 'M' ? 'Masculino' : 'Feminino'} | *Idade:* ${idadeNum > 0 ? `${idadeNum} anos` : 'Não informada'}\n\n`;

    texto += `*📏 ESTIMATIVAS ANTROPOMÉTRICAS (ACAMADOS)*\n`;
    if (ajNum > 0) texto += `• Altura do Joelho (AJ): ${ajNum.toFixed(1).replace('.', ',')} cm\n`;
    if (cbNum > 0) texto += `• Circunferência do Braço (CB): ${cbNum.toFixed(1).replace('.', ',')} cm\n`;
    if (alturaEstimada && alturaEstimada > 0) {
      texto += `• *Altura Estimada:* ${alturaEstimada.toFixed(1).replace('.', ',')} cm (${(alturaEstimada / 100).toFixed(2).replace('.', ',')} m)\n`;
    }
    if (pesoEstimado && pesoEstimado > 0) {
      texto += `• *Peso Estimado:* ${pesoEstimado.toFixed(1).replace('.', ',')} kg\n`;
    }

    texto += `\n*🔥 TAXA METABÓLICA & GASTO ENERGÉTICO (HARRIS-BENEDICT)*\n`;
    texto += `• Peso adotado: ${pesoEfetivo > 0 ? `${pesoEfetivo.toFixed(1).replace('.', ',')} kg` : '-'}\n`;
    texto += `• Altura adotada: ${alturaEfetiva > 0 ? `${alturaEfetiva.toFixed(1).replace('.', ',')} cm` : '-'}\n`;
    if (tmb && tmb > 0) {
      texto += `• *TMB (Taxa Metabólica Basal):* ${Math.round(tmb).toLocaleString('pt-BR')} kcal/dia\n`;
    }
    texto += `• Fator Atividade Basal: 1,27\n`;
    texto += `• Fator Lesão (FL): ${data.fatorLesao.toFixed(1).replace('.', ',')} (${flItem?.label || ''})\n`;
    texto += `• Fator Térmico (FT): ${data.fatorTermico.toFixed(1).replace('.', ',')} (${ftItem?.label || ''})\n`;
    if (get && get > 0) {
      texto += `• *GET (Gasto Energético Total):* ${Math.round(get).toLocaleString('pt-BR')} kcal/dia\n`;
    }

    texto += `\n*💧 TERAPIA ENTERAL (TAXA DE ADMINISTRAÇÃO / VAZÃO)*\n`;
    if (vazao && vazao > 0) {
      texto += `• *Vazão Contínua (GET / 24h):* ${vazao.toFixed(1).replace('.', ',')} ml/h\n`;
      texto += `• Volume Total em 24h: ${Math.round(vazao * 24).toLocaleString('pt-BR')} ml/dia\n`;
    }

    texto += `\n_Emitido via NutriClinical • Sistema de Nutrição Clínica_`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const selectedFlItem = FATOR_LESAO_OPTIONS.find((o) => o.value === data.fatorLesao);
  const selectedFtItem = FATOR_TERMICO_OPTIONS.find((o) => o.value === data.fatorTermico);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-8 space-y-2.5 sm:space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* 1. Subheader Padronizado & Ações Rápidas Integradas */}
      <div className="flex items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 border border-teal-100/90 shadow-2xs gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-teal-100/90 text-teal-700 flex items-center justify-center shadow-2xs border border-teal-200/60 shrink-0">
            <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight truncate">
              Calculadora Nutricional
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
              Estimativas para acamados, taxa metabólica e vazão enteral
            </p>
          </div>
        </div>

        {/* Ações Rápidas Integradas: Exemplo Clínico (Dados Randômicos), Limpar, Copiar Resumo */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-2xs group"
            title="Gerar novo exemplo clínico aleatório"
          >
            <Dice5 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-teal-600 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Exemplo Clínico</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Limpar todos os campos"
          >
            <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Limpar</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className={`p-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
            }`}
            title={copied ? 'Copiado!' : 'Copiar Resumo'}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Copiar Resumo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Abas / Segmentos de Navegação da Seção (Zero Scroll Horizontal) */}
      <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-1.5 w-full bg-slate-100/70 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          title="Visão Completa"
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-teal-600 text-white shadow-2xs shadow-teal-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Visão Completa</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('antropometria')}
          title="Antropometria (Acamados)"
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'antropometria'
              ? 'bg-teal-600 text-white shadow-2xs shadow-teal-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Ruler className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Antropometria (Acamados)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tmb-get')}
          title="TMB & Gasto Energético (GET)"
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'tmb-get'
              ? 'bg-amber-500 text-white shadow-2xs shadow-amber-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Flame className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">TMB & GET</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vazao')}
          title="Terapia Enteral (Vazão)"
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'vazao'
              ? 'bg-blue-600 text-white shadow-2xs shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Droplets className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Terapia Enteral (Vazão)</span>
        </button>
      </div>

      {/* 2. Banner de Resultado Executivo Resumido (Sempre Visível / Atualização Viva) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2.5">
        {/* Resumo Altura Estimada */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-slate-200/70 shadow-2xs hover:border-teal-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Altura Estimada
            </span>
            <Ruler className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-800">
            {alturaEstimada && alturaEstimada > 0 ? (
              <span className="text-teal-700">
                {alturaEstimada.toFixed(1).replace('.', ',')}{' '}
                <span className="text-xs font-bold text-slate-500">cm</span>
              </span>
            ) : (
              <span className="text-slate-300 text-sm font-medium">--</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {alturaEstimada && alturaEstimada > 0
              ? `Equivale a ${(alturaEstimada / 100).toFixed(2).replace('.', ',')} m`
              : 'Informe AJ e Idade'}
          </div>
        </div>

        {/* Resumo Peso Estimado */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-slate-200/70 shadow-2xs hover:border-teal-300 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Peso Estimado
            </span>
            <Weight className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-800">
            {pesoEstimado && pesoEstimado > 0 ? (
              <span className="text-teal-700">
                {pesoEstimado.toFixed(1).replace('.', ',')}{' '}
                <span className="text-xs font-bold text-slate-500">kg</span>
              </span>
            ) : (
              <span className="text-slate-300 text-sm font-medium">--</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {pesoEstimado && pesoEstimado > 0 ? 'Massa corporal estimada' : 'Informe AJ e CB'}
          </div>
        </div>

        {/* Resumo GET */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-slate-200/70 shadow-2xs hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-amber-500/10 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              GET (Total)
            </span>
            <Flame className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-800">
            {get && get > 0 ? (
              <span className="text-amber-600">
                {Math.round(get).toLocaleString('pt-BR')}{' '}
                <span className="text-xs font-bold text-slate-500">kcal</span>
              </span>
            ) : (
              <span className="text-slate-300 text-sm font-medium">--</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {tmb && tmb > 0
              ? `TMB: ${Math.round(tmb).toLocaleString('pt-BR')} kcal`
              : 'TMB × 1,27 × FL × FT'}
          </div>
        </div>

        {/* Resumo Vazão Enteral - Padronizado Fundo Branco/Translúcido com Tom Azul Vibrante (blue-600) */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-slate-200/70 shadow-2xs hover:border-blue-400 transition group">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Vazão de Infusão
            </span>
            <Droplets className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-800">
            {vazao && vazao > 0 ? (
              <span className="text-blue-600">
                {vazao.toFixed(1).replace('.', ',')}{' '}
                <span className="text-xs font-bold text-slate-500">ml/h</span>
              </span>
            ) : (
              <span className="text-slate-300 text-sm font-medium">--</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {vazao && vazao > 0 ? 'Taxa contínua 24h' : 'GET / 24'}
          </div>
        </div>
      </div>

      {/* 3. Corpo Principal com Cards das Calculadoras Clínicas (Harmonização & Simetria 3 Colunas) */}
      {(() => {
        const card1 = (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:border-teal-200 transition h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-slate-100 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                      Antropometria (Acamados)
                      <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded-md border border-teal-200/60">
                        Restritos ao Leito
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      Estimativa de Altura e Peso integradas à TMB
                    </p>
                  </div>
                </div>
              </div>

              {/* Seletor de Sexo */}
              <div className="mb-2.5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Sexo Biológico
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateData({ sexo: 'M' })}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      data.sexo === 'M'
                        ? 'bg-white text-teal-700 shadow-2xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Masculino</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateData({ sexo: 'F' })}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      data.sexo === 'F'
                        ? 'bg-white text-teal-700 shadow-2xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Feminino</span>
                  </button>
                </div>
              </div>

              {/* Parâmetros de Entrada - 3 Colunas Lado a Lado */}
              <div className="grid grid-cols-3 gap-2 mb-2.5">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1 truncate" title="Idade (anos)">
                    Idade <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={data.idade}
                      onChange={(e) => updateData({ idade: e.target.value })}
                      placeholder="Ex: 65"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition"
                    />
                    <span className="absolute right-2 top-2 sm:top-2.5 text-[10px] sm:text-[11px] font-bold text-slate-400 pointer-events-none">
                      anos
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1 truncate" title="Altura do Joelho (AJ)">
                    AJ (cm) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.alturaJoelho}
                      onChange={(e) => updateData({ alturaJoelho: e.target.value })}
                      placeholder="Ex: 52"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition"
                    />
                    <span className="absolute right-2 top-2 sm:top-2.5 text-[10px] sm:text-[11px] font-bold text-slate-400 pointer-events-none">
                      cm
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1 truncate" title="Circunferência do Braço (CB)">
                    CB (cm) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.circunferenciaBraco}
                      onChange={(e) => updateData({ circunferenciaBraco: e.target.value })}
                      placeholder="Ex: 28"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition"
                    />
                    <span className="absolute right-2 top-2 sm:top-2.5 text-[10px] sm:text-[11px] font-bold text-slate-400 pointer-events-none">
                      cm
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultados da Antropometria: Cards de Destaque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 mt-2">
              {/* Altura Estimada */}
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-2.5 sm:p-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-teal-900 flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-teal-600" />
                    Estimativa de Altura
                  </span>
                  <span className="text-[9px] font-mono text-teal-700 bg-white/80 px-1.5 py-0.2 rounded border border-teal-200/50">
                    Item 1
                  </span>
                </div>

                <div className="mt-0.5">
                  {alturaEstimada && alturaEstimada > 0 ? (
                    <div>
                      <div className="text-base sm:text-lg font-black text-teal-950">
                        {alturaEstimada.toFixed(1).replace('.', ',')}{' '}
                        <span className="text-xs font-bold text-teal-700">cm</span>
                      </div>
                      <div className="text-[11px] font-bold text-teal-700/90">
                        ({(alturaEstimada / 100).toFixed(2).replace('.', ',')} m)
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-400 py-0.5">
                      Preencha AJ e Idade
                    </div>
                  )}
                </div>

                <div className="mt-1.5 text-[9px] sm:text-[10px] text-teal-800/80 leading-relaxed font-mono">
                  {data.sexo === 'M'
                    ? '70 + (2,04 × AJ) - (0,04 × I)'
                    : '84,88 + (1,83 × AJ) - (0,24 × I)'}
                </div>
              </div>

              {/* Peso Estimado */}
              <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-xl p-2.5 sm:p-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-cyan-900 flex items-center gap-1">
                    <Weight className="w-3.5 h-3.5 text-cyan-600" />
                    Estimativa de Peso
                  </span>
                  <span className="text-[9px] font-mono text-cyan-700 bg-white/80 px-1.5 py-0.2 rounded border border-cyan-200/50">
                    Item 2
                  </span>
                </div>

                <div className="mt-0.5">
                  {pesoEstimado && pesoEstimado > 0 ? (
                    <div>
                      <div className="text-base sm:text-lg font-black text-cyan-950">
                        {pesoEstimado.toFixed(1).replace('.', ',')}{' '}
                        <span className="text-xs font-bold text-cyan-700">kg</span>
                      </div>
                      <div className="text-[11px] font-bold text-cyan-700/90">
                        Massa corporal calculada
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-400 py-0.5">
                      Preencha AJ e CB
                    </div>
                  )}
                </div>

                <div className="mt-1.5 text-[9px] sm:text-[10px] text-cyan-800/80 leading-relaxed font-mono">
                  {data.sexo === 'M'
                    ? '(AJ × 1,1) + (CB × 3,07) - 75,81'
                    : '(AJ × 1,5) + (CB × 2,58) - 84,22'}
                </div>
              </div>
            </div>
          </div>
        );

        const card2 = (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:border-amber-200 transition h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-slate-100 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                      Taxa Metabólica & GET
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200/60">
                        Harris-Benedict
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      Gasto energético basal, fatores clínicos e cálculo calórico
                    </p>
                  </div>
                </div>
              </div>

              {/* Inputs Reativos para Harris-Benedict (Peso, Altura) */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1 truncate" title="Peso para Cálculo">
                    Peso (kg) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.pesoManual !== '' ? data.pesoManual : (pesoEstimado ? pesoEstimado.toFixed(1).replace('.', ',') : '')}
                      onChange={(e) => updateData({ pesoManual: e.target.value })}
                      placeholder={pesoEstimado ? pesoEstimado.toFixed(1).replace('.', ',') : 'Ex: 67,4'}
                      className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition"
                    />
                    <span className="absolute right-2 top-2 sm:top-2.5 text-[10px] sm:text-[11px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-1 truncate" title="Altura para Cálculo">
                    Altura (cm) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={data.alturaManual !== '' ? data.alturaManual : (alturaEstimada ? alturaEstimada.toFixed(1).replace('.', ',') : '')}
                      onChange={(e) => updateData({ alturaManual: e.target.value })}
                      placeholder={alturaEstimada ? alturaEstimada.toFixed(1).replace('.', ',') : 'Ex: 173,7'}
                      className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition"
                    />
                    <span className="absolute right-2 top-2 sm:top-2.5 text-[10px] sm:text-[11px] font-bold text-slate-400 pointer-events-none">
                      cm
                    </span>
                  </div>
                </div>
              </div>

              {/* Resultado Parcial: TMB Basal */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5 sm:p-3 mb-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                    Taxa Metabólica Basal (TMB)
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-amber-700 font-mono">
                    {data.sexo === 'M'
                      ? '66,47 + (13,75×P) + (5×A) - (6,76×I)'
                      : '655,1 + (9,56×P) + (1,85×A) - (4,58×I)'}
                  </span>
                </div>
                <div className="text-right">
                  {tmb && tmb > 0 ? (
                    <div className="text-base sm:text-lg font-black text-amber-900">
                      {Math.round(tmb).toLocaleString('pt-BR')}{' '}
                      <span className="text-xs font-bold text-amber-700">kcal/dia</span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Aguardando dados</span>
                  )}
                </div>
              </div>

              {/* CUSTOM PICKERS GLOBAIS CENTRALIZADOS: FL e FT */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Fatores de Correção Clínica</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    GET = TMB × 1,27 × FL × FT
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {/* Trigger Picker Fator Lesão (FL) */}
                  <button
                    type="button"
                    onClick={() => setShowFlModal(true)}
                    className="w-full text-left p-2 sm:p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/50 hover:bg-white transition cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Fator Lesão (FL)
                      </span>
                      <span className="text-xs font-black text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                        {data.fatorLesao.toFixed(1).replace('.', ',')}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                      <span className="truncate">{selectedFlItem?.label}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0 ml-1" />
                    </div>
                  </button>

                  {/* Trigger Picker Fator Térmico (FT) */}
                  <button
                    type="button"
                    onClick={() => setShowFtModal(true)}
                    className="w-full text-left p-2 sm:p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/50 hover:bg-white transition cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Fator Térmico (FT)
                      </span>
                      <span className="text-xs font-black text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                        {data.fatorTermico.toFixed(1).replace('.', ',')}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                      <span className="truncate">{selectedFtItem?.label}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0 ml-1" />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Resultado GET: Gasto Energético Total com Hover Border tom âmbar/ouro e fundo harmonizado simétrico à TMB */}
            <div className="mt-2.5 bg-amber-50/60 dark:bg-amber-950/20 backdrop-blur-md rounded-xl p-2.5 sm:p-3 border border-amber-200/80 dark:border-amber-500/30 shadow-2xs hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-amber-500/10 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Gasto Energético Total (GET)
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                    TMB × 1,27 × {data.fatorLesao.toFixed(1).replace('.', ',')} × {data.fatorTermico.toFixed(1).replace('.', ',')}
                  </span>
                </div>
                <div className="text-right">
                  {get && get > 0 ? (
                    <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300">
                      {Math.round(get).toLocaleString('pt-BR')}{' '}
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">kcal/dia</span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      Aguardando TMB
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

        const card3 = (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:border-blue-300 transition h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-slate-100 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    3
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                      Taxa de Administração & Vazão
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded-md border border-blue-200/60">
                        Enteral / 24h
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      Velocidade de infusão contínua em bomba
                    </p>
                  </div>
                </div>
              </div>

              {/* Destaque da Vazão - Tom Azul Vibrante (blue-600) e Layout Lado a Lado Compacto */}
              <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/90 dark:border-blue-800/60 rounded-2xl p-3 sm:p-3.5 relative overflow-hidden">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1 truncate">
                      <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      Vazão Horária
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                      {vazao && vazao > 0 ? (
                        <span>
                          {vazao.toFixed(1).replace('.', ',')}{' '}
                          <span className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300">
                            ml/h
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm text-slate-400 font-medium">
                          Calcule o GET
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-blue-600/80 font-mono truncate">
                      Fórmula: GET ÷ 24h
                    </div>
                  </div>

                  {vazao && vazao > 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800 rounded-xl p-2 sm:p-2.5 text-right shrink-0 shadow-2xs">
                      <div className="text-[9px] sm:text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold truncate">
                        Volume Total 24h
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                        {Math.round(vazao * 24).toLocaleString('pt-BR')} ml
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-500 truncate">
                        Dieta normocalórica
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/80 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900 rounded-xl p-2 sm:p-2.5 text-right shrink-0">
                      <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold truncate">
                        Volume Total
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-slate-400 truncate">
                        -- ml/dia
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-400 truncate">
                        Normocalórica
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Distribuição por Fracionamento */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                Sugestão de Programação em Bomba de Infusão:
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200/60">
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Em 12 Horas</div>
                  <div className="text-xs font-extrabold text-slate-800">
                    {vazao && vazao > 0 ? `${Math.round(vazao * 12)} ml` : '--'}
                  </div>
                </div>
                <div className="bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200/60">
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase">Em 18 Horas</div>
                  <div className="text-xs font-extrabold text-slate-800">
                    {vazao && vazao > 0 ? `${Math.round(vazao * 18)} ml` : '--'}
                  </div>
                </div>
                <div className="bg-blue-50 p-1.5 sm:p-2 rounded-xl border border-blue-200/60">
                  <div className="text-[9px] sm:text-[10px] font-bold text-blue-700 uppercase">Em 24 Horas</div>
                  <div className="text-xs font-extrabold text-blue-900">
                    {vazao && vazao > 0 ? `${Math.round(vazao * 24)} ml` : '--'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        if (activeTab === 'all') {
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
              <div className="h-full">{card1}</div>
              <div className="h-full">{card2}</div>
              <div className="h-full">{card3}</div>
            </div>
          );
        }

        if (activeTab === 'antropometria') {
          return <div className="max-w-3xl mx-auto w-full">{card1}</div>;
        }

        if (activeTab === 'tmb-get') {
          return <div className="max-w-3xl mx-auto w-full">{card2}</div>;
        }

        if (activeTab === 'vazao') {
          return <div className="max-w-3xl mx-auto w-full">{card3}</div>;
        }

        return null;
      })()}

      {/* 4. Barra Inferior de Usabilidade */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">
            Todos os cálculos clínicos operam em cadeia e reagem instantaneamente às suas alterações.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopySummary}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Copiar Resumo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL CENTRALIZADO GLOBAL: FATOR LESÃO (FL)           */}
      {/* Padrão NutriClinical com createPortal + dark backdrop blur  */}
      {/* ======================================================== */}
      {showFlModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowFlModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[440px] max-w-full bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-4 sm:p-6 animate-in zoom-in-95 fade-in duration-200 ease-out select-none"
            >
              {/* Header do Modal */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                    FL
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight">
                      Selecionar Fator Lesão (FL)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Multiplicador do estresse metabólico patológico
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFlModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lista de Opções de FL */}
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {FATOR_LESAO_OPTIONS.map((item) => {
                  const isSelected = data.fatorLesao === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        updateData({ fatorLesao: item.value });
                        setShowFlModal(false);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/70 shadow-xs ring-2 ring-teal-500/20'
                          : 'border-slate-200/80 hover:border-teal-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-extrabold ${
                              isSelected ? 'text-teal-950' : 'text-slate-800'
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-mono font-black px-2.5 py-1 rounded-xl ${
                            isSelected
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.value.toFixed(1).replace('.', ',')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Rodapé do Modal */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowFlModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================== */}
      {/* 6. MODAL CENTRALIZADO GLOBAL: FATOR TÉRMICO (FT)         */}
      {/* Padrão NutriClinical com createPortal + dark backdrop blur  */}
      {/* ======================================================== */}
      {showFtModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowFtModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[440px] max-w-full bg-white/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-4 sm:p-6 animate-in zoom-in-95 fade-in duration-200 ease-out select-none"
            >
              {/* Header do Modal */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    FT
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight">
                      Selecionar Fator Térmico (FT)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Ajuste metabólico por febre e temperatura corporal
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFtModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lista de Opções de FT */}
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {FATOR_TERMICO_OPTIONS.map((item) => {
                  const isSelected = data.fatorTermico === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        updateData({ fatorTermico: item.value });
                        setShowFtModal(false);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20'
                          : 'border-slate-200/80 hover:border-amber-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-extrabold ${
                              isSelected ? 'text-amber-950' : 'text-slate-800'
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-mono font-black px-2.5 py-1 rounded-xl ${
                            isSelected
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.value.toFixed(1).replace('.', ',')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Rodapé do Modal */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowFtModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
