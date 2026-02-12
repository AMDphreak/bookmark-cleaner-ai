export interface Bookmark {
  id: string;
  title: string;
  url?: string;
  dateAdded?: number;
  dateModified?: number;
  description?: string;
  children?: Bookmark[];
  parentId?: string;
  index?: number;
}

export interface BookmarkProfile {
  id: string;
  name: string;
  browser: 'firefox' | 'chrome' | 'edge';
  profilePath?: string;
  apiEnabled?: boolean;
  apiToken?: string;
  mappedTo?: string; // Profile ID this is mapped to
}

export interface BookmarkValidation {
  bookmarkId: string;
  status: 'valid' | 'dead' | 'mismatched' | 'invalid_path' | 'duplicate';
  message?: string;
  duplicatePath?: string;
}

export interface BookmarkSource {
  profile: BookmarkProfile;
  bookmarks: Bookmark[];
  validations: Record<string, BookmarkValidation>; // Changed from Map to Record for JSON serialization
}

export interface OpenRouterModel {
  id: string;
  name: string;
}

export type AIProvider = 
  | 'openai' 
  | 'claude' 
  | 'grok' 
  | 'gemini' 
  | 'groq' 
  | 'openrouter'
  | 'kimi';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  recommended?: boolean;
  description?: string;
}

