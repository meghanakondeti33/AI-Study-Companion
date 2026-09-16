import { test, expect } from "@playwright/test";

test.describe("Phase 5 E2E Flow: Concept Mastery Tracking", () => {
  test("Open Project -> View Concept Mastery Section -> Inspect Progress Bars & Audit Trail", async ({
    page,
  }) => {
    // Mock Auth & User
    await page.route(/\/api\/v1\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr-123",
          email: "scholar@example.com",
          name: "Dr. Scholar",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

        // Catch-all for unmocked ProjectPage endpoints to prevent 401s
    await page.route(/\/api\/v1\/projects\/[^\/]+\/(quizzes|concepts|mastery|recommendations|growth)/, async (route) => {
      const url = route.request().url();
      if (url.includes('/growth')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            current_snapshot: null,
            status: 'stable',
            overall_mastery: 0,
            trend_delta: 0,
            concept_count: 0,
            improving_concepts: [],
            stable_concepts: [],
            attention_concepts: []
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    // Mock Project
    await page.route(/\/api\/v1\/projects\/prj-202$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "prj-202",
          space_id: "spc-101",
          user_id: "usr-123",
          name: "Cellular Biology Mastery",
          description: "Bioenergetics and plant systems",
          learning_goal: "Master bioenergetics",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    // Mock Spaces
    await page.route(/\/api\/v1\/spaces$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "spc-101",
            user_id: "usr-123",
            name: "Biology Space",
            description: "Biological Sciences",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]),
      });
    });

    await page.route(/\/api\/v1\/projects$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Catch-all for unmocked ProjectPage endpoints to prevent 401s
    await page.route(/\/api\/v1\/projects\/[^\/]+\/(quizzes|concepts|mastery|recommendations|growth)/, async (route) => {
      const url = route.request().url();
      if (url.includes('/growth')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            current_snapshot: null,
            status: 'stable',
            overall_mastery: 0,
            trend_delta: 0,
            concept_count: 0,
            improving_concepts: [],
            stable_concepts: [],
            attention_concepts: []
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.route(/\/api\/v1\/learner-context/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "ctx-1",
              user_id: "usr-123",
              strengths: [],
              weaknesses: [],
              learning_preferences: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        }),
      });
    });

    // Mock Space
    await page.route(/\/api\/v1\/spaces\/spc-101$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "spc-101",
          user_id: "usr-123",
          name: "Biology Space",
          description: "Biological Sciences",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    // Mock Materials
    await page.route(/\/api\/v1\/projects\/prj-202\/materials/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "mat-1",
            project_id: "prj-202",
            filename: "bio.pdf",
            original_filename: "bio.pdf",
            file_type: "application/pdf",
            file_size: 10240,
            status: "READY",
            error_message: null,
            page_count: 5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock Tutor conversations & Quizzes
    await page.route(/\/api\/v1\/projects\/prj-202\/tutor\/conversations/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/v1\/projects\/prj-202\/quizzes/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Mock Phase 5: Concepts
    await page.route(/\/api\/v1\/projects\/prj-202\/concepts/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "c-1",
            project_id: "prj-202",
            name: "Photosynthesis",
            description: "Light dependent reactions and Calvin cycle",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "c-2",
            project_id: "prj-202",
            name: "Cellular Respiration",
            description: "Glycolysis and electron transport chain",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock Phase 5: Mastery
    await page.route(/\/api\/v1\/projects\/prj-202\/mastery$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "m-1",
            user_id: "usr-123",
            project_id: "prj-202",
            concept_id: "c-1",
            concept_name: "Photosynthesis",
            concept_description: "Light dependent reactions and Calvin cycle",
            mastery_score: 85.0,
            last_assessed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "m-2",
            user_id: "usr-123",
            project_id: "prj-202",
            concept_id: "c-2",
            concept_name: "Cellular Respiration",
            concept_description: "Glycolysis and electron transport chain",
            mastery_score: 59.0,
            last_assessed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock Phase 5: History
    await page.route(/\/api\/v1\/projects\/prj-202\/mastery\/history/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "h-1",
            user_id: "usr-123",
            project_id: "prj-202",
            concept_id: "c-1",
            concept_name: "Photosynthesis",
            previous_score: 50.0,
            new_score: 85.0,
            source: "quiz",
            evidence_id: "attempt_1",
            evidence_details: { quiz_title: "Bio Basics" },
            created_at: new Date().toISOString(),
          },
          {
            id: "h-2",
            user_id: "usr-123",
            project_id: "prj-202",
            concept_id: "c-2",
            concept_name: "Cellular Respiration",
            previous_score: 50.0,
            new_score: 59.0,
            source: "open_ended",
            evidence_id: "attempt_2",
            evidence_details: { quiz_title: "Metabolism" },
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    // Set token
    await page.addInitScript(() => {
      localStorage.setItem("ai_study_token", "test-token-phase5");
    });

    // Navigate to ProjectPage
    await page.goto("/projects/prj-202");

    // 1. Verify Mastery Section renders
    await expect(page.locator("#mastery-section")).toBeVisible();
    await expect(page.getByText("Concept Mastery Tracking")).toBeVisible();

    // 2. Verify Concepts and Mastery Scores
    const cards = page.locator('[data-testid="concept-mastery-card"]');
    await expect(cards).toHaveCount(2);

    await expect(page.getByRole("heading", { name: "Photosynthesis" })).toBeVisible();
    await expect(page.getByText("85%")).toBeVisible();
    await expect(page.getByText("Mastered")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Cellular Respiration" })).toBeVisible();
    await expect(page.getByText("59%")).toBeVisible();
    await expect(page.getByText("Developing")).toBeVisible();

    // 3. Inspect Audit Trail toggle
    const auditBtn = page.locator("#toggle-mastery-history-btn");
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();

    // 4. Verify History details
    const auditContainer = page.locator("#mastery-history-audit");
    await expect(auditContainer).toBeVisible();
    await expect(auditContainer.getByText("Mastery Score Audit Trail")).toBeVisible();
    await expect(auditContainer.getByText("50.0%").first()).toBeVisible();
    await expect(auditContainer.getByText("85.0%")).toBeVisible();
    await expect(auditContainer.getByText("QUIZ")).toBeVisible();
  });
});
