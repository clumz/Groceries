import { test, expect } from "@playwright/test";

// TODO: implement auth bypass for Google OAuth
// Current approach: tests that require auth use magic-link with TEST_EMAIL + TEST_MAGIC_TOKEN env vars.
// Until that bypass is wired, auth-gated tests are skipped in CI.

test.describe("Landing page", () => {
  test("shows hero and Get Started CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Get started")).toBeVisible();
  });

  test("opens sign-in sheet on Get Started tap", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Get started").click();
    // Sheet should contain the Google sign-in option
    await expect(page.getByText("Continue with Google")).toBeVisible();
  });

  test("opens sign-in sheet on Sign In tap", async ({ page }) => {
    await page.goto("/");
    await page.getByText(/already have/i).click();
    await expect(page.getByText("Continue with Google")).toBeVisible();
  });
});

test.describe("Browse page (unauthenticated redirect)", () => {
  test("redirects unauthenticated users away from /browse", async ({ page }) => {
    const response = await page.goto("/browse");
    // Middleware should redirect to sign-in or landing page
    expect(page.url()).not.toContain("/browse");
  });
});

test.describe("Auth-gated flows", () => {
  test.skip(!process.env.TEST_EMAIL || !process.env.TEST_MAGIC_TOKEN, "Requires TEST_EMAIL + TEST_MAGIC_TOKEN env vars");

  test.beforeEach(async ({ page }) => {
    // Use magic-link token to authenticate
    await page.goto(`/api/auth/callback/email?token=${process.env.TEST_MAGIC_TOKEN}&email=${process.env.TEST_EMAIL}`);
    await page.waitForURL(/\/(plan|onboarding)/);
  });

  test("plan page shows generate button", async ({ page }) => {
    await page.goto("/plan");
    const regenerateBtn = page.getByRole("button", { name: /regenerate|build.*plan/i });
    await expect(regenerateBtn).toBeVisible();
  });

  test("browse page loads recipe grid", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByPlaceholder(/search recipes/i)).toBeVisible();
    // Search for pasta and expect results
    await page.getByPlaceholder(/search recipes/i).fill("pasta");
    await page.waitForTimeout(400); // debounce
    const cards = page.locator(".grid > button");
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test("cart page shows store toggle", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText(/woolworths|coles/i).first()).toBeVisible();
  });

  test("settings page shows sign out button", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });
});
