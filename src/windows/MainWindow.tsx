import { Component, createSignal, createEffect, For } from 'solid-js';
import { Button, Box, Typography, Paper, Checkbox, FormControlLabel, CircularProgress } from '@suid/material';
import { BookmarkProfile, BookmarkSource } from '../types';
import { readFirefoxBookmarks, readChromeBookmarks, readEdgeBookmarks } from '../utils/bookmarkReaders';
import { validateAllBookmarks } from '../utils/bookmarkValidator';
import { invoke } from '@tauri-apps/api/core';
import ProfileManager from '../components/ProfileManager';

const MainWindow: Component = () => {
  const [profiles, setProfiles] = createSignal<BookmarkProfile[]>([]);
  const [sources, setSources] = createSignal<BookmarkSource[]>([]);
  const [selectedSources, setSelectedSources] = createSignal<Set<string>>(new Set());
  const [loading, setLoading] = createSignal(false);

  createEffect(() => {
    loadProfiles();
  });

  async function loadProfiles() {
    // Load saved profiles from storage
    try {
      const saved = localStorage.getItem('bookmark-profiles');
      if (saved) {
        setProfiles(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }

  async function addProfile(profile: BookmarkProfile) {
    const newProfiles = [...profiles(), profile];
    setProfiles(newProfiles);
    localStorage.setItem('bookmark-profiles', JSON.stringify(newProfiles));
  }

  function deleteProfile(id: string) {
    const newProfiles = profiles().filter((p) => p.id !== id);
    setProfiles(newProfiles);
    localStorage.setItem('bookmark-profiles', JSON.stringify(newProfiles));
    
    // Remove from sources if loaded
    setSources(sources().filter((s) => s.profile.id !== id));
  }

  function mapProfile(profileId: string, mappedTo: string) {
    const newProfiles = profiles().map((p) =>
      p.id === profileId ? { ...p, mappedTo: mappedTo || undefined } : p
    );
    setProfiles(newProfiles);
    localStorage.setItem('bookmark-profiles', JSON.stringify(newProfiles));
  }

  async function loadBookmarks(profile: BookmarkProfile) {
    setLoading(true);
    try {
      let bookmarks;
      if (profile.browser === 'firefox') {
        bookmarks = await readFirefoxBookmarks(profile.profilePath || '');
      } else if (profile.browser === 'chrome') {
        bookmarks = await readChromeBookmarks(profile.profilePath || '');
      } else {
        bookmarks = await readEdgeBookmarks(profile.profilePath || '');
      }

      const validations = await validateAllBookmarks(bookmarks);

      const source: BookmarkSource = {
        profile,
        bookmarks,
        validations,
      };

      const newSources = [...sources(), source];
      setSources(newSources);
      
      // Save to localStorage for validation window
      localStorage.setItem('bookmark-sources', JSON.stringify(newSources));
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      alert(`Failed to load bookmarks: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleSource(profileId: string) {
    const selected = new Set(selectedSources());
    if (selected.has(profileId)) {
      selected.delete(profileId);
    } else {
      selected.add(profileId);
    }
    setSelectedSources(selected);
    // Save selected sources for chat window
    localStorage.setItem('selected-sources', JSON.stringify(Array.from(selected)));
  }

  async function openValidationWindow() {
    await invoke('create_validation_window');
  }

  async function openChatWindow() {
    await invoke('create_chat_window');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Bookmark Cleaner AI
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={openValidationWindow} disabled={sources().length === 0}>
          View Validation
        </Button>
        <Button variant="contained" onClick={openChatWindow} disabled={selectedSources().size === 0}>
          Open AI Chat
        </Button>
        {loading() && <CircularProgress size={24} />}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
        <Paper sx={{ p: 2, width: '40%', overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Profile Management
          </Typography>
          <ProfileManager
            profiles={profiles()}
            onAddProfile={addProfile}
            onDeleteProfile={deleteProfile}
            onMapProfile={mapProfile}
          />
        </Paper>

        <Paper sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Loaded Sources
          </Typography>
          <Box sx={{ mb: 2 }}>
            <For each={profiles()}>
              {(profile) => (
                <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2">
                    {profile.name} ({profile.browser})
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => loadBookmarks(profile)}
                    disabled={loading() || !profile.profilePath}
                  >
                    Load
                  </Button>
                </Box>
              )}
            </For>
          </Box>

          <Typography variant="h6" gutterBottom>
            Select Sources for Analysis
          </Typography>
          <For each={sources()}>
            {(source) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedSources().has(source.profile.id)}
                    onChange={() => toggleSource(source.profile.id)}
                  />
                }
                label={`${source.profile.name} (${source.profile.browser}) - ${countBookmarks(source.bookmarks)} bookmarks`}
              />
            )}
          </For>
        </Paper>
      </Box>
    </Box>
  );
};

function countBookmarks(bookmarks: any[]): number {
  let count = 0;
  function traverse(items: any[]) {
    for (const item of items) {
      if (item.url) count++;
      if (item.children) traverse(item.children);
    }
  }
  traverse(bookmarks);
  return count;
}

export default MainWindow;

