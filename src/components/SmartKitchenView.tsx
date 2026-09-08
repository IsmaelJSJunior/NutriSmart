import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Sparkles,
  ArrowLeft,
  Clock,
  Flame,
  Plus,
  Copy,
  Check,
  ChefHat,
  Search,
  Loader2,
  Bookmark,
  Trash2,
  Utensils,
} from 'lucide-react';
import { RecipeItem } from '../types';
import { requestRecipesAI } from '../services/ai';
import { dataStore, getPatientRecipeQuota, incrementPatientRecipeQuota } from '../services/storage';
import { BlockCopyButton } from './BlockCopyButton';

interface SmartKitchenViewProps {
  onBack: () => void;
  patientGoal?: string;
  patientRestrictions?: string;
  isPatientPortal?: boolean;
  patientCode?: string;
}

const SAVED_RECIPES_KEY = 'nutrismart_saved_recipes_v1';

const QUICK_PROMPTS = [
  'Café da manhã rico em proteínas e sem lactose',
  'Jantar low carb rápido em menos de 20 minutos',
  'Sobremesa saudável funcional sem açúcar',
  'Lanche da tarde prático para levar ao trabalho',
  'Almoço pós-treino para hipertrofia com frango e batata doce',
  'Opção vegetariana balanceada com alto teor de ferro',
];

export const SmartKitchenView: React.FC<SmartKitchenViewProps> = ({
  onBack,
  patientGoal,
  patientRestrictions,
  isPatientPortal = false,
  patientCode,
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'saved'>('generator');
  const [query, setQuery] = useState('');
  const [quota, setQuota] = useState(() =>
    isPatientPortal ? getPatientRecipeQuota(patientCode) : null
  );

  useEffect(() => {
    if (isPatientPortal) {
      setQuota(getPatientRecipeQuota(patientCode));
    }
  }, [isPatientPortal, patientCode]);

  const remainingQuota = quota ? Math.max(0, 4 - quota.recipesGeneratedToday) : 4;
  const isQuotaExhausted = isPatientPortal && remainingQuota <= 0;
  const [recipes, setRecipes] = useState<RecipeItem[]>([
    {
      nome: 'Panqueca Funcional de Aveia, Banana e Canela',
      tempo: '15 min',
      ingredientes:
        '• 1 banana média madura amassada\n• 2 ovos inteiros\n• 2 colheres de sopa de farelo de aveia\n• 1 colher de chá de sementes de chia\n• 1 pitada de canela em pó\n• 1 colher de café de óleo de coco para untar',
      preparo:
        '1. Em uma tigela, amasse a banana e misture os ovos com auxílio de um garfo.\n2. Adicione o farelo de aveia, a chia e a canela até obter uma massa homogênea.\n3. Aqueça uma frigideira antiaderente untada em fogo baixo.\n4. Despeje a massa e doure por 2 minutos de cada lado.',
      nutricao: 'Aprox. 280 kcal • 14g Proteínas • 32g Carboidratos • 10g Gorduras Boas • 6g Fibras',
    },
    {
      nome: 'Salmão Grelhado em Crosta de Ervas com Purê de Couve-Flor',
      tempo: '25 min',
      ingredientes:
        '• 160g de filé de salmão fresco\n• 200g de couve-flor cozida ao vapor\n• 1 dente de alho picado\n• 1 colher de sobremesa de azeite de oliva extravirgem\n• Alecrim, tomilho e orégano frescos a gosto\n• Sal marinho e pimenta-do-reino a gosto',
      preparo:
        '1. Processe ou amasse a couve-flor cozida com o alho, 1 colher de azeite e sal até obter consistência de purê aveludado.\n2. Tempere o salmão com sal, pimenta e as ervas frescas picadas.\n3. Sele o salmão em frigideira quente por 3 a 4 minutos de cada lado até ficar suculento.\n4. Sirva o peixe sobre a cama de purê de couve-flor.',
      nutricao: 'Aprox. 360 kcal • 34g Proteínas • 8g Carboidratos • 18g Gorduras Boas • 5g Fibras',
    },
  ]);

  const [savedRecipes, setSavedRecipes] = useState<RecipeItem[]>(() => dataStore.getRecipes());

  useEffect(() => {
    const unsub = dataStore.subscribeRecipes((items) => {
      setSavedRecipes(items);
    });
    return () => unsub();
  }, []);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const isSaved = (recipeName: string) => {
    return savedRecipes.some(
      (r) => r.nome.trim().toLowerCase() === recipeName.trim().toLowerCase()
    );
  };

  const handleToggleSave = async (recipe: RecipeItem) => {
    if (isSaved(recipe.nome)) {
      await dataStore.deleteRecipe(recipe.nome);
    } else {
      await dataStore.saveRecipe(recipe);
    }
  };

  const handleGenerate = async (searchPrompt?: string) => {
    const promptToUse = searchPrompt || query;
    if (!promptToUse.trim()) return;

    if (isQuotaExhausted) {
      setFeedbackNotice('Você atingiu o limite de 4 receitas geradas por hoje. Volte amanhã para novas receitas ou consulte suas receitas salvas!');
      return;
    }

    const countToRequest = isPatientPortal ? Math.min(2, remainingQuota) : 2;

    setLoading(true);
    setFeedbackNotice(null);
    try {
      const generated = await requestRecipesAI(
        promptToUse,
        patientGoal || 'Alimentação Saudável e Funcional',
        patientRestrictions || 'Nenhuma',
        countToRequest
      );
      if (generated && generated.length > 0) {
        setRecipes(generated);
        if (isPatientPortal) {
          const updated = incrementPatientRecipeQuota(patientCode, generated.length);
          setQuota(updated);
        }
      }
    } catch (err) {
      console.error('Erro ao gerar receitas:', err);
      setFeedbackNotice('Não foi possível conectar à IA no momento, mas preparamos receitas funcionais para você.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExtra = async () => {
    if (isQuotaExhausted) {
      setFeedbackNotice('Você atingiu o limite de 4 receitas geradas por hoje. Volte amanhã para novas receitas ou consulte suas receitas salvas!');
      return;
    }

    setLoadingMore(true);
    setFeedbackNotice(null);
    try {
      const promptToUse = query.trim() || 'Receita adicional criativa e equilibrada';
      const extra = await requestRecipesAI(
        promptToUse,
        patientGoal || 'Alimentação Saudável',
        patientRestrictions || 'Nenhuma',
        1
      );
      if (extra && extra.length > 0) {
        setRecipes((prev) => [...prev, ...extra]);
        if (isPatientPortal) {
          const updated = incrementPatientRecipeQuota(patientCode, extra.length);
          setQuota(updated);
        }
      }
    } catch (err) {
      console.error('Erro ao gerar receita extra:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
      {/* Top Subheader - Standardized Design System with Integrated Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-amber-100/90 shadow-2xs gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-100/90 text-amber-700 flex items-center justify-center shadow-2xs border border-amber-200/60 shrink-0">
            <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">Cozinha Inteligente</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
              Pratos saudáveis adaptados ao objetivo clínico e restrições
            </p>
          </div>
        </div>

        {/* Integrated Navigation Tabs: Gerador vs Receitas Salvas */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-2xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-white text-amber-800 shadow-2xs border border-amber-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-amber-600" />
            <span>Gerador</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-white text-rose-700 shadow-2xs border border-rose-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${activeTab === 'saved' ? 'text-rose-600 fill-rose-600' : 'text-slate-500'}`} />
            <span>Receitas Salvas</span>
            {savedRecipes.length > 0 && (
              <span className="ml-0.5 text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                {savedRecipes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Patient Quota Indicator */}
      {isPatientPortal && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-sky-50/90 border border-sky-200/90 rounded-2xl px-3.5 py-2 text-xs font-semibold text-sky-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              {isQuotaExhausted
                ? 'Limite diário de 4 receitas atingido para hoje. Volte amanhã ou explore suas receitas salvas!'
                : 'Cozinha Inteligente com IA personalizada'}
            </span>
          </div>
          <span
            className={`self-start sm:self-auto px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
              isQuotaExhausted
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-white text-sky-700 border-sky-200 shadow-2xs'
            }`}
          >
            Receitas diárias restantes: {remainingQuota}/4
          </span>
        </div>
      )}

      {/* Feedback Notice */}
      {feedbackNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* TAB 1: GERADOR COM IA */}
      {activeTab === 'generator' && (
        <>
          {/* Prompt Search Box & Suggestions */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerate();
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  disabled={isQuotaExhausted}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    isQuotaExhausted
                      ? 'Limite diário atingido (4/4). Volte amanhã!'
                      : 'O que você gostaria de cozinhar hoje?'
                  }
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim() || isQuotaExhausted}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-xs sm:text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 transition active:scale-95 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                title={isQuotaExhausted ? 'Limite diário de 4 receitas atingido' : 'Gerar receitas com IA'}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando Receitas...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar
                  </>
                )}
              </button>
            </form>

            {/* Quick Suggestion Chips */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Sugestões Rápidas:
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setQuery(p);
                      handleGenerate(p);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-slate-600 transition cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipes Output Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recipes.map((recipe, index) => {
              const saved = isSaved(recipe.nome);
              return (
                <div
                  key={index}
                  className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-md hover:shadow-lg transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shadow-xs shrink-0">
                          <UtensilsCrossed className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base leading-tight">
                            {recipe.nome}
                          </h3>
                          <span className="text-xs font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            {recipe.tempo}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSave(recipe)}
                          className={`p-2 rounded-xl border transition active:scale-95 cursor-pointer ${
                            saved
                              ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50'
                          }`}
                          title={saved ? 'Remover dos Favoritos' : 'Salvar Receita'}
                        >
                          <Bookmark className={`w-4 h-4 ${saved ? 'fill-rose-500 text-rose-600' : ''}`} />
                        </button>

                        <BlockCopyButton
                          title={recipe.nome}
                          content={`*TEMPO:* ${recipe.tempo}\n\n*INGREDIENTES:*\n${recipe.ingredientes}\n\n*PREPARO:*\n${recipe.preparo}\n\n*VALOR NUTRICIONAL:*\n${recipe.nutricao}`}
                        />
                      </div>
                    </div>

                    {/* Ingredientes */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Ingredientes
                      </h4>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {recipe.ingredientes}
                      </div>
                    </div>

                    {/* Modo de Preparo */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Modo de Preparo
                      </h4>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {recipe.preparo}
                      </div>
                    </div>

                    {/* Informações Nutricionais */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        Tabela Nutricional Aproximada
                      </h4>
                      <p className="text-xs font-bold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                        {recipe.nutricao}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Extra Recipe Generator Button */}
          <div className="text-center pt-2">
            <button
              onClick={handleGenerateExtra}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 text-slate-700 font-extrabold text-xs shadow-sm hover:shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Gerando receita adicional...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>Gerar mais 1 receita adicional</span>
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* TAB 2: RECEITAS SALVAS */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {savedRecipes.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-10 border border-slate-200 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-2xs">
                <Bookmark className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Nenhuma receita salva ainda</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Ao navegar pelas receitas geradas pela IA, clique no ícone de marcador para salvá-las aqui. Elas ficam salvas de forma permanente para você consultá-las e compartilhá-las a qualquer momento!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              >
                Explorar Gerador de Receitas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {savedRecipes.map((recipe, index) => (
                <div
                  key={index}
                  className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-rose-100/90 shadow-md hover:shadow-lg transition flex flex-col justify-between space-y-4 relative"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black shadow-xs shrink-0">
                          <UtensilsCrossed className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base leading-tight">
                            {recipe.nome}
                          </h3>
                          <span className="text-xs font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            {recipe.tempo}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSave(recipe)}
                          className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition active:scale-95 cursor-pointer shadow-2xs"
                          title="Remover das Receitas Salvas"
                        >
                          <Bookmark className="w-4 h-4 fill-rose-500 text-rose-600" />
                        </button>

                        <BlockCopyButton
                          title={recipe.nome}
                          content={`*TEMPO:* ${recipe.tempo}\n\n*INGREDIENTES:*\n${recipe.ingredientes}\n\n*PREPARO:*\n${recipe.preparo}\n\n*VALOR NUTRICIONAL:*\n${recipe.nutricao}`}
                        />
                      </div>
                    </div>

                    {/* Ingredientes */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Ingredientes
                      </h4>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {recipe.ingredientes}
                      </div>
                    </div>

                    {/* Modo de Preparo */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Modo de Preparo
                      </h4>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {recipe.preparo}
                      </div>
                    </div>

                    {/* Informações Nutricionais */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        Tabela Nutricional Aproximada
                      </h4>
                      <p className="text-xs font-bold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                        {recipe.nutricao}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
