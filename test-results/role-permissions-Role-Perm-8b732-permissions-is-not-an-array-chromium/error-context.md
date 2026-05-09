# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: role-permissions.spec.ts >> Role Permission API >> PUT /api/roles/:roleId/permissions returns 400 when permissions is not an array
- Location: tests/role-permissions.spec.ts:162:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  66  | 
  67  |     let customRoleIndex = -1;
  68  |     for (let i = 0; i < cardCount; i++) {
  69  |       const nameEl = page.getByTestId(`text-role-name-${i}`);
  70  |       const name = await nameEl.textContent();
  71  |       if ((name || '').trim() === 'test_custom_role_e2e') {
  72  |         customRoleIndex = i;
  73  |         break;
  74  |       }
  75  |     }
  76  | 
  77  |     if (customRoleIndex >= 0) {
  78  |       await page.getByTestId(`button-edit-permissions-${customRoleIndex}`).click();
  79  |       const warning = page.getByTestId('warning-default-role');
  80  |       await expect(warning).not.toBeVisible();
  81  |     }
  82  |   });
  83  | 
  84  |   test('toggling a permission checkbox updates its state', async ({ page }) => {
  85  |     await loginAsAdmin(page);
  86  |     await page.goto(`${BASE_URL}/admin/roles`);
  87  | 
  88  |     const roleCards = page.getByTestId(/^card-role-/);
  89  |     const cardCount = await roleCards.count();
  90  | 
  91  |     let customRoleIndex = -1;
  92  |     for (let i = 0; i < cardCount; i++) {
  93  |       const nameEl = page.getByTestId(`text-role-name-${i}`);
  94  |       const name = await nameEl.textContent();
  95  |       if (!['admin', 'manager', 'operator', 'reviewer'].includes((name || '').trim())) {
  96  |         customRoleIndex = i;
  97  |         break;
  98  |       }
  99  |     }
  100 | 
  101 |     if (customRoleIndex < 0) return;
  102 | 
  103 |     await page.getByTestId(`button-edit-permissions-${customRoleIndex}`).click();
  104 |     await expect(page.getByTestId('dialog-edit-permissions')).toBeVisible();
  105 | 
  106 |     const firstViewCheckbox = page.getByTestId('checkbox-view-0');
  107 |     const initialState = await firstViewCheckbox.getAttribute('data-state');
  108 | 
  109 |     await firstViewCheckbox.click();
  110 |     const newState = await firstViewCheckbox.getAttribute('data-state');
  111 | 
  112 |     expect(newState).not.toBe(initialState);
  113 |   });
  114 | 
  115 |   test('save permissions button triggers API call', async ({ page }) => {
  116 |     await loginAsAdmin(page);
  117 |     await page.goto(`${BASE_URL}/admin/roles`);
  118 | 
  119 |     const roleCards = page.getByTestId(/^card-role-/);
  120 |     const cardCount = await roleCards.count();
  121 | 
  122 |     let customRoleIndex = -1;
  123 |     for (let i = 0; i < cardCount; i++) {
  124 |       const nameEl = page.getByTestId(`text-role-name-${i}`);
  125 |       const name = await nameEl.textContent();
  126 |       if (!['admin', 'manager', 'operator', 'reviewer'].includes((name || '').trim())) {
  127 |         customRoleIndex = i;
  128 |         break;
  129 |       }
  130 |     }
  131 | 
  132 |     if (customRoleIndex < 0) return;
  133 | 
  134 |     await page.getByTestId(`button-edit-permissions-${customRoleIndex}`).click();
  135 |     await expect(page.getByTestId('dialog-edit-permissions')).toBeVisible();
  136 | 
  137 |     const [response] = await Promise.all([
  138 |       page.waitForResponse(resp => resp.url().includes('/api/roles/') && resp.url().includes('/permissions') && resp.request().method() === 'PUT'),
  139 |       page.getByTestId('button-save-permissions').click(),
  140 |     ]);
  141 | 
  142 |     expect(response.status()).toBe(200);
  143 |   });
  144 | });
  145 | 
  146 | test.describe('Role Permission API', () => {
  147 |   test('PUT /api/roles/:roleId/permissions returns 404 for non-existent roleId', async ({ request }) => {
  148 |     const loginRes = await request.post(`${BASE_URL}/api/login`, {
  149 |       data: { username: 'admin', password: 'admin123' },
  150 |     });
  151 |     expect(loginRes.ok()).toBeTruthy();
  152 | 
  153 |     const response = await request.put(`${BASE_URL}/api/roles/non-existent-role-id-12345/permissions`, {
  154 |       data: { permissions: [{ screenKey: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false }] },
  155 |     });
  156 | 
  157 |     expect(response.status()).toBe(404);
  158 |     const body = await response.json();
  159 |     expect(body.message).toBe('Role not found');
  160 |   });
  161 | 
  162 |   test('PUT /api/roles/:roleId/permissions returns 400 when permissions is not an array', async ({ request }) => {
  163 |     const loginRes = await request.post(`${BASE_URL}/api/login`, {
  164 |       data: { username: 'admin', password: 'admin123' },
  165 |     });
> 166 |     expect(loginRes.ok()).toBeTruthy();
      |                           ^ Error: expect(received).toBeTruthy()
  167 | 
  168 |     const rolesRes = await request.get(`${BASE_URL}/api/roles`);
  169 |     const roles = await rolesRes.json();
  170 |     const adminRole = roles.find((r: any) => r.name === 'admin');
  171 |     expect(adminRole).toBeDefined();
  172 | 
  173 |     const response = await request.put(`${BASE_URL}/api/roles/${adminRole.id}/permissions`, {
  174 |       data: { permissions: 'not-an-array' },
  175 |     });
  176 | 
  177 |     expect(response.status()).toBe(400);
  178 |   });
  179 | 
  180 |   test('PUT /api/roles/:roleId/permissions succeeds for existing role', async ({ request }) => {
  181 |     const loginRes = await request.post(`${BASE_URL}/api/login`, {
  182 |       data: { username: 'admin', password: 'admin123' },
  183 |     });
  184 |     expect(loginRes.ok()).toBeTruthy();
  185 | 
  186 |     const rolesRes = await request.get(`${BASE_URL}/api/roles`);
  187 |     const roles = await rolesRes.json();
  188 |     const adminRole = roles.find((r: any) => r.name === 'admin');
  189 |     expect(adminRole).toBeDefined();
  190 | 
  191 |     const response = await request.put(`${BASE_URL}/api/roles/${adminRole.id}/permissions`, {
  192 |       data: {
  193 |         permissions: [
  194 |           { screenKey: 'dashboard', canView: true, canCreate: false, canEdit: false, canDelete: false },
  195 |         ],
  196 |       },
  197 |     });
  198 | 
  199 |     expect(response.status()).toBe(200);
  200 |   });
  201 | });
  202 | 
```