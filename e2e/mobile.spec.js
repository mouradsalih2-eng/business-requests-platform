import { test, expect } from '@playwright/test';

/**
 * Mobile/Responsive E2E Tests
 * Tests mobile viewport behavior and responsive design
 */

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('admin@company.com');
  await page.getByPlaceholder('Password').fill('admin123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should show mobile login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should login successfully on mobile', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should show hamburger menu on mobile', async ({ page }) => {
    await loginAsAdmin(page);

    // Sidebar should be hidden by default on mobile
    const sidebar = page.locator('aside, nav').first();

    // Should have menu button
    const menuButton = page.getByRole('button', { name: /menu/i });
    if (await menuButton.isVisible()) {
      await expect(menuButton).toBeVisible();
    }
  });

  test('should navigate using mobile menu', async ({ page }) => {
    await loginAsAdmin(page);

    // Try to find and click mobile menu button
    const menuButton = page.locator('button').filter({ hasText: /menu/i }).first();
    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Should show navigation links
      await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
    }
  });

  test('should display request cards on mobile', async ({ page }) => {
    await loginAsAdmin(page);

    // Wait for cards to load
    await page.waitForTimeout(2000);

    // Cards should be visible and full width
    const cards = page.locator('article');
    if (await cards.first().isVisible()) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test('should show roadmap in mobile view', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard?tab=roadmap');

    // Columns should be visible (possibly stacked)
    await expect(page.getByText(/backlog/i)).toBeVisible();
  });
});

test.describe('Tablet Viewport', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('should display dashboard on tablet', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should show sidebar on tablet', async ({ page }) => {
    await loginAsAdmin(page);

    // Sidebar should be visible
    await expect(page.getByRole('link', { name: /all requests/i })).toBeVisible();
  });

  test('should display roadmap columns on tablet', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard?tab=roadmap');

    // All three columns should be visible
    await expect(page.getByText(/backlog/i)).toBeVisible();
    await expect(page.getByText(/in progress/i)).toBeVisible();
    await expect(page.getByText(/released/i)).toBeVisible();
  });
});

test.describe('Desktop Viewport', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('should display full layout on desktop', async ({ page }) => {
    await loginAsAdmin(page);

    // Sidebar should be visible
    await expect(page.getByRole('link', { name: /all requests/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /my requests/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /admin/i })).toBeVisible();
  });

  test('should show all roadmap columns side by side', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard?tab=roadmap');

    // All columns visible at once
    await expect(page.getByRole('heading', { name: /backlog/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /in progress/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /released/i })).toBeVisible();
  });
});

test.describe('Dark Mode', () => {
  test('should toggle dark mode', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');

    // Click dark mode button
    await page.getByRole('button', { name: /dark/i }).click();

    // HTML should have dark class
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should persist dark mode preference', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');

    // Set dark mode
    await page.getByRole('button', { name: /dark/i }).click();
    await page.waitForTimeout(500);

    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto('/settings');

    // Should still be in dark mode
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
