import { test, expect } from "@playwright/test";

test.describe("Frontend Foundation Smoke Tests", () => {
  test("loads application shell with correct title and header", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AI Study Companion/i);
    await expect(page.getByRole("heading", { name: "AI Study Companion" })).toBeVisible();
    await expect(page.getByText("Application Foundation Is Active")).toBeVisible();
  });
});
