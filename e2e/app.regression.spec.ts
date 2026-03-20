import { expect, test } from '@playwright/test';

test('dashboard renders expected metric cards and controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Start Network Test' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Connection Quality' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recommendation' })).toBeVisible();

  await expect(page.getByText('Ping')).toBeVisible();
  await expect(page.getByText('Jitter')).toBeVisible();
  await expect(page.getByText('Packet Loss')).toBeVisible();
  await expect(page.getByText('P95 Latency')).toBeVisible();
  await expect(page.getByText('Spike Rate')).toBeVisible();
  await expect(page.getByText('Bufferbloat')).toBeVisible();
  await expect(page.getByText('Score')).toBeVisible();
});

test('profile and mode toggles remain interactive', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Social' }).click();
  await expect(page.getByRole('button', { name: 'Discord' })).toBeVisible();

  await page.getByRole('button', { name: 'Games' }).click();
  await page.getByRole('button', { name: 'Dota 2' }).click();

  const testedHostLabel = page.getByRole('heading', { name: 'Tested Host' });
  await expect(testedHostLabel).toBeVisible();
});
