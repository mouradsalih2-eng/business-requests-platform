import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests login, logout, and forgot password flows
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the login page
    await page.goto('/login');
  });

  test('should show login form', async ({ page }) => {
    // Check for app title and sign in heading
    await expect(page.getByRole('heading', { name: 'User Voice' })).toBeVisible();
    await expect(page.getByText('Sign in to continue')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('invalid@test.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Use test admin credentials
    await page.getByPlaceholder('Email').fill('admin@company.com');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('Password');
    // Find the toggle button next to the password input
    const toggleButton = page.locator('button[aria-label="Show password"]');

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle to hide password again
    await page.locator('button[aria-label="Hide password"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.getByText('Forgot password?').click();

    await expect(page).toHaveURL(/forgot-password/);
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.getByText('Sign up').click();

    await expect(page).toHaveURL(/register/);
  });
});

test.describe('Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('should show forgot password form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('should show success message after submitting email', async ({ page }) => {
    await page.getByPlaceholder('Email').fill('user@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    // Should show success message (even for non-existent emails for security)
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('should navigate back to login', async ({ page }) => {
    await page.getByText('Sign in').click();

    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('admin@company.com');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    // Open user menu dropdown - click on the user menu button
    await page.locator('header button').last().click();
    // Click sign out button
    await page.getByText('Sign out').click();

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing my-requests', async ({ page }) => {
    await page.goto('/my-requests');

    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing settings', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/login/);
  });
});
