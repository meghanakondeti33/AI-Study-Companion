import { test, expect } from "@playwright/test";

test.describe("Phase 2 E2E Flow: Project Materials / PDF Processing", () => {
  test("complete materials flow: Open Project -> Upload PDF -> View Queued/Processing -> See Ready State", async ({
    page,
  }) => {
    let materialsList: any[] = [];
    let pollCount = 0;

    // Mock Auth & User
    await page.route(/\/api\/v1\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr-123",
          email: "learner@example.com",
          name: "Dr. Jordan Learner",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.route(/\/api\/v1\/auth\/login/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-jwt-token-phase2",
          token_type: "bearer",
        }),
      });
    });

    // Mock Spaces
    await page.route(/\/api\/v1\/spaces/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "spc-101",
            user_id: "usr-123",
            name: "Artificial Intelligence",
            description: "Deep learning and neural systems",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      });
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
          name: "Transformer Architectures",
          description: "Attention mechanisms and large language models",
          learning_goal: "Understand self-attention and positional encodings",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    // Mock Tutor Conversations
    await page.route(/\/api\/v1\/projects\/prj-202\/tutor\/conversations/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Mock Materials Upload & Listing with state transitions
    await page.route(/\/api\/v1\/projects\/prj-202\/materials/, async (route) => {
      if (route.request().method() === "POST") {
        const newMaterial = {
          id: "mat-303",
          project_id: "prj-202",
          filename: "attention_is_all_you_need.pdf",
          original_filename: "attention_is_all_you_need.pdf",
          file_type: "application/pdf",
          file_size: 2200000,
          storage_key: "mock-storage-key-123",
          status: "QUEUED",
          error_message: null,
          page_count: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          processed_at: null,
        };
        materialsList = [newMaterial];
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newMaterial),
        });
      } else if (route.request().method() === "GET") {
        pollCount++;
        // Simulate background transition: Poll 1 = QUEUED, Poll 2 = PROCESSING, Poll 3+ = READY
        if (materialsList.length > 0) {
          if (pollCount === 2) {
            materialsList[0].status = "PROCESSING";
          } else if (pollCount >= 3) {
            materialsList[0].status = "READY";
            materialsList[0].page_count = 15;
            materialsList[0].processed_at = new Date().toISOString();
          }
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(materialsList),
        });
      } else {
        await route.continue();
      }
    });

    // 1. Visit Login and Authenticate
    await page.goto("/login");
    await page.getByPlaceholder("learner@example.com").fill("learner@example.com");
    await page.getByPlaceholder("••••••••").fill("Password123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // 2. Navigate to Project Workspace
    await page.goto("/projects/prj-202");
    await expect(page.getByRole("heading", { name: "Transformer Architectures" })).toBeVisible();
    await expect(page.getByText("Study Materials")).toBeVisible();
    await expect(page.getByText("No Materials Uploaded Yet")).toBeVisible();

    // 3. Upload PDF using file input
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload PDF" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "attention_is_all_you_need.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%mock PDF file content for test\n%%EOF"),
    });

    // 4. Verify Material appears in list
    await expect(page.getByText("attention_is_all_you_need.pdf")).toBeVisible();

    // 5. Verify transition to READY state and page count display
    await expect(page.getByText("Ready")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("15 pages indexed")).toBeVisible();
  });
});
