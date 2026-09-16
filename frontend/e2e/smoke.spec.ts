import { test, expect } from "@playwright/test";

test.describe("Frontend Foundation Smoke Tests", () => {
  test("loads application shell and redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AI Study Companion/i);
    await expect(page.getByRole("heading", { name: "AI Study Companion" })).toBeVisible();
    await expect(page.getByText("Sign in to your learning workspace")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});

