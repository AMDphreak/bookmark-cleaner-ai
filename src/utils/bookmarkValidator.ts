import { Bookmark, BookmarkValidation } from '../types';

export async function validateBookmark(bookmark: Bookmark): Promise<BookmarkValidation> {
  if (!bookmark.url) {
    return {
      bookmarkId: bookmark.id,
      status: 'valid',
    };
  }

  try {
    await fetch(bookmark.url, {
      method: 'HEAD',
      mode: 'no-cors',
    });

    // Since we're using no-cors, we can't check the status
    // We'll need to use a different approach
    return {
      bookmarkId: bookmark.id,
      status: 'valid',
    };
  } catch (error) {
    // Try to determine the type of error
    const urlObj = new URL(bookmark.url);
    const domain = urlObj.hostname;

    // Check if domain exists
    try {
      await fetch(`https://${domain}`, { method: 'HEAD', mode: 'no-cors' });
      return {
        bookmarkId: bookmark.id,
        status: 'invalid_path',
        message: `Domain exists but path may be invalid`,
      };
    } catch {
      return {
        bookmarkId: bookmark.id,
        status: 'dead',
        message: 'Link appears to be dead',
      };
    }
  }
}

export async function validateBookmarkDescription(
  bookmark: Bookmark
): Promise<boolean> {
  if (!bookmark.url || !bookmark.description) {
    return true;
  }

  try {
    const response = await fetch(bookmark.url);
    const html = await response.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

    const pageTitle = titleMatch?.[1] || '';
    const pageDescription = metaDescMatch?.[1] || '';

    // Simple check: if bookmark description doesn't match page title or meta description
    const descriptionLower = bookmark.description.toLowerCase();
    const pageTitleLower = pageTitle.toLowerCase();
    const pageDescLower = pageDescription.toLowerCase();

    return (
      descriptionLower.includes(pageTitleLower) ||
      pageTitleLower.includes(descriptionLower) ||
      descriptionLower.includes(pageDescLower) ||
      pageDescLower.includes(descriptionLower)
    );
  } catch {
    return true; // If we can't fetch, assume it's valid
  }
}

export function findDuplicates(bookmarks: Bookmark[]): Map<string, string[]> {
  const urlMap = new Map<string, string[]>();

  function traverse(bookmark: Bookmark, path: string = '') {
    const currentPath = path ? `${path}/${bookmark.title}` : bookmark.title;

    if (bookmark.url) {
      if (!urlMap.has(bookmark.url)) {
        urlMap.set(bookmark.url, []);
      }
      urlMap.get(bookmark.url)!.push(currentPath);
    }

    if (bookmark.children) {
      bookmark.children.forEach((child) => traverse(child, currentPath));
    }
  }

  bookmarks.forEach((bookmark) => traverse(bookmark));

  // Find duplicates
  const duplicates = new Map<string, string[]>();
  urlMap.forEach((paths, _url) => {
    if (paths.length > 1) {
      paths.forEach((path) => {
        const otherPaths = paths.filter((p) => p !== path);
        if (otherPaths.length > 0) {
          duplicates.set(path, otherPaths);
        }
      });
    }
  });

  return duplicates;
}

export async function validateAllBookmarks(
  bookmarks: Bookmark[]
): Promise<Record<string, BookmarkValidation>> {
  const validations: Record<string, BookmarkValidation> = {};
  const duplicates = findDuplicates(bookmarks);

  async function validateRecursive(bookmark: Bookmark) {
    if (bookmark.url) {
      const validation = await validateBookmark(bookmark);
      
      // Check for duplicates
      const bookmarkPath = getBookmarkPath(bookmark);
      if (duplicates.has(bookmarkPath)) {
        validation.status = 'duplicate';
        validation.duplicatePath = duplicates.get(bookmarkPath)?.join(', ');
      }

      // Check description mismatch
      const descValid = await validateBookmarkDescription(bookmark);
      if (!descValid && validation.status === 'valid') {
        validation.status = 'mismatched';
        validation.message = 'Description no longer matches the live web page';
      }

      validations[bookmark.id] = validation;
    }

    if (bookmark.children) {
      for (const child of bookmark.children) {
        await validateRecursive(child);
      }
    }
  }

  for (const bookmark of bookmarks) {
    await validateRecursive(bookmark);
  }

  return validations;
}

function getBookmarkPath(bookmark: Bookmark): string {
  // Simple path generation - can be improved
  return bookmark.title;
}

