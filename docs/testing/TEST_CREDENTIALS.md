# E2E Test Credentials - KINTO Operations & QA System

## Test User Accounts

All test accounts are configured in the development database and ready for automated E2E testing.

### Admin User
- **Username:** `admin`
- **Password:** `Admin@123`
- **Email:** `admin@kinto.com`
- **Role:** Administrator
- **Permissions:** Full system access (all 26 screens)

### Manager User
- **Username:** `manager_test`
- **Password:** `Test@123`
- **Email:** `manager.test@kinto.com`
- **Role:** Manager
- **Permissions:** 
  - Dashboard (view)
  - Machines (full CRUD)
  - Checklists (view, edit)
  - Inventory management
  - Reports (view)
  - 14 total screens

### Operator User
- **Username:** `operator_test`
- **Password:** `Test@123`
- **Email:** `operator.test@kinto.com`
- **Role:** Operator
- **Permissions:**
  - Dashboard (view)
  - Checklists (create, edit)
  - PM Execution (create, edit)
  - Finished Goods (create)
  - Raw Materials (view)
  - 5 total screens

### Reviewer User
- **Username:** `reviewer_test`
- **Password:** `Test@123`
- **Email:** `reviewer.test@kinto.com`
- **Role:** Reviewer
- **Permissions:**
  - Dashboard (view)
  - Checklists (edit - for approval)
  - Quality reports (view)
  - 14 total screens (view-only except checklists)

## Using Credentials in Playwright Tests

### Example Login Flow

```typescript
// Login as admin
await page.goto('/login');
await page.fill('input[data-testid="input-username"]', 'admin');
await page.fill('input[data-testid="input-password"]', 'Admin@123');
await page.click('button[data-testid="button-login"]');
await page.waitForURL('/'); // Wait for redirect to dashboard

// Login as manager
await page.goto('/login');
await page.fill('input[data-testid="input-username"]', 'manager_test');
await page.fill('input[data-testid="input-password"]', 'Test@123');
await page.click('button[data-testid="button-login"]');
await page.waitForURL('/');

// Login as operator
await page.goto('/login');
await page.fill('input[data-testid="input-username"]', 'operator_test');
await page.fill('input[data-testid="input-password"]', 'Test@123');
await page.click('button[data-testid="button-login"]');
await page.waitForURL('/');

// Login as reviewer
await page.goto('/login');
await page.fill('input[data-testid="input-username"]', 'reviewer_test');
await page.fill('input[data-testid="input-password"]', 'Test@123');
await page.click('button[data-testid="button-login"]');
await page.waitForURL('/');
```

### Role-Based Testing Strategy

#### Admin Tests
- User management (CRUD)
- Role permissions configuration
- System configuration
- All feature access verification

#### Manager Tests
- Checklist assignment
- Inventory management
- Maintenance planning
- Report generation

#### Operator Tests
- Checklist completion
- PM task execution
- Production recording

#### Reviewer Tests
- **Checklist approval** (NEW - Bug #8)
- Quality inspection review
- Approve/Reject submissions

## Test Database Reset

To reset test data between test runs:

```sql
-- Clear test submissions (keep structure)
DELETE FROM checklist_submissions WHERE operator_id LIKE 'user-test-%';
DELETE FROM checklist_assignments WHERE operator_id LIKE 'user-test-%';

-- Or recreate all test users
\i database_scripts/03_test_users.sql
```

## Security Notes

⚠️ **IMPORTANT:** These credentials are for **development/testing ONLY**
- Never use these credentials in production
- Change all default passwords before production deployment
- Test credentials should only exist in development databases
- Automated tests should use these dedicated test accounts, not production user accounts

## Credential Management for CI/CD

Store credentials as environment variables:

```bash
# .env.test
TEST_ADMIN_USERNAME=admin
TEST_ADMIN_PASSWORD=Admin@123
TEST_MANAGER_USERNAME=manager_test
TEST_MANAGER_PASSWORD=Test@123
TEST_OPERATOR_USERNAME=operator_test
TEST_OPERATOR_PASSWORD=Test@123
TEST_REVIEWER_USERNAME=reviewer_test
TEST_REVIEWER_PASSWORD=Test@123
```

Then reference in tests:

```typescript
const credentials = {
  admin: {
    username: process.env.TEST_ADMIN_USERNAME,
    password: process.env.TEST_ADMIN_PASSWORD,
  },
  manager: {
    username: process.env.TEST_MANAGER_USERNAME,
    password: process.env.TEST_MANAGER_PASSWORD,
  },
  operator: {
    username: process.env.TEST_OPERATOR_USERNAME,
    password: process.env.TEST_OPERATOR_PASSWORD,
  },
  reviewer: {
    username: process.env.TEST_REVIEWER_USERNAME,
    password: process.env.TEST_REVIEWER_PASSWORD,
  },
};
```

## Troubleshooting

### Login fails with 401
- Verify user exists: `SELECT * FROM users WHERE username = 'manager_test';`
- Check role assignment: `SELECT u.*, r.name FROM users u JOIN roles r ON u.role_id = r.id;`
- Verify password hash is correct
- Check session configuration

### Test user missing permissions
- Verify role permissions: `SELECT * FROM role_permissions WHERE role_id = 'role-manager';`
- Run seed script: `\i database_scripts/02_seed_data.sql`
- Recreate test users: `\i database_scripts/03_test_users.sql`

## Test Execution

Now you can run E2E tests that require authentication:

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- bug-fixes.spec.ts

# Run tests for specific role
npm test -- reviewer-dashboard.spec.ts
```
