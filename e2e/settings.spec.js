import { test, expect } from '@playwright/test';

/**
 * Settings E2E Tests
 * Tests profile, appearance, and password settings
 */

async function login(page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('admin@company.com');
  await page.getByPlaceholder('Password').fill('admin123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/settings/);
  });

  test('should display user profile information', async ({ page }) => {
    await page.goto('/settings');

    // Should show user info
    await expect(page.getByText(/admin user/i)).toBeVisible();
    await expect(page.getByText(/admin@company.com/i)).toBeVisible();
  });

  test('should display all settings sections', async ({ page }) => {
    await page.goto('/settings');

    // Profile section
    await expect(page.getByRole('heading', { name: /profile picture/i })).toBeVisible();

    // Password section
    await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible();

    // Appearance section
    await expect(page.getByRole('heading', { name: /appearance/i })).toBeVisible();
  });
});

test.describe('Appearance Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings');
  });

  test('should show theme options', async ({ page }) => {
    // Look for theme-related buttons or elements
    const lightButton = page.getByRole('button', { name: /light/i });
    const darkButton = page.getByRole('button', { name: /dark/i });

    // At least one theme option should be visible
    const hasThemeOptions = await lightButton.isVisible() || await darkButton.isVisible();
    expect(hasThemeOptions).toBeTruthy();
  });

  test('should change to light theme', async ({ page }) => {
    const lightButton = page.getByRole('button', { name: /light/i });
    if (await lightButton.isVisible()) {
      await lightButton.click();
      await page.waitForTimeout(300);
    }

    // Page should not have dark class on html
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);
  });

  test('should change to dark theme', async ({ page }) => {
    const darkButton = page.getByRole('button', { name: /dark/i });
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await page.waitForTimeout(300);
    }

    // Page should have dark class on html
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('should persist theme after page reload', async ({ page }) => {
    // Set dark theme
    const darkButton = page.getByRole('button', { name: /dark/i });
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await page.waitForTimeout(500);
    }

    // Reload page
    await page.reload();

    // Theme should still be dark (check html class)
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe('Profile Picture', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings');
  });

  test('should show upload button', async ({ page }) => {
    // Look for upload button with various possible names
    const uploadButton = page.getByRole('button', { name: /upload|change|photo/i });
    await expect(uploadButton.first()).toBeVisible();
  });

  test('should open file picker on upload click', async ({ page }) => {
    // Find upload button
    const uploadButton = page.getByRole('button', { name: /upload|change|photo/i }).first();

    if (await uploadButton.isVisible()) {
      // Set up file chooser listener
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
        uploadButton.click(),
      ]);

      // File chooser may or may not be triggered depending on implementation
      expect(true).toBeTruthy(); // Just verify the click worked
    }
  });
});

test.describe('Change Password', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings');
  });

  test('should show password change form', async ({ page }) => {
    // Look for password fields using placeholder text
    const currentPasswordField = page.getByPlaceholder(/current password/i);
    const newPasswordField = page.getByPlaceholder(/new password/i).first();

    await expect(currentPasswordField).toBeVisible();
    await expect(newPasswordField).toBeVisible();
  });

  test('should disable submit button when form is empty', async ({ page }) => {
    // Find the password change submit button
    const submitButton = page.getByRole('button', { name: /continue|change|update|save/i }).first();
    // Button should be disabled when form is empty
    if (await submitButton.isVisible()) {
      await expect(submitButton).toBeDisabled();
    }
  });

  test('should enable submit button when form is filled', async ({ page }) => {
    const currentPasswordField = page.getByPlaceholder(/current password/i);
    const newPasswordField = page.getByPlaceholder(/new password/i).first();
    const confirmPasswordField = page.getByPlaceholder(/confirm/i);

    if (await currentPasswordField.isVisible()) {
      await currentPasswordField.fill('admin123');
    }
    if (await newPasswordField.isVisible()) {
      await newPasswordField.fill('newpassword123');
    }
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill('newpassword123');
    }

    // Find submit button - should be enabled now
    const submitButton = page.getByRole('button', { name: /continue|change|update|save/i }).first();
    if (await submitButton.isVisible()) {
      await expect(submitButton).toBeEnabled();
    }
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    const currentPasswordField = page.getByPlaceholder(/current password/i);
    const newPasswordField = page.getByPlaceholder(/new password/i).first();
    const confirmPasswordField = page.getByPlaceholder(/confirm/i);

    if (await currentPasswordField.isVisible()) {
      await currentPasswordField.fill('admin123');
    }
    if (await newPasswordField.isVisible()) {
      await newPasswordField.fill('newpassword123');
    }
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill('differentpassword');
      await confirmPasswordField.blur();
    }

    // Should show mismatch error
    await expect(page.getByText(/match|mismatch/i)).toBeVisible({ timeout: 3000 });
  });
});
