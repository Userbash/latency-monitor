import { expect, test } from '@playwright/test';

test('app launches and core controls are interactive', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Esports Network Monitor' })).toBeVisible();

  await page.getByRole('button', { name: 'Social' }).click();
  await expect(page.getByRole('button', { name: 'YouTube' })).toBeVisible();

  await page.getByRole('button', { name: 'Games' }).click();
  await expect(page.getByRole('button', { name: 'CS2' })).toBeVisible();

  await page.getByTestId('start-test-btn').click();
  await expect(page.getByText('Running')).toBeVisible();
});
