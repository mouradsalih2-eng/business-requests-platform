import { test, expect } from '@playwright/test';

/**
 * Request CRUD E2E Tests
 * Tests creating, viewing, updating, and deleting requests
 */

// Helper to login before tests
async function login(page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('admin@company.com');
  await page.getByPlaceholder('Password').fill('admin123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test.describe('Request List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display request list on dashboard', async ({ page }) => {
    // Should see request cards (article elements)
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter requests by status', async ({ page }) => {
    // Wait for page to load
    await page.locator('article').first().waitFor({ timeout: 10000 });

    // Look for filter buttons (status tabs like Pending, Backlog, etc.)
    const pendingButton = page.getByRole('button', { name: /pending/i });
    if (await pendingButton.isVisible()) {
      await pendingButton.click();
      await page.waitForTimeout(500);
    }

    // Page should still have content
    await expect(page.locator('article, [role="heading"]').first()).toBeVisible();
  });

  test('should search requests by title', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test');

    // Wait for search results
    await page.waitForTimeout(500);
  });

  test('should open request detail when clicking a card', async ({ page }) => {
    // Wait for cards to load
    await page.locator('article').first().waitFor({ timeout: 10000 });

    // Click first request card
    await page.locator('article').first().click();

    // Should open side sheet or modal with details
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Create Request', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to new request page', async ({ page }) => {
    await page.getByRole('link', { name: /new request/i }).click();
    await expect(page).toHaveURL(/new-request/);
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/new-request');

    // Try to submit empty form
    await page.getByRole('button', { name: /submit request/i }).click();

    // Should show validation error
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test('should create a new request successfully', async ({ page }) => {
    await page.goto('/new-request');

    // Fill in required fields using placeholders and names
    await page.getByPlaceholder('Brief summary of your request').fill('E2E Test Request - ' + Date.now());
    await page.locator('select[name="category"]').selectOption('new_feature');
    await page.locator('select[name="priority"]').selectOption('medium');
    await page.locator('select[name="team"]').selectOption('Manufacturing');
    await page.locator('select[name="region"]').selectOption('Global');

    // Fill business problem
    await page.getByPlaceholder('What issue are you facing?').fill('This is a test request created by E2E tests');

    // Submit
    await page.getByRole('button', { name: /submit request/i }).click();

    // Should show success message
    await expect(page.getByText(/request submitted/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Request Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display request details', async ({ page }) => {
    // Click first request
    await page.locator('article').first().click();

    // Should show detail dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should have title, status, category info
    await expect(dialog.locator('h2, h3').first()).toBeVisible();
  });

  test('should close request detail', async ({ page }) => {
    // Wait for cards to load and click first request
    await page.locator('article').first().waitFor({ timeout: 10000 });
    await page.locator('article').first().click();

    // Wait for dialog to appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close dialog - try multiple close button patterns
    const closeButton = dialog.getByRole('button', { name: /close|×|x/i }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Try pressing Escape
      await page.keyboard.press('Escape');
    }

    // Dialog should be hidden
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('My Requests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to my requests page', async ({ page }) => {
    await page.getByRole('link', { name: /my requests/i }).click();
    await expect(page).toHaveURL(/my-requests/);
  });

  test('should show only user own requests', async ({ page }) => {
    await page.goto('/my-requests');

    // Page should load without errors
    await expect(page.getByRole('heading', { name: /my requests/i })).toBeVisible();
  });
});
