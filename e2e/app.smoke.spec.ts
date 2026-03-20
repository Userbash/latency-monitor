import { expect, test } from '@playwright/test';

test('app launches and core controls are interactive', async ({ page }) => {
  await page.route('**/api/start-test', async (route) => {
    await page.waitForTimeout(300);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: {
          testedHost: 'api.steampowered.com',
          ping: 18,
          jitter: 3,
          packetLoss: 0,
          p95: 24,
          spikeRate: 1,
          bufferbloat: 6,
          status: 'Good',
          score: 86,
          recommendation: 'Stable route detected',
        },
      }),
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Esports Network Monitor' })).toBeVisible();

  await page.getByRole('button', { name: 'Social' }).click();
  await expect(page.getByRole('button', { name: 'YouTube' })).toBeVisible();

  await page.getByRole('button', { name: 'Games' }).click();
  await expect(page.getByRole('button', { name: 'CS2' })).toBeVisible();

  await page.getByTestId('start-test-btn').click();
  await expect(page.getByTestId('start-test-btn')).toBeDisabled();
  await expect(page.locator('.status-row span').first()).toHaveText('Running');
  await expect(page.locator('.status-row span').first()).toHaveText('Finished');
});
