import { AiNutritionPlan, PatientFormData, RecipeItem } from '../types';

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<any> {
  const delays = [800, 1500];
  
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s max timeout per attempt

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro de rede HTTP: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (i === retries - 1) {
        console.warn(`[NutriSmart AI] Falha na requisição para ${url}:`, error?.message || error);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delays[i]));
    }
  }
}

export async function requestMealPlanAI(formData: PatientFormData): Promise<AiNutritionPlan> {
  const data = await fetchWithRetry('/api/ai/meal-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  return data;
}

export async function requestRefinePlanAI(
  objetivo: string,
  restricoes: string,
  currentPlan: AiNutritionPlan,
  instruction: string
): Promise<AiNutritionPlan> {
  const data = await fetchWithRetry('/api/ai/refine-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objetivo,
      restricoes,
      currentPlan,
      instruction,
    }),
  });
  return data;
}

export async function requestRecipesAI(
  prompt: string,
  objetivo?: string,
  restricoes?: string,
  count: number = 2
): Promise<RecipeItem[]> {
  const data = await fetchWithRetry('/api/ai/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      objetivo,
      restricoes,
      count,
    }),
  });
  return data.recipes || [];
}

export async function requestChatSuggestionAI(
  lastPatientMessage: string,
  patientName: string,
  objetivo?: string,
  lastMealPlanSummary?: string
): Promise<string> {
  const data = await fetchWithRetry('/api/ai/chat-suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lastPatientMessage,
      patientName,
      objetivo,
      lastMealPlanSummary,
    }),
  });
  return data.suggestion || 'Olá! Como posso ajudar você hoje? ✨';
}
