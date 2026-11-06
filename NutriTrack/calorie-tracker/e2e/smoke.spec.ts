import { test, expect } from "@playwright/test";

// Smoke tests: prove the deployment is alive and the public entry points
// render. We deliberately don't authenticate here — auth-gated flows need
// programmatic session injection, which is a Phase-3.5 upgrade.

test("root URL redirects unauthed visitors to /signin", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status(), "root should respond").toBeLessThan(400);
  await expect(page).toHaveURL(/\/signin/);
});

test("sign-in page renders its form", async ({ page }) => {
  await page.goto("/signin");

  // The brand heading proves the client bundle mounted.
  await expect(
    page.getByRole("heading", { name: "nutriTrack" })
  ).toBeVisible();

  // Email input + submit button prove the form itself rendered.
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
});

test("PWA manifest is served with the expected shape", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.name).toBeTruthy();
  expect(Array.isArray(body.icons)).toBe(true);
});
