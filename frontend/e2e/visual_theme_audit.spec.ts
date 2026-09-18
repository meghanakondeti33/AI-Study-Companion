import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Visual Theme Audit & Toggle Persistence", () => {
  const screenshotsDir = path.resolve(process.cwd(), "screenshots");

  test("Capture screenshots in both Light and Dark modes across all pages and verify persistence", async ({ page }) => {
    let spaces: any[] = [];
    let projects: any[] = [];

    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes("/api/v1/auth/register")) {
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
      } else if (url.includes("/api/v1/auth/login")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            access_token: "mock-valid-jwt-token-xyz",
            token_type: "bearer",
          }),
        });
      } else if (url.includes("/api/v1/auth/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "usr-123",
            email: "alex@example.com",
            name: "Alex Morgan",
            is_active: true,
            is_admin: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      } else if (url.includes("/learner-context")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "ctx-1",
                user_id: "usr-123",
                context_type: "strong_area",
                title: "Graph Traversal Mastery",
                description: "Demonstrated strong grasp of BFS & DFS algorithms.",
                confidence_score: 0.92,
                evidence_count: 5,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            total: 1,
          }),
        });
      } else if (url.includes("/api/v1/spaces")) {
        if (method === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          const newSpace = {
            id: "spc-456",
            user_id: "usr-123",
            name: body.name || "Computer Science",
            description: body.description || "Core CS curriculum",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          spaces.push(newSpace);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(newSpace),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(spaces),
          });
        }
      } else if (url.includes("/api/v1/projects")) {
        if (method === "POST") {
          const body = JSON.parse(route.request().postData() || "{}");
          const newProject = {
            id: "prj-789",
            space_id: "spc-456",
            user_id: "usr-123",
            name: body.name || "Algorithms Mastery",
            description: body.description || "Graph Algorithms",
            learning_goal: body.learning_goal || "Master Dijkstra & DFS",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          projects.push(newProject);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(newProject),
          });
        } else if (url.includes("/materials")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "mat-1",
                project_id: "prj-789",
                original_filename: "Introduction_to_Algorithms.pdf",
                file_size_bytes: 5242880,
                page_count: 45,
                chunk_count: 120,
                status: "READY",
                error_message: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            ]),
          });
        } else if (url.includes("/quizzes")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "q-1",
                project_id: "prj-789",
                title: "Graph Traversal & Shortest Paths",
                difficulty: "medium",
                question_count: 4,
                status: "COMPLETED",
                created_at: new Date().toISOString(),
              }
            ]),
          });
        } else if (url.includes("/tutor")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        } else if (url.includes("/concepts")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "c1",
                project_id: "prj-789",
                name: "Dijkstra's Algorithm",
                description: "Single-source shortest path algorithm on non-negative weighted graphs.",
                source_count: 2,
                created_at: new Date().toISOString(),
              },
              {
                id: "c2",
                project_id: "prj-789",
                name: "Breadth-First Search",
                description: "Layer-by-layer graph traversal technique.",
                source_count: 1,
                created_at: new Date().toISOString(),
              }
            ]),
          });
        } else if (url.includes("/mastery-history")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "h-1",
                concept_id: "c1",
                concept_name: "Dijkstra's Algorithm",
                previous_score: 70,
                new_score: 85,
                source: "quiz",
                created_at: new Date().toISOString(),
              }
            ]),
          });
        } else if (url.includes("/mastery")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "m-1",
                concept_id: "c1",
                mastery_score: 85,
                confidence_score: 0.9,
                last_assessed_at: new Date().toISOString(),
              },
              {
                id: "m-2",
                concept_id: "c2",
                mastery_score: 60,
                confidence_score: 0.75,
                last_assessed_at: new Date().toISOString(),
              }
            ]),
          });
        } else if (url.includes("/recommendations")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "rec-1",
                project_id: "prj-789",
                title: "Practice Shortest Path Edge Cases",
                description: "Review graph cycles and negative weight edge constraints before the next quiz.",
                recommendation_type: "practice",
                priority: "high",
                target_concept_name: "Dijkstra's Algorithm",
                status: "active",
                created_at: new Date().toISOString(),
              }
            ]),
          });
        } else if (url.includes("/growth")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              current_snapshot: null,
              status: "improving",
              overall_mastery: 75,
              trend_delta: 5.2,
              concept_count: 2,
              improving_concepts: [
                { concept_id: "c1", concept_name: "Dijkstra's Algorithm", mastery_score: 85, trend_delta: 15.0, status: "improving" }
              ],
              stable_concepts: [
                { concept_id: "c2", concept_name: "Breadth-First Search", mastery_score: 60, trend_delta: 0.0, status: "stable" }
              ],
              attention_concepts: []
            }),
          });
        } else if (url.includes("/api/v1/projects/prj-789")) {
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
      } else if (url.includes("/api/v1/admin")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            total_users: 14,
            active_users: 8,
            total_spaces: 6,
            total_projects: 12,
            total_materials: 25,
            total_quizzes: 18,
            total_quiz_attempts: 42,
            total_ai_requests: 310,
            total_background_jobs: 54,
            services: {
              database: "connected",
              redis: "connected",
              storage: "ready",
              ai_provider: "configured",
              celery_broker: "connected",
            },
            status: "healthy",
            app_name: "AI Study Companion",
            version: "1.0.0",
            environment: "development",
            users: [],
            projects: [],
            features: [],
            recent_jobs: [],
            events: [],
            evaluations: { total_evaluations: 10, passed_evaluations: 9, average_score: 91 },
            total_tokens: 145000,
            average_latency_ms: 650,
            queued_count: 0,
            running_count: 0,
            completed_count: 52,
            failed_count: 2,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // ==========================================
    // PART 1: LIGHT THEME AUDIT
    // ==========================================
    // Ensure starting in Light Mode with fresh state
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("ai_study_companion_theme", "light");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // 1. Login Page (Light)
    await page.screenshot({ path: path.join(screenshotsDir, "01_login_light.png"), fullPage: true });

    // 2. Register Page (Light)
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(screenshotsDir, "02_register_light.png"), fullPage: true });

    // Fill registration form
    await page.getByPlaceholder("Alex Morgan").fill("Alex Morgan");
    await page.getByPlaceholder("alex@example.com").fill("alex@example.com");
    await page.getByPlaceholder("Minimum 8 characters").fill("Password123!");
    await page.getByPlaceholder("Repeat password").fill("Password123!");
    await page.getByRole("button", { name: "Register" }).click();

    // 3. Dashboard Page (Light)
    await expect(page).toHaveURL(/.*dashboard/);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(screenshotsDir, "03_dashboard_light.png"), fullPage: true });

    // 4. Create Space & Project
    await page.getByRole("button", { name: "New Space" }).click();
    await page.getByPlaceholder("e.g. Computer Science").fill("Computer Science");
    await page.getByPlaceholder("Describe the discipline or subject matter...").fill("Core CS curriculum");
    await page.getByRole("button", { name: "Create Space" }).click();

    await page.getByRole("button", { name: "New Project" }).click();
    await page.getByPlaceholder("e.g. Distributed Systems Architecture").fill("Algorithms Mastery");
    await page.getByPlaceholder("Overview of this study project...").fill("Graph Algorithms and Complexity");
    await page.getByPlaceholder("e.g. Master consensus algorithms & Raft").fill("Master Dijkstra & DFS");
    await page.getByRole("button", { name: "Create Project" }).click();

    // 5. Open Project Workspace (Light Tabs)
    await page.getByText("Open workspace").first().click();
    await expect(page).toHaveURL(/.*projects\/prj-789/);
    await page.waitForLoadState("networkidle");
    
    // Tab 1: Materials (Light)
    await page.screenshot({ path: path.join(screenshotsDir, "04_project_materials_light.png"), fullPage: true });

    // Tab 2: AI Tutor (Light)
    await page.click("#tab-tutor");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "05_project_tutor_light.png"), fullPage: true });

    // Tab 3: Quiz (Light)
    await page.click("#tab-quiz");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "06_project_quiz_light.png"), fullPage: true });

    // Tab 4: Mastery & Growth (Light)
    await page.click("#tab-mastery");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "07_project_mastery_light.png"), fullPage: true });

    // Tab 5: Recommendations (Light)
    await page.click("#tab-recommendations");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "08_project_recommendations_light.png"), fullPage: true });

    // Tab 6: Analytics (Light)
    await page.click("#tab-analytics");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "09_project_analytics_light.png"), fullPage: true });

    // 6. Admin Page (Light)
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(screenshotsDir, "10_admin_light.png"), fullPage: true });

    // ==========================================
    // PART 2: THEME SWITCH TO DARK & PERSISTENCE TEST
    // ==========================================
    // Click visible theme toggle button in the header
    const headerToggleBtn = page.locator("#theme-toggle-btn:visible").first();
    await expect(headerToggleBtn).toBeVisible();
    await headerToggleBtn.click();

    // Verify dark class applied to documentElement
    const isDarkOnAdmin = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkOnAdmin).toBe(true);
    await page.screenshot({ path: path.join(screenshotsDir, "11_admin_dark.png"), fullPage: true });

    // Reload page to verify localStorage persistence across refresh
    await page.reload();
    await page.waitForLoadState("networkidle");
    const isDarkAfterReload = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkAfterReload).toBe(true);

    // Dashboard Page (Dark)
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(screenshotsDir, "12_dashboard_dark.png"), fullPage: true });

    // Open Project Workspace in Dark Mode
    await page.getByText("Open workspace").first().click();
    await expect(page).toHaveURL(/.*projects\/prj-789/);
    await page.waitForLoadState("networkidle");

    // Tab 1: Materials (Dark)
    await page.screenshot({ path: path.join(screenshotsDir, "13_project_materials_dark.png"), fullPage: true });

    // Tab 2: AI Tutor (Dark)
    await page.click("#tab-tutor");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "14_project_tutor_dark.png"), fullPage: true });

    // Tab 3: Quiz (Dark)
    await page.click("#tab-quiz");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "15_project_quiz_dark.png"), fullPage: true });

    // Tab 4: Mastery & Growth (Dark)
    await page.click("#tab-mastery");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "16_project_mastery_dark.png"), fullPage: true });

    // Tab 5: Recommendations (Dark)
    await page.click("#tab-recommendations");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "17_project_recommendations_dark.png"), fullPage: true });

    // Tab 6: Analytics (Dark)
    await page.click("#tab-analytics");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "18_project_analytics_dark.png"), fullPage: true });

    // Auth Pages in Dark Mode (log out to check login & register)
    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
    });
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const isDarkOnLogin = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkOnLogin).toBe(true);
    await page.screenshot({ path: path.join(screenshotsDir, "19_login_dark.png"), fullPage: true });

    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    const isDarkOnRegister = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkOnRegister).toBe(true);
    await page.screenshot({ path: path.join(screenshotsDir, "20_register_dark.png"), fullPage: true });

    // ==========================================
    // PART 3: TOGGLE BACK TO LIGHT & VERIFY PERSISTENCE
    // ==========================================
    const registerToggleBtn = page.locator("#theme-toggle-btn:visible").first();
    await registerToggleBtn.click();
    const isLightNow = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
    expect(isLightNow).toBe(true);

    await page.reload();
    await page.waitForLoadState("networkidle");
    const isLightAfterReload = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
    expect(isLightAfterReload).toBe(true);
  });
});

