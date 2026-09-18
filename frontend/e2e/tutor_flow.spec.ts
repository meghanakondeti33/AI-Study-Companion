import { test, expect } from "@playwright/test";

test.describe("Phase 3 E2E Flow: AI Tutor + Grounded RAG + Citations + Refusal", () => {
  test("complete tutor interaction: Ask question -> See grounded answer with page citations -> Ask unsupported -> See grounded refusal", async ({
    page,
  }) => {
    let conversationMessages: any[] = [];
    let conversationList: any[] = [
      {
        id: "conv-301",
        user_id: "usr-123",
        project_id: "prj-202",
        title: "Biology Study Session",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Mock Auth & User
    await page.route(/\/api\/v1\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "usr-123",
          email: "student@example.com",
          name: "Alex Student",
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
          access_token: "mock-jwt-token-phase3",
          token_type: "bearer",
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
            name: "Natural Sciences",
            description: "Cellular and Molecular Biology",
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
    await page.route(/\/api\/v1\/spaces\/spc-101/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "spc-101",
          user_id: "usr-123",
          name: "Natural Sciences",
          description: "Cellular and Molecular Biology",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
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
          name: "Cell Biology 101",
          description: "Study photosynthesis, respiration, and genetics",
          learning_goal: "Master cellular energy transformations",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    // Mock Materials list (ready material)
    await page.route(/\/api\/v1\/projects\/prj-202\/materials/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "mat-999",
            project_id: "prj-202",
            filename: "biology_ch1.pdf",
            original_filename: "biology_ch1.pdf",
            file_type: "application/pdf",
            file_size: 1048576,
            status: "READY",
            page_count: 5,
            error_message: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          },
        ]),
      });
    });

    // Mock Quizzes list
    await page.route(/\/api\/v1\/projects\/prj-202\/quizzes/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Mock Tutor Conversations list

    await page.route(/\/api\/v1\/projects\/prj-202\/tutor\/conversations/, async (route) => {
      if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        const newConv = {
          id: `conv-${Date.now()}`,
          user_id: "usr-123",
          project_id: "prj-202",
          title: body.title || "New Study Session",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        conversationList.unshift(newConv);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newConv),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(conversationList),
        });
      }
    });

    // Mock Tutor Conversation details
    await page.route(/\/api\/v1\/tutor\/conversations\/conv-/, async (route) => {
      const url = route.request().url();
      if (url.endsWith("/messages")) {
        // Post message endpoint
        const body = JSON.parse(route.request().postData() || "{}");
        const userMsg = {
          id: `msg-${Date.now()}-user`,
          conversation_id: "conv-301",
          role: "user",
          content: body.content,
          citations: null,
          created_at: new Date().toISOString(),
        };
        conversationMessages.push(userMsg);

        let assistantMsg: any;
        if (body.content.toLowerCase().includes("photosynthesis")) {
          assistantMsg = {
            id: `msg-${Date.now()}-assistant`,
            conversation_id: "conv-301",
            role: "assistant",
            content:
              "Photosynthesis occurs primarily in chloroplasts, converting sunlight, carbon dioxide, and water into glucose. [Page 1]",
            citations: [
              {
                material_id: "mat-999",
                page_number: 1,
                supporting_text: "Photosynthesis occurs primarily in chloroplasts.",
              },
            ],
            created_at: new Date().toISOString(),
          };
        } else {
          // Unsupported question -> Grounded Refusal
          assistantMsg = {
            id: `msg-${Date.now()}-assistant`,
            conversation_id: "conv-301",
            role: "assistant",
            content: "I couldn't find enough information about that in the uploaded project material.",
            citations: [],
            created_at: new Date().toISOString(),
          };
        }

        conversationMessages.push(assistantMsg);

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(assistantMsg),
        });
      } else {
        // Get conversation details
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...conversationList[0],
            messages: conversationMessages,
          }),
        });
      }
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

    // 1. Visit Login page and login
    await page.goto("/login");
    await page.getByPlaceholder("learner@example.com").fill("student@example.com");
    await page.getByPlaceholder("••••••••").fill("Password123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // 2. Navigate directly to the project page and switch to AI Tutor tab
    await page.goto("/projects/prj-202");
    await page.click("#tab-tutor");

    // 3. Verify Project and AI Tutor section header
    await expect(page.getByRole("heading", { name: "Cell Biology 101" })).toBeVisible();
    await expect(page.locator("#tutor-section")).toBeVisible();
    await expect(page.locator("text=AI Study Tutor")).toBeVisible();
    await expect(page.locator("text=Grounded RAG")).toBeVisible();

    // 4. Ask a grounded question: "What is photosynthesis?"
    await page.fill(
      "#tutor-question-input",
      "What is photosynthesis and where does it occur?"
    );
    await page.click("#tutor-send-btn");

    // 5. Verify the grounded answer and citation
    await expect(
      page.locator("text=Photosynthesis occurs primarily in chloroplasts")
    ).toBeVisible();
    await expect(page.locator("text=[Page 1]")).toBeVisible();

    // Verify citation pill
    const citationPill = page.locator("[data-testid=tutor-citation]");
    await expect(citationPill).toBeVisible();
    await expect(citationPill).toHaveText("Page 1");

    // 6. Ask an unsupported question: "What is the capital of Japan?"
    await page.fill("#tutor-question-input", "What is the capital of Japan?");
    await page.click("#tutor-send-btn");

    // 7. Verify grounded refusal message and indicator
    await expect(
      page.locator(
        "text=I couldn't find enough information about that in the uploaded project material."
      )
    ).toBeVisible();
    await expect(page.locator("text=Grounded Refusal")).toBeVisible();
  });
});
