import React, { useState } from 'react';
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
  Heart,
} from 'lucide-react';
import { RecipeItem } from '../types';
import { requestRecipesAI } from '../services/ai';
import { BlockCopyButton } from './BlockCopyButton';

interface SmartKitchenViewProps {
  onBack: () => void;
  patientGoal?: string;
  patientRestrictions?: string;
}

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
}) => {
  const [query, setQuery] = useState('');
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

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const handleGenerate = async (searchPrompt?: string) => {
    const promptToUse = searchPrompt || query;
    if (!promptToUse.trim()) return;

    setLoading(true);
    setFeedbackNotice(null);
    try {
      const generated = await requestRecipesAI(
        promptToUse,
        patientGoal || 'Alimentação Saudável e Funcional',
        patientRestrictions || 'Nenhuma',
        2
      );
      if (generated && generated.length > 0) {
        setRecipes(generated);
      }
    } catch (err) {
      console.error('Erro ao gerar receitas:', err);
      setFeedbackNotice('Não foi possível conectar à IA no momento, mas preparamos receitas funcionais para você.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExtra = async () => {
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
      }
    } catch (err) {
      console.error('Erro ao gerar receita extra:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Painel
        </button>

        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          Laboratório Gastronômico por IA
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-3 backdrop-blur">
            <ChefHat className="w-4 h-4" />
            Cozinha Inteligente NutriSmart
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Laboratório Culinário & Receitas Funcionais
          </h1>
          <p className="text-amber-100 text-sm mt-1 leading-relaxed">
            Gere pratos saudáveis, práticos e deliciosos adaptados ao seu objetivo clínico, restrições e ingredientes disponíveis com inteligência artificial.
          </p>
        </div>
      </div>

      {/* Prompt Search Box & Suggestions */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="O que você gostaria de cozinhar hoje? (Ex: lanche proteico com frango desfiado)"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando Receitas...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar com IA
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
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 hover:border-amber-200 text-slate-600 transition"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipes Output Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recipes.map((recipe, index) => (
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

                <BlockCopyButton
                  title={recipe.nome}
                  content={`*TEMPO:* ${recipe.tempo}\n\n*INGREDIENTES:*\n${recipe.ingredientes}\n\n*PREPARO:*\n${recipe.preparo}\n\n*VALOR NUTRICIONAL:*\n${recipe.nutricao}`}
                />
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

      {/* Extra Recipe Generator Button */}
      <div className="text-center pt-2">
        <button
          onClick={handleGenerateExtra}
          disabled={loadingMore}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 text-slate-700 font-extrabold text-xs shadow-sm hover:shadow transition active:scale-95 disabled:opacity-50"
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
    </div>
  );
};
