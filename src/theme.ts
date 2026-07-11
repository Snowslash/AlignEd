export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'sangeevSiteTheme';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function normaliseTheme(value: string | null | undefined): Theme | null {
  return value === 'dark' ? 'dark' : value === 'light' ? 'light' : null;
}

function readCookieTheme(): Theme | null {
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${THEME_STORAGE_KEY}=`));
  if (!match) return null;
  try {
    return normaliseTheme(decodeURIComponent(match.slice(THEME_STORAGE_KEY.length + 1)));
  } catch {
    return null;
  }
}

function readStoredTheme(): Theme | null {
  try {
    return normaliseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getAppliedTheme(): Theme {
  return normaliseTheme(document.documentElement.dataset.theme) ?? 'light';
}

export function applyTheme(theme: Theme, persist = true): Theme {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme remains usable when storage is unavailable.
    }

    try {
      const cookie = [
        `${THEME_STORAGE_KEY}=${encodeURIComponent(theme)}`,
        `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
        'Path=/',
        'SameSite=Lax',
      ];
      if (window.location.hostname === 'sangeev.me' || window.location.hostname.endsWith('.sangeev.me')) cookie.push('Domain=.sangeev.me');
      if (window.location.protocol === 'https:') cookie.push('Secure');
      document.cookie = cookie.join('; ');
    } catch {
      // Cookies are optional; localStorage remains the same-origin preference store.
    }
  }

  return theme;
}

export function initialiseTheme(): Theme {
  const systemTheme: Theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return applyTheme(readCookieTheme() ?? readStoredTheme() ?? systemTheme, false);
}
