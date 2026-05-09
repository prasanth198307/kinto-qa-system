import { Page } from "@playwright/test";

/**
 * Login by calling the API directly via Playwright's request context
 * (bypasses browser SameSite=None; Secure cookie rejection over HTTP).
 * Then manually inject the session cookie into the browser context.
 */
export async function login(page: Page) {
  // Step 1: POST login via Playwright's request API — no browser cookie policies applied
  const resp = await page.request.post("/api/login", {
    data: { slug: "gold-erp-demo", username: "goldadmin", password: "Gold@1234" },
    headers: { "Content-Type": "application/json" },
  });

  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(`Login API failed: ${resp.status()} ${body}`);
  }

  // Step 2: Extract the session cookie from the response
  const setCookie = resp.headers()["set-cookie"] ?? "";
  const sidMatch = setCookie.match(/connect\.sid=([^;]+)/);
  if (!sidMatch) {
    throw new Error(`No connect.sid cookie in login response. Set-Cookie: ${setCookie}`);
  }
  const sidValue = decodeURIComponent(sidMatch[1]);

  // Step 3: Inject the cookie into the browser context with lax settings (works over HTTP)
  await page.context().addCookies([
    {
      name: "connect.sid",
      value: sidValue,
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
      secure: false,
      httpOnly: true,
    },
  ]);

  // Step 4: Navigate to the app — session should now be recognised
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Verify session is live
  const check = await page.evaluate(async () => {
    const r = await fetch("/api/user", { credentials: "include" });
    return r.status;
  });
  if (check !== 200) {
    throw new Error(`Session validation failed — /api/user returned ${check}`);
  }
  console.log("✓ Logged in as goldadmin (tenant 13)");
}

/** Navigate to a Gold ERP section and wait for the page to stabilise */
export async function goToSection(page: Page, section: string) {
  await page.goto(`/gold-erp?section=${section}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

/** Click a select trigger and choose the first option */
export async function selectFirst(page: Page, testId: string) {
  await page.locator(`[data-testid="${testId}"]`).click();
  await page.waitForTimeout(300);
  await page.getByRole("option").first().click();
  await page.waitForTimeout(200);
}

/** Click inside an input, clear it, and type a value */
export async function fillInput(page: Page, testId: string, value: string) {
  const el = page.locator(`[data-testid="${testId}"]`);
  await el.click({ clickCount: 3 });
  await el.fill(value);
}
