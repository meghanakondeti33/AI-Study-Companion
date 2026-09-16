import { test, expect } from "@playwright/test";

test.describe("Phase 1 E2E Flow: Auth -> Spaces -> Projects", () => {
  test("complete learning journey: Register -> Login -> Dashboard -> Create Space -> Create Project -> Open Project", async ({
    page,
  }) => {
    let spaces: any[] = [];
    let projects: any[] = [];

    // Mock Backend Endpoints for deterministic, environment-independent execution
    await page.route("**/api/v1/auth/register", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr-123",
          email: "alex@example.com",
          name: "Alex Morgan",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-valid-jwt-token-xyz",
          token_type: "bearer",
        }),
      });
    });

    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr-123",
          email: "alex@example.com",
          name: "Alex Morgan",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.route(/\/api\/v1\/spaces/, async (route) => {
      if (route.request().method() === "POST") {
        const payload = JSON.parse(route.request().postData() || "{}");
        const newSpace = {
          id: "spc-456",
          user_id: "usr-123",
          name: payload.name,
          description: payload.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        spaces.push(newSpace);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newSpace),
        });
      } else if (route.request().method() === "GET") {
        const url = route.request().url();
        if (url.includes("/api/v1/spaces/spc-456")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(spaces[0] || {
              id: "spc-456",
              user_id: "usr-123",
              name: "Computer Science",
              description: "Core CS Studies",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(spaces),
          });
        }
      } else {
        await route.continue();
      }
    });

    await page.route(/\/api\/v1\/projects/, async (route) => {
      if (route.request().method() === "POST") {
        const payload = JSON.parse(route.request().postData() || "{}");
        const newProj = {
          id: "prj-789",
          space_id: payload.space_id,
          user_id: "usr-123",
          name: payload.name,
          description: payload.description || null,
          learning_goal: payload.learning_goal || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        projects.push(newProj);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newProj),
        });
      } else if (route.request().method() === "GET") {
        const url = route.request().url();
        if (url.includes("/materials") || url.includes("/quizzes") || url.includes("/tutor")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        }
 else if (url.includes("/api/v1/projects/prj-789")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(projects[0] || {
              id: "prj-789",
              space_id: "spc-456",
              user_id: "usr-123",
              name: "Algorithms Mastery",
              description: "Graph Algorithms",
              learning_goal: "Master Dijkstra & DFS",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(projects),
          });
        }
      } else {
        await route.continue();
      }
    });

    // 1. Visit Register Page
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "AI Study Companion" })).toBeVisible();

    // 2. Fill registration form
    await page.getByPlaceholder("Alex Morgan").fill("Alex Morgan");
    await page.getByPlaceholder("alex@example.com").fill("alex@example.com");
    await page.getByPlaceholder("Minimum 8 characters").fill("Password123!");
    await page.getByPlaceholder("Repeat password").fill("Password123!");
    await page.getByRole("button", { name: "Register" }).click();

    // 3. Lands on Dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText("Welcome back, Alex Morgan!")).toBeVisible();

    // 4. Create a Space
    await page.getByRole("button", { name: "New Space" }).click();
    await page.getByPlaceholder("e.g. Computer Science").fill("Computer Science");
    await page.getByPlaceholder("Describe the discipline or subject matter...").fill("Core CS curriculum");
    await page.getByRole("button", { name: "Create Space" }).click();

    // Verify Space appears on Dashboard
    await expect(page.getByRole("heading", { name: "Computer Science" })).toBeVisible();

    // 5. Create a Project
    await page.getByRole("button", { name: "New Project" }).click();
    await page.getByPlaceholder("e.g. Distributed Systems Architecture").fill("Algorithms Mastery");
    await page.getByPlaceholder("Overview of this study project...").fill("Graph Algorithms and Complexity");
    await page.getByPlaceholder("e.g. Master consensus algorithms & Raft").fill("Master Dijkstra & DFS");
    await page.getByRole("button", { name: "Create Project" }).click();

    // Verify Project appears on Dashboard
    await expect(page.getByRole("heading", { name: "Algorithms Mastery" })).toBeVisible();

    // 6. Open Project Workspace
    await page.getByText("Open workspace").first().click();
    await expect(page).toHaveURL(/.*projects\/prj-789/);
    await expect(page.getByRole("heading", { name: "Algorithms Mastery" })).toBeVisible();
    await expect(page.getByText("Study Materials")).toBeVisible();
    await expect(page.getByText("Master Dijkstra & DFS")).toBeVisible();
  });
});
