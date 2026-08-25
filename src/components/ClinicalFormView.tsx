import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
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
  ChevronDown,
} from 'lucide-react';
import { PatientFormData, ReportRecord, AiNutritionPlan } from '../types';
import { calculateIMC, generatePatientCode } from '../lib/utils';
import { requestMealPlanAI } from '../services/ai';
import { dataStore } from '../services/storage';

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

const CALORIE_OPTIONS = [
  'Calculada pela IA',
  '1000',
  '1200',
  '1400',
  '1500',
  '1600',
  '1800',
  '2000',
  '2200',
  '2500',
  '3000',
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
    telefone: '',
    email: '',
    peso: '',
    altura: '',
    braco: '',
    peito: '',
    cintura: '',
    abdomen: '',
    quadril: '',
    coxa: '',
    panturrilha: '',
    objetivo: 'Emagrecimento',
    restricoes: '',
    sintomas: '',
    agua: '2.0',
    exercicio: 'Sedentário (Nenhum ou muito pouco)',
    observacoes: '',
    instrucoesIA: '',
    patientCode: '',
    tipoDieta: 'Padrão (IA Livre)',
    calorias: 'Calculada pela IA',
  });

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
          // keep code, clear current specific complaints if needed or retain
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
      peso: prev.peso || existing.formData.peso, // keep updated weight if typed
      altura: existing.formData.altura,
      patientCode: existing.patientCode,
      idade: existing.formData.idade,
      telefone: existing.formData.telefone,
      email: existing.formData.email,
    }));
  };

  // Live IMC calculation
  const imcResult = useMemo(() => {
    return calculateIMC(formData.peso, formData.altura);
  }, [formData.peso, formData.altura]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    };

    try {
      setLoadingStep('Analisando perfil metabólico e queixas clínicas...');
      await new Promise((r) => setTimeout(r, 600));

      setLoadingStep('Calculando macros, estratégia e carências com Gemini AI...');
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Painel
        </button>

        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Módulo de Prescrição Clínica
          </span>
        </div>
      </div>

      {/* Title Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Nova Ficha & Prescrição Inteligente</h1>
            <p className="text-xs text-slate-500 font-medium">
              Preencha os dados antropométricos e queixas para gerar um plano nutricional personalizado por IA
            </p>
          </div>
        </div>

        {/* Existing Patient Matched Banner */}
        {matchingPatient && matchingPatient.patientCode !== formData.patientCode && (
          <div className="mt-5 p-4 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-200 text-sky-800 flex items-center justify-center font-black text-xs">
                {matchingPatient.patientCode}
              </div>
              <div>
                <h4 className="text-xs font-bold text-sky-900">
                  Paciente já cadastrado: {matchingPatient.formData.nome}
                </h4>
                <p className="text-[11px] text-sky-700">
                  Deseja mesclar com o código existente para manter a linha do tempo e gráficos?
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleApplyExistingPatient(matchingPatient)}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition"
            >
              Mesclar com Código {matchingPatient.patientCode}
            </button>
          </div>
        )}
      </div>

      {/* Main Anamnese Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Dados Pessoais & Antropometria */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-800">1. Identificação & Antropometria</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Paciente *
              </label>
              <input
                type="text"
                name="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Carlos Mendes"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código do Paciente (Opcional)
              </label>
              <input
                type="text"
                name="patientCode"
                value={formData.patientCode}
                onChange={(e) => setFormData((p) => ({ ...p, patientCode: e.target.value.toUpperCase() }))}
                placeholder="Ex: CAR1"
                maxLength={6}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="paciente@email.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Peso Atual (kg) *
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">kg</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Altura (cm) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="altura"
                  required
                  value={formData.altura}
                  onChange={handleChange}
                  placeholder="Ex: 175"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">cm</span>
              </div>
            </div>
          </div>

          {/* Live IMC Widget */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-emerald-600 font-black text-sm">
                IMC
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Índice de Massa Corporal:</span>
                  <span className="text-base font-black text-slate-900">{imcResult.value}</span>
                </div>
                <span className={`text-xs font-black ${imcResult.colorClass}`}>
                  Classificação: {imcResult.classification}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 font-medium italic">
              Atualizado automaticamente com peso e altura
            </span>
          </div>

          {/* Perímetros e Circunferências */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Circunferências Corporais (cm)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Braço</span>
                <input
                  type="number"
                  step="0.1"
                  name="braco"
                  value={formData.braco}
                  onChange={handleChange}
                  placeholder="cm"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Peito</span>
                <input
                  type="number"
                  step="0.1"
                  name="peito"
                  value={formData.peito}
                  onChange={handleChange}
                  placeholder="cm"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Cintura</span>
                <input
                  type="number"
                  step="0.1"
                  name="cintura"
                  value={formData.cintura}
                  onChange={handleChange}
                  placeholder="cm"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Abdômen</span>
                <input
                  type="number"
                  step="0.1"
                  name="abdomen"
                  value={formData.abdomen}
                  onChange={handleChange}
                  placeholder="cm"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Quadril</span>
                <input
                  type="number"
                  step="0.1"
                  name="quadril"
                  value={formData.quadril}
                  onChange={handleChange}
                  placeholder="cm"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Coxa</span>
                <input
                  type="number"
                  step="0.1"
                  name="coxa"
                  value={formData.coxa}
                  onChange={handleChange}
                  placeholder="cm"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Panturrilha</span>
                <input
                  type="number"
                  step="0.1"
                  name="panturrilha"
                  value={formData.panturrilha}
                  onChange={handleChange}
                  placeholder="cm"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Hábitos, Restrições & Rastreamento Clínico */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <HeartPulse className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-extrabold text-slate-800">2. Hábitos & Rastreamento de Queixas</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Objetivo Clínico
              </label>
              <select
                name="objetivo"
                value={formData.objetivo}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Emagrecimento">Emagrecimento / Perda de Gordura</option>
                <option value="Hipertrofia">Ganho de Massa Muscular (Hipertrofia)</option>
                <option value="Definição">Definição Corporal / Recomposição</option>
                <option value="Saúde e Longevidade">Saúde Geral & Longevidade</option>
                <option value="Desempenho Esportivo">Performance Esportiva</option>
                <option value="Controle Glicêmico / Metabólico">Controle de Glicemia e Colesterol</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nível de Atividade Física
              </label>
              <select
                name="exercicio"
                value={formData.exercicio}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Sedentário (Nenhum ou muito pouco)">Sedentário (Nenhum ou muito pouco)</option>
                <option value="Leve (1 a 2 vezes por semana)">Leve (1 a 2 vezes por semana)</option>
                <option value="Moderado (3 a 4 vezes por semana)">Moderado (3 a 4 vezes por semana)</option>
                <option value="Intenso (5 a 7 vezes por semana)">Intenso (5 a 7 vezes por semana)</option>
              </select>
            </div>

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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">L/dia</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Restrições & Alergias Alimentares
              </label>
              <textarea
                name="restricoes"
                rows={2}
                value={formData.restricoes}
                onChange={handleChange}
                placeholder="Ex: Intolerância à lactose, alergia a frutos do mar, aversão a coentro..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Sintomas / Queixas Clínicas (Carências)</span>
                <span className="text-[10px] text-sky-600 font-black">Rastreamento IA</span>
              </label>
              <textarea
                name="sintomas"
                rows={2}
                value={formData.sintomas}
                onChange={handleChange}
                placeholder="Ex: Queda de cabelo intensa, fadiga pela manhã, unhas fracas, distensão abdominal..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Estratégia Dietética & Inteligência Artificial */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-emerald-200 shadow-md space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-800">3. Estratégia Dietética & Diretrizes da IA</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estratégia Nutricional Selecionada
              </label>
              <select
                name="tipoDieta"
                value={formData.tipoDieta}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {DIET_STRATEGIES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Meta Calórica Estipulada
              </label>
              <select
                name="calorias"
                value={formData.calorias}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {CALORIE_OPTIONS.map((cal) => (
                  <option key={cal} value={cal}>
                    {cal === 'Calculada pela IA' ? 'Calculada pela IA (Automática)' : `${cal} kcal`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Instruções Personalizadas da Nutricionista para a IA (Opcional)
            </label>
            <textarea
              name="instrucoesIA"
              rows={2}
              value={formData.instrucoesIA}
              onChange={handleChange}
              placeholder="Ex: Priorizar fontes vegetais de ferro, incluir sementes de abóbora no lanche, prescrever ceia calmante com chá de camomila..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações Gerais do Prontuário
            </label>
            <input
              type="text"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              placeholder="Ex: Paciente relata rotina agitada com plantões noturnos."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button & Progress */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:scale-[1.005] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{loadingStep || 'Gerando prescrição com Gemini AI...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-emerald-200" />
                <span>Gerar Plano Clínico & Prescrição Inteligente</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
