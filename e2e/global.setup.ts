import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Fetches a Clerk testing token (bypasses bot protection in tests). Needs a
// development-instance CLERK_SECRET_KEY; skipped when no test user is configured.
setup("clerk testing token", async () => {
  setup.skip(!process.env.E2E_CLERK_USER_EMAIL, "E2E_CLERK_USER_EMAIL not set");
  await clerkSetup();
});
