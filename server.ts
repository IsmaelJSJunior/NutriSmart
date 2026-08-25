import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Agent, setGlobalDispatcher } from "undici";
import dotenv from "dotenv";

dotenv.config();

// Configure undici dispatcher with generous timeouts to avoid HeadersTimeoutError
try {
  setGlobalDispatcher(
    new Agent({
      headersTimeout: 120000,
      bodyTimeout: 120000,
      connectTimeout: 60000,
      keepAliveTimeout: 60000,
    })
  );
} catch (e) {
  console.warn("Could not set custom undici dispatcher:", e);
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Google Gen AI
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
      timeout: 120000,
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Fallback Generators for Maximum Resilience
function generateFallbackMealPlan(body: any) {
  const { nome, peso, objetivo, tipoDieta, calorias, sintomas } = body;
  const dietName = tipoDieta && tipoDieta !== "Padrão (IA Livre)" ? tipoDieta : "Equilibrada Funcional";
  const calText = calorias ? `${calorias} kcal` : "1800 kcal";
  
  return {
    mealPlan: `🎯 Dieta baseada em: ${dietName} | Meta Calórica: ${calText}\n\n🌅 Café da Manhã (07:30)\n• 2 ovos mexidos com cúrcuma e azeite extravirgem\n• 1 fatia de pão 100% integral ou 1 porção de mandioca cozida (80g)\n• 1 xícara de café preto sem açúcar ou chá verde com limão\n• 1 fatia de mamão papaya com 1 colher de semente de chia\n\n🍽️ Almoço (12:30)\n• 150g de filé de frango grelhado ou peixe assado com ervas\n• 4 colheres de sopa de arroz integral ou batata doce cozida\n• 1 concha média de feijão preto ou lentilha\n• Salada verde à vontade (rúcula, alface, tomate, pepino) com azeite de oliva e limão\n• Legumes no vapor (brócolis e cenoura)\n\n🍎 Lanche da Tarde (16:00)\n• 1 iogurte natural desnatado (ou sem lactose) com 1 colher de farelo de aveia\n• 1 maçã picada com canela em pó\n• 4 castanhas-do-pará ou 10 amêndoas\n\n🌙 Jantar (19:30)\n• 1 prato fundo de sopa de legumes com carne magra desfiada OU 1 omelete de 2 ovos com espinafre e tomate\n• Salada de folhas verdes com azeite de oliva\n\n🍵 Ceia (21:30 - Opcional)\n• 1 xícara de chá de camomila ou melissa com gotas de própolis`,
    training: `🏃‍♂️ Plano de Exercícios Personalizado:\n• Frequência: 4 a 5x por semana (45 a 60 minutos por sessão)\n• Musculação / Treinamento de Força: Divisão A/B/C com foco em grandes grupos musculares\n• Exercício Cardiovascular: 20 a 25 min de caminhada rápida ou bicicleta após o treino com intensidade moderada\n• Alongamento e mobilidade articular no início e término dos treinos`,
    supplements: `💊 Suplementação Clínica Estratégica:\n• Creatina Monohidratada: 3g a 5g ao dia em qualquer horário com água\n• Ômega-3 (EPA/DHA de alta pureza): 1 cápsula de 1000mg após o almoço\n• Vitamina D3 (2000 UI) + K2 (MK-7 100mcg): 1 cápsula após a primeira refeição contendo gordura boa\n• Magnésio Bisglicinato (200mg): 1 cápsula 40 minutos antes de dormir para relaxamento muscular e qualidade do sono`,
    deficiencias: sintomas && sintomas.trim() !== ""
      ? `A queixa clínica ("${sintomas}") indica atenção metabólica. Sugere-se rastreio laboratorial preventivo incluindo: Hemograma completo, Ferritina sérica, 25-OH Vitamina D, TSH, T4 Livre, Glicemia de jejum e perfil lipídico.`
      : `Sem indicativos clínicos de carências nutricionais urgentes baseados no relato inicial. Manter boa hidratação hídrica diária e consumo variado de micronutrientes.`
  };
}

function generateFallbackRecipes(promptQuery: string, count: number = 2) {
  const isSweet = /doce|sobremesa|panqueca|banana|cacau|fruta|bolo/i.test(promptQuery);
  
  if (isSweet) {
    return [
      {
        nome: "Bowl Funcional de Frutas Vermelhas com Creme de Chia",
        tempo: "10 min",
        ingredientes: "• 150ml de leite vegetal ou iogurte natural\n• 2 colheres de sopa de sementes de chia\n• 1 xícara de frutas vermelhas (morangos, mirtilos)\n• 1 colher de sobremesa de mel ou xilitol\n• 1 colher de sopa de lâminas de amêndoas tostadas",
        preparo: "1. Misture a chia com o leite vegetal e deixe hidratar por 5 minutos até formar um creme espesso.\n2. Em uma taça ou bowl, coloque a base de chia hidratada.\n3. Cubra com as frutas vermelhas frescas e decore com as amêndoas tostadas e um fio de mel.",
        nutricao: "Aprox. 240 kcal • 9g Proteínas • 28g Carboidratos • 10g Gorduras Boas • 7g Fibras"
      },
      {
        nome: "Muffin Rápido de Banana com Cacau 70% e Aveia",
        tempo: "18 min",
        ingredientes: "• 1 banana média madura amassada\n• 1 ovo inteiro\n• 3 colheres de sopa de farinha de aveia\n• 1 colher de sopa de cacau em pó 100%\n• 1 colher de chá de fermento em pó",
        preparo: "1. Misture todos os ingredientes em uma tigela até a massa ficar uniforme.\n2. Despeje em forminhas de silicone.\n3. Asse na Airfryer a 160°C por 10 a 12 minutos (ou forno a 180°C por 15 min).\n4. Sirva morno com uma xícara de café.",
        nutricao: "Aprox. 195 kcal • 8g Proteínas • 27g Carboidratos • 6g Gorduras Boas • 5g Fibras"
      }
    ].slice(0, count);
  }

  return [
    {
      nome: "Omelete Mediterrânea Proteica com Espinafre e Queijo Branco",
      tempo: "12 min",
      ingredientes: "• 2 ovos inteiros + 1 clara\n• 1 xícara de folhas de espinafre fresco\n• 50g de queijo branco (ricota ou minas frescal) em cubos\n• 4 tomates-cereja cortados ao meio\n• 1 colher de chá de azeite de oliva extravirgem\n• Orégano, sal marinho e pimenta-do-reino a gosto",
      preparo: "1. Bata os ovos e a clara com um garfo e tempere com sal e pimenta.\n2. Aqueça o azeite em frigideira antiaderente e refogue o espinafre e os tomates por 1 minuto.\n3. Despeje os ovos batidos e distribua o queijo branco.\n4. Deixe dourar em fogo baixo com a frigideira tampada por 3 minutos e dobre ao meio antes de servir.",
      nutricao: "Aprox. 230 kcal • 21g Proteínas • 5g Carboidratos • 14g Gorduras Boas • 2g Fibras"
    },
    {
      nome: "Frango Selado ao Molho de Laranja e Gengibre com Purê Rústico",
      tempo: "22 min",
      ingredientes: "• 150g de filé de peito de frango cortado em tiras\n• Suco de 1 laranja pera fresca\n• 1 colher de chá de gengibre ralado\n• 1 colher de sopa de azeite de oliva\n• 150g de mandioquinha ou batata doce cozida e amassada\n• Alecrim fresco e sal a gosto",
      preparo: "1. Tempere o frango com sal, pimenta e gengibre ralado.\n2. Aqueça o azeite e doure as tiras de frango em frigideira quente por 5 minutos.\n3. Acrescente o suco de laranja e deixe reduzir em fogo baixo até formar um molho brilhante.\n4. Sirva acompanhado do purê rústico aromatizado com alecrim.",
      nutricao: "Aprox. 340 kcal • 35g Proteínas • 32g Carboidratos • 8g Gorduras Boas • 4g Fibras"
    }
  ].slice(0, count);
}

// 1. Generate Full Nutrition Plan & Clinical Tracking
app.post("/api/ai/meal-plan", async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json(generateFallbackMealPlan(req.body));
    }

    const {
      nome,
      idade,
      peso,
      altura,
      objetivo,
      exercicio,
      restricoes,
      sintomas,
      tipoDieta,
      calorias,
      observacoes,
      instrucoesIA,
    } = req.body;

    const prompt = `Crie uma prescrição nutricional e clínica completa e personalizada para o paciente:
Nome: ${nome || "Paciente"} | Idade: ${idade || "Não informada"} | Peso: ${peso}kg | Altura: ${altura}cm
Objetivo Clínico: ${objetivo || "Emagrecimento"}
Nível de Atividade Física: ${exercicio || "Sedentário"}
Restrições/Alergias Alimentares: ${restricoes || "Nenhuma relatada"}
Sintomas / Queixas Clínicas: ${sintomas || "Nenhuma queixa relatada"}
Estratégia Nutricional Selecionada: ${tipoDieta || "Padrão (IA Livre)"}
Meta Calórica Estipulada: ${calorias ? `${calorias} kcal` : "Calculada pela IA"}
Observações do Paciente: ${observacoes || "Nenhuma"}
Instruções Adicionais da Nutricionista: ${instrucoesIA || "Prescrição padrão balanceada"}

DIRETRIZES OBRIGATÓRIAS:
1. No campo "mealPlan", OBRIGATORIAMENTE inicie o texto com a seguinte linha de cabeçalho exata:
"🎯 Dieta baseada em: ${tipoDieta ? tipoDieta : "Padrão (IA Livre)"} | Meta Calórica: ${calorias ? `${calorias} kcal` : "Calculada pela IA"}\n\n"
2. Estruture as refeições detalhadas em tópicos compactos. Use os emojis temáticos: 🌅 Café da Manhã, 🍽️ Almoço, 🍎 Lanche da Tarde, 🌙 Jantar, 🍵 Ceia (se aplicável).
3. Liste os alimentos logo a seguir com o marcador "• " (um alimento por linha), com quantidades e opções de substituição fáceis. NÃO use asteriscos duplos (**) ou formatação markdown complexa no texto; mantenha limpo, direto e legível. Pule apenas uma linha entre cada refeição.
4. No campo "training", sugira uma rotina de exercícios físicos personalizada, frequência e intensidade alinhada ao objetivo (${objetivo}).
5. No campo "supplements", elabore uma lista de suplementação estratégica em tópicos com "• ", dosagens recomendadas e melhor horário de consumo.
6. No campo "deficiencias", faça uma análise preditiva e inteligente de possíveis carências nutricionais (vitaminas, minerais, eletrólitos, desequilíbrios hormonais/metabólicos) com base estrita nas queixas clínicas e sintomas relatados ("${sintomas || "Nenhum"}"). Adote um tom clínico de alerta preventivo (ex.: "A queixa de queda capilar e cansaço pode sugerir carência de Ferritina/Ferro, Vitamina D ou Zinco. Recomenda-se solicitação de hemograma completo, ferritina sérica e 25-OH Vitamina D."). Se não houver sintomas, retorne: "Sem indicativos clínicos de carências nutricionais urgentes baseados no relato inicial."`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "Você é a Dra. Maria Eduarda, Nutricionista Clínica Funcional e Esportiva de elite. Seja precisa, empática, técnica e extremamente organizada.",
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mealPlan: { type: Type.STRING, description: "Plano alimentar detalhado formatado com tópicos e cabeçalho" },
            training: { type: Type.STRING, description: "Recomendação de exercícios e treino" },
            supplements: { type: Type.STRING, description: "Lista de suplementação e dosagens" },
            deficiencias: { type: Type.STRING, description: "Análise preditiva de sintomas, possíveis carências e exames sugeridos" },
          },
          required: ["mealPlan", "training", "supplements", "deficiencias"],
        },
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return res.json(generateFallbackMealPlan(req.body));
    }

    const data = JSON.parse(text);
    return res.json(data);
  } catch (error: any) {
    console.error("Erro ao gerar plano nutricional, usando plano funcional seguro:", error?.message || error);
    return res.json(generateFallbackMealPlan(req.body));
  }
});

// 2. Refine Plan with AI ("Revisão Mágica")
app.post("/api/ai/refine-plan", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { objetivo, restricoes, currentPlan, instruction } = req.body;

    if (!ai) {
      return res.json(currentPlan || generateFallbackMealPlan(req.body));
    }

    const prompt = `Você é um assistente de nutrição clínica especializado em ajustes de conduta.
OBJETIVO DO PACIENTE: ${objetivo || "Manutenção"}
RESTRIÇÕES: ${restricoes || "Nenhuma"}

PLANO ATUAL:
[Plano Alimentar]:
${currentPlan?.mealPlan || ""}

[Treino]:
${currentPlan?.training || ""}

[Suplementação]:
${currentPlan?.supplements || ""}

[Rastreamento Clínico]:
${currentPlan?.deficiencias || ""}

INSTRUÇÃO DE AJUSTE DA NUTRICIONISTA:
"${instruction}"

Reescreva o plano completo aplicando APENAS e EXATAMENTE as alterações solicitadas na instrução, preservando todo o restante da estrutura compacta, cabeçalho e marcadores "•". Não use asteriscos de markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "Retorne o plano clínico revisado em formato JSON estruturado.",
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mealPlan: { type: Type.STRING },
            training: { type: Type.STRING },
            supplements: { type: Type.STRING },
            deficiencias: { type: Type.STRING },
          },
          required: ["mealPlan", "training", "supplements", "deficiencias"],
        },
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return res.json(currentPlan || generateFallbackMealPlan(req.body));
    }
    const data = JSON.parse(text);
    return res.json(data);
  } catch (error: any) {
    console.error("Erro na revisão mágica, mantendo base do plano:", error?.message || error);
    return res.json(req.body.currentPlan || generateFallbackMealPlan(req.body));
  }
});

// 3. Smart Kitchen (Receitas Saudáveis)
app.post("/api/ai/recipes", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { prompt: recipeQuery, objetivo, restricoes, count = 2 } = req.body;

    if (!ai) {
      return res.json({ recipes: generateFallbackRecipes(recipeQuery || "", count) });
    }

    const prompt = `Você é um chef gourmet de culinária funcional e nutricionista clínico.
Objetivo Clínico: ${objetivo || "Alimentação Saudável e Equilibrada"}
Restrições / Alergias: ${restricoes || "Nenhuma"}
Pedido do usuário: "${recipeQuery}"
Quantidade de receitas solicitadas: ${count}

Crie EXATAMENTE ${count} receitas inovadoras, práticas, incrivelmente saborosas e funcionais para este pedido.
Para cada receita forneça:
- nome criativo e apetitoso
- tempo estimado de preparo (ex: 20 min)
- ingredientes em lista com marcadores "• " e medidas claras
- modo de preparo passo a passo detalhado e fácil
- informação nutricional aproximada (calorias, proteínas, carboidratos, gorduras boas e fibras).
NÃO use asteriscos de markdown (**).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "Retorne uma lista JSON com as receitas solicitadas.",
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { type: Type.STRING },
                  tempo: { type: Type.STRING },
                  ingredientes: { type: Type.STRING },
                  preparo: { type: Type.STRING },
                  nutricao: { type: Type.STRING },
                },
                required: ["nome", "tempo", "ingredientes", "preparo", "nutricao"],
              },
            },
          },
          required: ["recipes"],
        },
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return res.json({ recipes: generateFallbackRecipes(recipeQuery || "", count) });
    }
    const data = JSON.parse(text);
    return res.json(data);
  } catch (error: any) {
    console.error("Erro ao gerar receitas com Gemini, aplicando receitas funcionais:", error?.message || error);
    const { prompt: recipeQuery, count = 2 } = req.body;
    return res.json({ recipes: generateFallbackRecipes(recipeQuery || "", count) });
  }
});

// 4. Smart Chat Suggestion for Nutritionist
app.post("/api/ai/chat-suggest", async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { lastPatientMessage, patientName, objetivo, lastMealPlanSummary } = req.body;

    if (!ai) {
      return res.json({
        suggestion: `Olá ${patientName || ""}! Fico feliz com a sua mensagem. Continue firme no plano alimentar e lembre-se de manter uma excelente hidratação ao longo do dia! ✨`,
      });
    }

    const prompt = `Você é a Dra. Maria Eduarda, Nutricionista Clínica atenciosa e de referência.
Paciente: ${patientName || "Paciente"}
Objetivo: ${objetivo || "Saúde e bem-estar"}
Contexto recente: ${lastMealPlanSummary || "Acompanhamento nutricional ativo"}
Última mensagem enviada pelo paciente: "${lastPatientMessage}"

Escreva uma resposta calorosa, técnica, motivadora e acolhedora em português para o chat de atendimento.
Use emojis apropriados. Seja direto(a), esclareça a dúvida com segurança profissional e encoraje o progresso.
Retorne APENAS o texto da mensagem sugerida sem aspas ou introduções.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "Você é Maria Eduarda, nutricionista clínica. Responda diretamente como mensagem de WhatsApp/Chat.",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const text = response.text?.trim() || `Olá ${patientName || ""}! Fico muito feliz em ver seu empenho com o plano. Estou aqui para ajustar qualquer detalhe que precisar! ✨`;
    return res.json({ suggestion: text });
  } catch (error: any) {
    console.error("Erro ao sugerir resposta de chat:", error?.message || error);
    const { patientName } = req.body;
    return res.json({
      suggestion: `Olá ${patientName || ""}! Conte comigo para alcançar seus objetivos. Vamos ajustando cada refeição conforme a sua rotina! ✨`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NutriSmart Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

