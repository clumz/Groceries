import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

// Auth-gated tests sign in as an existing user of a Clerk *development*
// instance: set E2E_CLERK_USER_EMAIL plus the dev instance's Clerk keys.

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
    await page.goto("/browse");
    // Middleware should redirect to sign-in or landing page
    expect(page.url()).not.toContain("/browse");
  });
});

test.describe("Auth-gated flows", () => {
  test.skip(!process.env.E2E_CLERK_USER_EMAIL, "Requires E2E_CLERK_USER_EMAIL");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
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
