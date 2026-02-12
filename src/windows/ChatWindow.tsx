import { Component, createSignal, For, createEffect } from 'solid-js';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
} from '@suid/material';
import SettingsIcon from '@suid/icons-material/Settings';
import { AIProvider, AIModel } from '../types';
import { BookmarkSource } from '../types';
import { getApiKey } from '../utils/settings';
import { getProviderClient } from '../utils/aiProviders';
import SettingsDialog from '../components/SettingsDialog';

const ChatWindow: Component = () => {
  const [selectedProvider, setSelectedProvider] = createSignal<AIProvider>('groq');
  const [models, setModels] = createSignal<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = createSignal<string>('');
  const [messages, setMessages] = createSignal<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [sources, setSources] = createSignal<BookmarkSource[]>([]);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [apiKeyPromptOpen, setApiKeyPromptOpen] = createSignal(false);
  const [promptProvider, setPromptProvider] = createSignal<AIProvider>('groq');

  createEffect(() => {
    const saved = localStorage.getItem('bookmark-sources');
    if (saved) {
      try {
        setSources(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading sources:', error);
      }
    }
  });

  // Load models when provider changes
  createEffect(async () => {
    const provider = selectedProvider();
    const apiKey = await getApiKey(provider);
    
    if (apiKey) {
      try {
        const client = getProviderClient(provider);
        const availableModels = await client.getAvailableModels(apiKey);
        setModels(availableModels);
        
        // Auto-select recommended model or first model
        const recommended = availableModels.find(m => m.recommended);
        if (recommended) {
          setSelectedModel(recommended.id);
        } else if (availableModels.length > 0) {
          setSelectedModel(availableModels[0].id);
        }
      } catch (error) {
        console.error('Error loading models:', error);
        setModels([]);
      }
    } else {
      setModels([]);
    }
  });

  async function sendMessage(customMessage?: string) {
    const userMessage = customMessage || input();
    if (!userMessage.trim() || !selectedModel()) return;

    const provider = selectedProvider();
    const apiKey = await getApiKey(provider);
    
    if (!apiKey) {
      setPromptProvider(provider);
      setApiKeyPromptOpen(true);
      return;
    }

    if (!customMessage) {
      setInput('');
    }
    setLoading(true);

    const newMessages = [...messages(), { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);

    // Prepare bookmark context
    const selectedSources = sources().filter((s) => {
      const selected = localStorage.getItem('selected-sources');
      if (selected) {
        const selectedIds = JSON.parse(selected);
        return selectedIds.includes(s.profile.id);
      }
      return false;
    });

    const bookmarkContext = selectedSources.length > 0
      ? `\n\nBookmark Sources:\n${JSON.stringify(selectedSources.map(s => ({
          profile: s.profile.name,
          browser: s.profile.browser,
          bookmarkCount: s.bookmarks.length,
        })), null, 2)}`
      : '';

    try {
      const client = getProviderClient(provider);
      const response = await client.chat(apiKey, selectedModel(), [
        {
          role: 'system',
          content: `You are an AI assistant helping to analyze and synchronize bookmarks from multiple browsers (Firefox, Chrome, Edge). 
          The user has provided bookmarks from different sources and wants to create a unified folder structure.
          Analyze the bookmarks and provide a detailed plan for integration.${bookmarkContext}`,
        },
        ...newMessages,
      ]);

      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Error: ${error?.message || error}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  async function handleProviderChange(provider: AIProvider) {
    setSelectedProvider(provider);
    setSelectedModel('');
    setModels([]);
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Bookmark View Panel */}
      <Box sx={{ width: '40%', borderRight: '1px solid #ccc', p: 2, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Bookmark View
        </Typography>
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Selected bookmarks will appear here
          </Typography>
        </Paper>
      </Box>

      {/* AI Chat Panel */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            AI Chat
          </Typography>
          <IconButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Recommended:</strong> Use <strong>Groq (Llama 4 70B)</strong> or <strong>Groq (Kimi K2-0905 1T 256K)</strong> for fast, affordable inference and state-of-the-art open-source thinking, 
              or <strong>Gemini 2.5 Pro</strong> for free AI access with advanced reasoning. (Gemini 3.0 coming soon!)
            </Typography>
          </Alert>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>AI Provider</InputLabel>
            <Select
              value={selectedProvider()}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              label="AI Provider"
            >
              <MenuItem value="groq">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Groq ⭐
                  <Chip label="Recommended" size="small" color="primary" />
                </Box>
              </MenuItem>
              <MenuItem value="gemini">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Gemini ⭐
                  <Chip label="Free" size="small" color="success" />
                </Box>
              </MenuItem>
              <MenuItem value="kimi">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Kimi (Moonshot AI) ⭐
                  <Chip label="Open Source" size="small" color="info" />
                </Box>
              </MenuItem>
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="claude">Claude (Anthropic)</MenuItem>
              <MenuItem value="grok">Grok (xAI)</MenuItem>
              <MenuItem value="openrouter">OpenRouter</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={selectedModel()}
              onChange={(e) => setSelectedModel(e.target.value)}
              label="Model"
              disabled={models().length === 0}
            >
              <For each={models()}>
                {(model) => (
                  <MenuItem value={model.id}>
                    <Box>
                      <Typography>{model.name}</Typography>
                      {model.recommended && (
                        <Chip label="Recommended" size="small" color="primary" sx={{ ml: 1 }} />
                      )}
                      {model.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 1 }}>
                          {model.description}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                )}
              </For>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            fullWidth
            onClick={async () => {
              const selectedSources = sources().filter((s) => {
                const selected = localStorage.getItem('selected-sources');
                if (selected) {
                  const selectedIds = JSON.parse(selected);
                  return selectedIds.includes(s.profile.id);
                }
                return false;
              });

              if (selectedSources.length === 0) {
                alert('Please select sources in the main window first');
                return;
              }

              if (!selectedModel()) {
                alert('Please select a model');
                return;
              }

              const analysisPrompt = `Analyze the following bookmarks from ${selectedSources.length} source(s) and create a detailed integration plan:

${selectedSources.map(s => `
Source: ${s.profile.name} (${s.profile.browser})
Bookmarks: ${JSON.stringify(s.bookmarks.slice(0, 50), null, 2)}${s.bookmarks.length > 50 ? '\n... (truncated)' : ''}
`).join('\n')}

Please provide:
1. A detailed analysis of the bookmark structures
2. Identification of duplicates across sources
3. A proposed unified folder structure
4. A step-by-step integration plan`;

              await sendMessage(analysisPrompt);
            }}
            disabled={loading() || !selectedModel()}
          >
            Analyze Selected Bookmarks
          </Button>
        </Box>

        <SettingsDialog
          open={settingsOpen()}
          onClose={() => setSettingsOpen(false)}
          onApiKeyChange={async () => {
            // Reload models when settings change
            const provider = selectedProvider();
            const apiKey = await getApiKey(provider);
            if (apiKey) {
              try {
                const client = getProviderClient(provider);
                const availableModels = await client.getAvailableModels(apiKey);
                setModels(availableModels);
              } catch (error) {
                console.error('Error loading models:', error);
              }
            }
          }}
        />

        <Dialog open={apiKeyPromptOpen()} onClose={() => setApiKeyPromptOpen(false)}>
          <DialogTitle>API Key Required</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Please configure your {promptProvider()} API key in settings to use this provider.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setApiKeyPromptOpen(false);
                setSettingsOpen(true);
              }}
              sx={{ mb: 1 }}
            >
              Open Settings
            </Button>
            <Typography variant="caption" color="text.secondary">
              Tip: Groq (Llama 4 / Kimi K2-0905), Gemini 2.5 Pro (Gemini 3.0 coming soon!), and Kimi K2-0905 are recommended for best performance, free access, and open-source SOTA respectively.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApiKeyPromptOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        <Paper sx={{ flex: 1, p: 2, mb: 2, overflow: 'auto' }}>
          <List>
            <For each={messages()}>
              {(message) => (
                <ListItem>
                  <ListItemText
                    primary={message.role === 'user' ? 'You' : 'AI'}
                    secondary={message.content}
                  />
                </ListItem>
              )}
            </For>
          </List>
        </Paper>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={input()}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={loading()}
          />
          <Button
            variant="contained"
            onClick={() => sendMessage()}
            disabled={loading() || !selectedModel()}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatWindow;
