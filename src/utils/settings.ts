import { invoke } from '@tauri-apps/api/core';

export interface AppSettings {
  openRouterApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  grokApiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  kimiApiKey?: string;
  defaultProvider?: string;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const settings = await invoke<AppSettings>('load_settings');
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return {};
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await invoke('save_settings', { settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function getOpenRouterApiKey(): Promise<string | undefined> {
  const settings = await loadSettings();
  return settings.openRouterApiKey;
}

export async function setOpenRouterApiKey(apiKey: string): Promise<void> {
  const settings = await loadSettings();
  settings.openRouterApiKey = apiKey;
  await saveSettings(settings);
}

export async function getApiKey(provider: string): Promise<string | undefined> {
  const settings = await loadSettings();
  switch (provider) {
    case 'openai': return settings.openaiApiKey;
    case 'claude': return settings.claudeApiKey;
    case 'grok': return settings.grokApiKey;
    case 'gemini': return settings.geminiApiKey;
    case 'groq': return settings.groqApiKey;
    case 'kimi': return settings.kimiApiKey;
    case 'openrouter': return settings.openRouterApiKey;
    default: return undefined;
  }
}

export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  const settings = await loadSettings();
  const value = apiKey.trim() || undefined;
  switch (provider) {
    case 'openai': settings.openaiApiKey = value; break;
    case 'claude': settings.claudeApiKey = value; break;
    case 'grok': settings.grokApiKey = value; break;
    case 'gemini': settings.geminiApiKey = value; break;
    case 'groq': settings.groqApiKey = value; break;
    case 'kimi': settings.kimiApiKey = value; break;
    case 'openrouter': settings.openRouterApiKey = value; break;
  }
  await saveSettings(settings);
}

