import { Component, createSignal, createEffect } from 'solid-js';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
} from '@suid/material';
import { getApiKey, setApiKey } from '../utils/settings';
import { AIProvider } from '../types';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onApiKeyChange?: () => void;
}

const providerInfo: Record<AIProvider, { name: string; url: string; description?: string }> = {
  openai: { name: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
  claude: { name: 'Anthropic Claude', url: 'https://console.anthropic.com/' },
  grok: { name: 'Grok (xAI)', url: 'https://x.ai/api' },
  gemini: { 
    name: 'Google Gemini', 
    url: 'https://aistudio.google.com/apikey',
    description: 'Free tier available - Recommended for free AI',
  },
  groq: { 
    name: 'Groq', 
    url: 'https://console.groq.com/keys',
    description: 'Fast inference, small cost - Recommended for best performance',
  },
  kimi: { 
    name: 'Kimi (Moonshot AI)', 
    url: 'https://platform.moonshot.ai/console/api-keys',
    description: 'State-of-the-art open-source thinking model',
  },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/keys' },
};

const SettingsDialog: Component<SettingsDialogProps> = (props) => {
  const [apiKeys, setApiKeys] = createSignal<Record<string, string>>({});

  createEffect(async () => {
    if (props.open) {
      const keys: Record<string, string> = {};
      const providers: AIProvider[] = ['openai', 'claude', 'grok', 'gemini', 'groq', 'kimi', 'openrouter'];
      
      for (const provider of providers) {
        const key = await getApiKey(provider);
        if (key) keys[provider] = key;
      }
      
      setApiKeys(keys);
    }
  });

  async function handleSave() {
    const providers: AIProvider[] = ['openai', 'claude', 'grok', 'gemini', 'groq', 'kimi', 'openrouter'];
    for (const provider of providers) {
      const key = apiKeys()[provider] || '';
      if (key) {
        await setApiKey(provider, key);
      } else {
        // Clear the key if empty
        await setApiKey(provider, '');
      }
    }
    props.onApiKeyChange?.();
    props.onClose();
  }

  function updateApiKey(provider: string, value: string) {
    setApiKeys({ ...apiKeys(), [provider]: value });
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>AI Provider Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            <Typography variant="body2" component="div">
              <strong>Recommended:</strong> Use <strong>Groq with Llama 4 70B</strong> or <strong>Kimi K2-0905 1T 256K</strong> for fast, affordable inference and state-of-the-art open-source thinking, 
              or <strong>Gemini 2.5 Pro</strong> for free AI access with advanced reasoning capabilities. (Gemini 3.0 coming soon!)
            </Typography>
          </Alert>

          {(Object.keys(providerInfo) as AIProvider[]).map((provider) => {
            const info = providerInfo[provider];
            const isRecommended = provider === 'groq' || provider === 'gemini';
            
            return (
              // @ts-ignore
              <div key={provider}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {info.name}
                  </Typography>
                  {isRecommended && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      ⭐ RECOMMENDED
                    </Typography>
                  )}
                </Box>
                {info.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {info.description}
                  </Typography>
                )}
                <TextField
                  label={`${info.name} API Key`}
                  type="password"
                  value={apiKeys()[provider] || ''}
                  onChange={(e) => updateApiKey(provider, e.target.value)}
                  fullWidth
                  size="small"
                  helperText={`Get your API key from ${info.url}`}
                />
              </div>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
