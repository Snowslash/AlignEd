import { afterEach, describe, expect, it } from 'vitest';
import {
  applyEstateTheme as applyTheme,
  ESTATE_THEME_STORAGE_KEY as THEME_STORAGE_KEY,
  getAppliedEstateTheme as getAppliedTheme,
  initialiseEstateTheme as initialiseTheme,
} from '@sangeev/estate-ui';

describe('theme contract', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.theme;
    localStorage.clear();
    document.cookie = `${THEME_STORAGE_KEY}=; Max-Age=0; Path=/`;
  });

  it('applies and persists the shared dark theme', () => {
    expect(applyTheme('dark')).toBe('dark');
    expect(getAppliedTheme()).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.cookie).toContain(`${THEME_STORAGE_KEY}=dark`);
  });

  it('prefers a valid estate cookie and safely ignores malformed cookie encoding', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    document.cookie = `${THEME_STORAGE_KEY}=light; Path=/`;
    expect(initialiseTheme()).toBe('light');

    document.cookie = `${THEME_STORAGE_KEY}=%E0%A4%A; Path=/`;
    expect(initialiseTheme()).toBe('dark');
  });

  it('returns to the shared light theme', () => {
    applyTheme('dark');
    applyTheme('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
