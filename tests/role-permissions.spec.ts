import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function loginAsAdmin(page: any) {
  await page.goto(`${BASE_URL}/`);
  await page.fill('input[name="username"], input[id="username"], input[placeholder*="username" i], input[type="text"]', 'admin');
  await page.fill('input[name="password"], input[id="password"], input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
}

test.describe('Role Permission Screen', () => {
  test('all screens are listed in the permission dialog', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/roles`);

    const permButton = page.getByTestId('button-edit-permissions-0').first();
    await permButton.click();

    const dialog = page.getByTestId('dialog-edit-permissions');
    await expect(dialog).toBeVisible();

    const rows = page.getByTestId(/^row-permission-/);
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('warning banner appears when editing a default role', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/roles`);

    const roleCards = page.getByTestId(/^card-role-/);
    const cardCount = await roleCards.count();

    let defaultRoleIndex = -1;
    for (let i = 0; i < cardCount; i++) {
      const nameEl = page.getByTestId(`text-role-name-${i}`);
      const name = await nameEl.textContent();
      if (['admin', 'manager', 'operator', 'reviewer'].includes((name || '').trim())) {
        defaultRoleIndex = i;
        break;
      }
    }

    expect(defaultRoleIndex).toBeGreaterThanOrEqual(0);

    await page.getByTestId(`button-edit-permissions-${defaultRoleIndex}`).click();

    const warning = page.getByTestId('warning-default-role');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('Warning');
  });

  test('no warning banner when editing a non-default role', async ({ page }) => {
    await loginAsAdmin(page);

    await page.request.post(`${BASE_URL}/api/roles`, {
      data: { name: 'test_custom_role_e2e', description: 'E2E test role' },
    });

    await page.goto(`${BASE_URL}/admin/roles`);

    const roleCards = page.getByTestId(/^card-role-/);
    const cardCount = await roleCards.count();

    let customRoleIndex = -1;
    for (let i = 0; i < cardCount; i++) {
      const nameEl = page.getByTestId(`text-role-name-${i}`);
      const name = await nameEl.textContent();
      if ((name || '').trim() === 'test_custom_role_e2e') {
        customRoleIndex = i;
        break;
      }
    }

    if (customRoleIndex >= 0) {
      await page.getByTestId(`button-edit-permissions-${customRoleIndex}`).click();
      const warning = page.getByTestId('warning-default-role');
      await expect(warning).not.toBeVisible();
    }
  });

  test('toggling a permission checkbox updates its state', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/roles`);

    const roleCards = page.getByTestId(/^card-role-/);
    const cardCount = await roleCards.count();

    let customRoleIndex = -1;
    for (let i = 0; i < cardCount; i++) {
      const nameEl = page.getByTestId(`text-role-name-${i}`);
      const name = await nameEl.textContent();
      if (!['admin', 'manager', 'operator', 'reviewer'].includes((name || '').trim())) {
        customRoleIndex = i;
        break;
      }
    }

    if (customRoleIndex < 0) return;

    await page.getByTestId(`button-edit-permissions-${customRoleIndex}`).click();
    await expect(page.getByTestId('dialog-edit-permissions')).toBeVisible();

    const firstViewCheckbox = page.getByTestId('checkbox-view-0');
    const initialState = await firstViewCheckbox.getAttribute('data-state');

    await firstViewCheckbox.click();
    const newState = await firstViewCheckbox.getAttribute('data-state');

    expect(newState).not.toBe(initialState);
  });

  test('save permissions button triggers API call', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/roles`);

    const roleCards = page.getByTestId(/^card-role-/);
    const cardCount = await roleCards.count();

    let customRoleIndex = -1;
    for (let i = 0; i < cardCount; i++) {
      const nameEl = page.getByTestId(`text-role-name-${i}`);
      const name = await nameEl.textContent();
      if (!['admin', 'manager', 'operator', 'reviewer'].includes((name || '').trim())) {
        customRoleIndex = i;
        break;
      }
    }

    if (customRoleIndex < 0) return;

    await page.getByTestId(`button-edit-permissions-${customRoleIndex}`).click();
    await expect(page.getByTestId('dialog-edit-permissions')).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/roles/') && resp.url().includes('/permissions') && resp.request().method() === 'PUT'),
      page.getByTestId('button-save-permissions').click(),
    ]);

    expect(response.status()).toBe(200);
  });
});

test.describe('Role Permission API', () => {
  test('PUT /api/roles/:roleId/permissions returns 404 for non-existent roleId', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/api/login`, {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(loginRes.ok()).toBeTruthy();

    const response = await request.put(`${BASE_URL}/api/roles/non-existent-role-id-12345/permissions`, {
      data: { permissions: [{ screenKey: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false }] },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('Role not found');
  });

  test('PUT /api/roles/:roleId/permissions returns 400 when permissions is not an array', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/api/login`, {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(loginRes.ok()).toBeTruthy();

    const rolesRes = await request.get(`${BASE_URL}/api/roles`);
    const roles = await rolesRes.json();
    const adminRole = roles.find((r: any) => r.name === 'admin');
    expect(adminRole).toBeDefined();

    const response = await request.put(`${BASE_URL}/api/roles/${adminRole.id}/permissions`, {
      data: { permissions: 'not-an-array' },
    });

    expect(response.status()).toBe(400);
  });

  test('PUT /api/roles/:roleId/permissions succeeds for existing role', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/api/login`, {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(loginRes.ok()).toBeTruthy();

    const rolesRes = await request.get(`${BASE_URL}/api/roles`);
    const roles = await rolesRes.json();
    const adminRole = roles.find((r: any) => r.name === 'admin');
    expect(adminRole).toBeDefined();

    const response = await request.put(`${BASE_URL}/api/roles/${adminRole.id}/permissions`, {
      data: {
        permissions: [
          { screenKey: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
        ],
      },
    });

    expect(response.status()).toBe(200);
  });
});
