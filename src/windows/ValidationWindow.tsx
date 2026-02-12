import { Component, createSignal, createEffect, For } from 'solid-js';
import { Box, Typography, Paper } from '@suid/material';
import { Bookmark, BookmarkValidation } from '../types';
import { BookmarkSource } from '../types';

const ValidationWindow: Component = () => {
  const [sources, setSources] = createSignal<BookmarkSource[]>([]);

  // Load sources from main window (using localStorage for now)
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

  function getStatusColor(validation?: BookmarkValidation): string {
    if (!validation) return 'inherit';
    
    switch (validation.status) {
      case 'dead':
        return 'red';
      case 'mismatched':
        return 'yellow';
      case 'invalid_path':
        return 'orange';
      case 'duplicate':
        return 'purple';
      default:
        return 'inherit';
    }
  }

  function renderBookmark(bookmark: Bookmark, source: BookmarkSource, path: string = '', depth: number = 0): any {
    const validation = source.validations[bookmark.id];
    const color = getStatusColor(validation);
    const currentPath = path ? `${path}/${bookmark.title}` : bookmark.title;

    return (
      <Box sx={{ pl: depth * 2, mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color }}>
            {bookmark.title}
          </Typography>
          {bookmark.url && (
            <Typography variant="caption" sx={{ color: 'gray' }}>
              ({bookmark.url})
            </Typography>
          )}
          {validation?.duplicatePath && (
            <Typography variant="caption" sx={{ color: 'gray', ml: 2 }}>
              Duplicate: {validation.duplicatePath}
            </Typography>
          )}
        </Box>
        {bookmark.children && bookmark.children.length > 0 && (
          <Box>
            {bookmark.children.map((child) => renderBookmark(child, source, currentPath, depth + 1))}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Bookmark Validation
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'red' }}>
          Red: Dead links
        </Typography>
        <Typography variant="body2" sx={{ color: 'orange' }}>
          Orange: Invalid path
        </Typography>
        <Typography variant="body2" sx={{ color: 'yellow' }}>
          Yellow: Mismatched description
        </Typography>
        <Typography variant="body2" sx={{ color: 'purple' }}>
          Purple: Duplicates
        </Typography>
      </Box>

      <Paper sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <For each={sources()}>
          {(source) => (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {source.profile.name} ({source.profile.browser})
              </Typography>
              <Box>
                {source.bookmarks.map((bookmark) => renderBookmark(bookmark, source))}
              </Box>
            </Box>
          )}
        </For>
      </Paper>
    </Box>
  );
};

export default ValidationWindow;

