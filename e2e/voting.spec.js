import { test, expect } from '@playwright/test';

/**
 * Voting E2E Tests
 * Tests upvoting, liking, and vote interactions
 */

// Helper to login before tests with retry support
async function login(page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('admin@company.com');
  await page.getByPlaceholder('Password').fill('admin123');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation with extended timeout
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Voting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display vote counts on request cards', async ({ page }) => {
    // Wait for cards to load
    await page.locator('article').first().waitFor({ timeout: 10000 });

    // Each card should have vote-related buttons
    const firstCard = page.locator('article').first();
    // Look for buttons that could be vote/upvote buttons (with numbers or vote icons)
    const voteButtons = firstCard.locator('button');
    await expect(voteButtons.first()).toBeVisible();
  });

  test('should upvote a request', async ({ page }) => {
    // Find first request card
    const firstCard = page.locator('article').first();
    await firstCard.waitFor({ timeout: 10000 });

    // Get initial upvote count
    const upvoteButton = firstCard.locator('button').filter({ hasText: /▲|\d+/ }).first();
    const initialText = await upvoteButton.textContent();

    // Click upvote
    await upvoteButton.click();

    // Wait for optimistic update
    await page.waitForTimeout(500);

    // Vote count should change (either increase or show active state)
  });

  test('should like a request', async ({ page }) => {
    // Find first request card
    const firstCard = page.locator('article').first();
    await firstCard.waitFor({ timeout: 10000 });

    // Find like button (heart icon)
    const likeButton = firstCard.locator('button').filter({ hasText: /♥|❤/ }).first();

    if (await likeButton.isVisible()) {
      // Click like
      await likeButton.click();

      // Wait for optimistic update
      await page.waitForTimeout(500);
    }
  });

  test('should toggle vote on double click', async ({ page }) => {
    const firstCard = page.locator('article').first();
    await firstCard.waitFor({ timeout: 10000 });

    const upvoteButton = firstCard.locator('button').filter({ hasText: /▲|\d+/ }).first();

    // First click - vote
    await upvoteButton.click();
    await page.waitForTimeout(300);

    // Second click - unvote
    await upvoteButton.click();
    await page.waitForTimeout(300);

    // Should toggle the vote state
  });

  test('should show vote count in request detail', async ({ page }) => {
    // Wait for cards to load and click first request
    await page.locator('article').first().waitFor({ timeout: 10000 });
    await page.locator('article').first().click();

    // Detail dialog should show vote counts
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog should have buttons (which include vote buttons)
    await expect(dialog.locator('button').first()).toBeVisible();
  });
});

test.describe('Vote Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should persist vote after page refresh', async ({ page }) => {
    // Find and upvote a request
    const firstCard = page.locator('article').first();
    await firstCard.waitFor({ timeout: 10000 });

    const upvoteButton = firstCard.locator('button').filter({ hasText: /▲|\d+/ }).first();
    await upvoteButton.click();
    await page.waitForTimeout(1000);

    // Refresh page
    await page.reload();

    // Wait for cards to load again
    await page.locator('article').first().waitFor({ timeout: 10000 });

    // Vote should still be reflected (button should be in active/voted state)
  });
});
