import { Bookmark } from '../types';
import { invoke } from '@tauri-apps/api/core';

export interface BrowserBookmarkLocation {
  firefox: string[];
  chrome: string[];
  edge: string[];
}

// Firefox bookmarks are stored in places.sqlite
// Chrome/Edge bookmarks are stored in Bookmarks file (JSON)

export async function readFirefoxBookmarks(profilePath: string): Promise<Bookmark[]> {
  // Firefox uses SQLite database (places.sqlite)
  // For now, we'll use Tauri to read the file
  try {
    const bookmarks = await invoke<Bookmark[]>('read_firefox_bookmarks', {
      profilePath,
    });
    return bookmarks;
  } catch (error) {
    console.error('Error reading Firefox bookmarks:', error);
    throw error;
  }
}

export async function readChromeBookmarks(profilePath: string): Promise<Bookmark[]> {
  // Chrome stores bookmarks in a JSON file
  try {
    const bookmarks = await invoke<Bookmark[]>('read_chrome_bookmarks', {
      profilePath,
    });
    return bookmarks;
  } catch (error) {
    console.error('Error reading Chrome bookmarks:', error);
    throw error;
  }
}

export async function readEdgeBookmarks(profilePath: string): Promise<Bookmark[]> {
  // Edge uses the same format as Chrome
  try {
    const bookmarks = await invoke<Bookmark[]>('read_edge_bookmarks', {
      profilePath,
    });
    return bookmarks;
  } catch (error) {
    console.error('Error reading Edge bookmarks:', error);
    throw error;
  }
}

export function getDefaultBookmarkPaths(): BrowserBookmarkLocation {
  // These are example paths - users will need to provide their actual paths
  // In a real implementation, we'd use Tauri's path API to get user directories
  const paths: BrowserBookmarkLocation = {
    firefox: [],
    chrome: [],
    edge: [],
  };

  // Windows default paths
  paths.firefox.push('%APPDATA%\\Mozilla\\Firefox\\Profiles');
  paths.chrome.push('%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Bookmarks');
  paths.chrome.push('%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Profile 1\\Bookmarks');
  paths.edge.push('%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Bookmarks');
  paths.edge.push('%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Profile 1\\Bookmarks');

  return paths;
}

