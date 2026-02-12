import { OpenRouterModel } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export async function getAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch(`${OPENROUTER_API_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
    }));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    throw error;
  }
}

export async function chatWithModel(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<string> {
  try {
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    throw error;
  }
}

