import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import LandingPage from './LandingPage';

it('renders only Projects and GitHub in primary navigation while retaining wordmark and working theme control', async () => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'dark';
  render(<LandingPage />);
  const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
  expect(Array.from(navigation.querySelectorAll('a')).map((link) => [link.getAttribute('aria-label') || link.textContent, link.getAttribute('href')])).toEqual([
    ['Projects', 'https://sangeev.me/#projects'],
    ['GitHub', 'https://github.com/Snowslash'],
  ]);
  for (const link of within(navigation).getAllByRole('link')) expect(link).toBeVisible();
  expect(screen.getByRole('link', { name: 'Sangeev.me' })).toHaveAttribute('href', 'https://sangeev.me');
  await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});
