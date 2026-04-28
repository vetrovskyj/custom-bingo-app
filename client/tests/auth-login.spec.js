import { expect, test } from '@playwright/test';

test('user can log in and is redirected to dashboard', async ({ page }) => {
  let capturedBody = null;

  await page.route('**/api/auth/login', async (route) => {
    capturedBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-jwt-token',
        user: {
          _id: 'user-1',
          name: 'Playwright User',
          email: 'playwright@example.com',
        },
      }),
    });
  });

  await page.goto('/login');
  await page.locator('input[type="email"]').fill('playwright@example.com');
  await page.locator('input[type="password"]').fill('SuperSecret123');
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard$/);

  await expect.poll(() => capturedBody).toEqual({
    email: 'playwright@example.com',
    password: 'SuperSecret123',
  });

  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBe('test-jwt-token');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('user'))).toContain('playwright@example.com');
});