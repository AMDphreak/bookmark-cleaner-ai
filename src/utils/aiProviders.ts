import { AIProvider, AIModel } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProviderClient {
  getAvailableModels(apiKey: string): Promise<AIModel[]>;
  chat(apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string>;
}

// OpenAI
export const openaiClient: AIProviderClient = {
  async getAvailableModels(apiKey: string): Promise<AIModel[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      const currentModels = data.data
        .filter((model: any) => model.id.includes('gpt') && (model.id.includes('5') || model.id.includes('4.5') || model.id.includes('4o')))
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          provider: 'openai' as AIProvider,
        }));
      
      // Add hardcoded GPT-5 if not dynamically found, as it's a key recommendation
      const gpt5Exists = currentModels.some((model: AIModel) => model.id.includes('gpt-5'));
      if (!gpt5Exists) {
        currentModels.unshift({
          id: 'gpt-5',
          name: 'GPT-5',
          provider: 'openai' as AIProvider,
          recommended: true,
          description: 'Latest model - Advanced reasoning and multimodal capabilities',
        });
      }

      return currentModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      throw error;
    }
  },

  async chat(apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  },
};

// Claude (Anthropic)
export const claudeClient: AIProviderClient = {
  async getAvailableModels(): Promise<AIModel[]> {
    return [
      { 
        id: 'claude-sonnet-4.5-202509', 
        name: 'Claude Sonnet 4.5', 
        provider: 'claude',
        recommended: true,
        description: 'Latest model - Exceptional in software engineering and reasoning',
      },
      { 
        id: 'claude-opus-4-202509', 
        name: 'Claude Opus 4', 
        provider: 'claude',
        description: 'Most capable model for complex tasks',
      },
      { 
        id: 'claude-haiku-4-202509', 
        name: 'Claude Haiku 4', 
        provider: 'claude',
        description: 'Fastest and most affordable intelligence',
      },
    ];
  },

  async chat(apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> {
    // Convert messages format for Claude
    const claudeMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const systemMessage = messages.find(m => m.role === 'system')?.content;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2024-10-22',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 8192,
        messages: claudeMessages,
        ...(systemMessage && { system: systemMessage }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  },
};

// Grok (xAI)
export const grokClient: AIProviderClient = {
  async getAvailableModels(): Promise<AIModel[]> {
    return [
      { 
        id: 'grok-4-heavy', 
        name: 'Grok-4 Heavy', 
        provider: 'grok',
        recommended: true,
        description: 'Latest model - Fastest response times with live web data',
      },
      { 
        id: 'grok-4-fast', 
        name: 'Grok-4 Fast', 
        provider: 'grok',
        description: 'Optimized for fast reasoning',
      },
      { 
        id: 'grok-4', 
        name: 'Grok-4', 
        provider: 'grok',
        description: 'Standard version for general use',
      },
    ];
  },

  async chat(apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
      throw new Error(`Grok API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  },
};

// Gemini (Google)
export const geminiClient: AIProviderClient = {
  async getAvailableModels(): Promise<AIModel[]> {
    return [
      { 
        id: 'gemini-2.5-pro', 
        name: 'Gemini 2.5 Pro', 
        provider: 'gemini',
        recommended: true,
        description: 'Free tier available - Most advanced model with enhanced reasoning',
      },
      { 
        id: 'gemini-2.5-flash', 
        name: 'Gemini 2.5 Flash', 
        provider: 'gemini',
        recommended: true,
        description: 'Free tier available - Fast and capable',
      },
      { 
        id: 'gemini-3-pro', 
        name: 'Gemini 3 Pro (Expected Soon)', 
        provider: 'gemini',
        description: 'Next generation Pro model, expected to be available soon.',
      },
      { 
        id: 'gemini-3-flash', 
        name: 'Gemini 3 Flash (Expected Soon)', 
        provider: 'gemini',
        description: 'Next generation Flash model, expected to be available soon.',
      },
    ];
  },

  async chat(apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> {
    // Convert messages format for Gemini
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    // Use v1 API for better compatibility
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;
    
    const requestBody: any = {
      contents: geminiMessages,
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },
};

// Groq
export const groqClient: AIProviderClient = {
  async getAvailableModels(): Promise<AIModel[]> {
    return [
      { 
        id: 'llama-4-70b-versatile', 
        name: 'Llama 4 70B Versatile', 
        provider: 'groq',
        recommended: true,
        description: 'Latest Llama model - Fast inference, excellent performance',
      },
      { 
        id: 'llama-4-8b-instant', 
        name: 'Llama 4 8B Instant', 
        provider: 'groq',
        recommended: true,
        description: 'Latest Llama model - Optimized for speed',
      },
      { 
        id: 'mixtral-8x22b-32768', 
        name: 'Mixtral 8x22B', 
        provider: 'groq',
        description: 'Powerful Mixture of Experts model',
      },
      { 
        id: 'gpt-oss-120b', 
        name: 'GPT-OSS-120B (via Groq)', 
        provider: 'groq',
        recommended: true,
        description: 'State-of-the-art open-source thinking model',
      },
      { 
        id: 'kimi-k2-0905-1t-256k-groq', 
        name: 'Kimi K2-0905 1T 256K (via Groq)', 
        provider: 'groq',
        recommended: true,
        description: 'State-of-the-art open-source model with incredibly fast inference on Groq',
      },
    ];
  },

  async chat(apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  },
};

// OpenRouter (existing)
export const openRouterClient: AIProviderClient = {
  async getAvailableModels(apiKey: string): Promise<AIModel[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
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
        provider: 'openrouter' as AIProvider,
      }));
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      throw error;
    }
  },

  async chat(apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
  },
};

// Kimi (Moonshot AI)
export const kimiClient: AIProviderClient = {
  async getAvailableModels(): Promise<AIModel[]> {
    return [
      { 
        id: 'kimi-k2-0905-1t-256k', 
        name: 'Kimi K2-0905 1T 256K', 
        provider: 'kimi',
        recommended: true,
        description: 'State-of-the-art open-source model, almost as good as commercial thinking models',
      },
      { 
        id: 'kimi-k2-thinking', 
        name: 'Kimi K2 Thinking', 
        provider: 'kimi',
        description: 'Flagship thinking model',
      },
    ];
  },

  async chat(apiKey: string, modelId: string, messages: ChatMessage[]): Promise<string> {
    // Kimi API is compatible with OpenAI chat completions format
    const response = await fetch('https://api.kimi.ai/v1/chat/completions', {
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
      throw new Error(`Kimi API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  },
};

export function getProviderClient(provider: AIProvider): AIProviderClient {
  switch (provider) {
    case 'openai': return openaiClient;
    case 'claude': return claudeClient;
    case 'grok': return grokClient;
    case 'gemini': return geminiClient;
    case 'groq': return groqClient;
    case 'kimi': return kimiClient;
    case 'openrouter': return openRouterClient;
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

