/**
 * Authentication helpers for E2E tests
 */

export const TEST_USERS = {
  admin: {
    email: 'admin@company.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
  },
  employee: {
    email: 'sarah@company.com',
    password: 'password123',
    name: 'Sarah Johnson',
    role: 'employee',
  },
};

/**
 * Login as a specific user type
 * @param {import('@playwright/test').Page} page
 * @param {'admin' | 'employee'} userType
 */
export async function login(page, userType = 'admin') {
  const user = TEST_USERS[userType];

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/);
}

/**
 * Logout the current user
 * @param {import('@playwright/test').Page} page
 */
export async function logout(page) {
  await page.locator('button:has-text("User")').click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await page.waitForURL(/login/);
}

/**
 * Check if user is logged in
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
  try {
    await page.waitForURL(/dashboard|my-requests|settings|admin/, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
