import { test, expect } from "@playwright/test";

test.describe("Phase 4 E2E Flow: Adaptive Quiz + Understanding Evaluation", () => {
  test("complete quiz flow: Generate Quiz -> Start Quiz -> Answer MCQ -> Answer Open-Ended -> Complete Quiz -> View Diagnostic Report", async ({
    page,
  }) => {
    let quizzesList: any[] = [];
    const mockQuizId = "quiz-401";
    const mockAttemptId = "attempt-501";
    const q1Id = "q-101";
    const q2Id = "q-102";

    const fullQuiz = {
      id: mockQuizId,
      project_id: "prj-202",
      user_id: "usr-123",
      title: "Cellular Energy Mastery Quiz",
      status: "READY",
      created_at: new Date().toISOString(),
      question_count: 2,
      questions: [
        {
          id: q1Id,
          quiz_id: mockQuizId,
          question_type: "mcq",
          question_text: "Which organelle is responsible for generating cellular ATP?",
          options: ["Mitochondria", "Nucleus", "Ribosome", "Endoplasmic Reticulum"],
          difficulty: "medium",
          source_citations: [{ material_id: "mat-999", page_number: 1 }],
        },
        {
          id: q2Id,
          quiz_id: mockQuizId,
          question_type: "open_ended",
          question_text: "Explain how chloroplasts function to support photosynthesis.",
          options: null,
          difficulty: "medium",
          source_citations: [{ material_id: "mat-999", page_number: 2 }],
        },
      ],
    };

    // 1. Mock Auth
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
          access_token: "mock-jwt-token-phase4",
          token_type: "bearer",
        }),
      });
    });

    // 2. Mock Space & Project
    await page.route(/\/api\/v1\/spaces\/spc-101/, async (route) => {
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

    await page.route(/\/api\/v1\/projects\/prj-202$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "prj-202",
          space_id: "spc-101",
          user_id: "usr-123",
          name: "Cell Biology 101",
          description: "Cellular structure, respiration, and photosynthesis",
          learning_goal: "Master cellular energy transformations",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    // 3. Mock Materials list (with READY status)
    await page.route(/\/api\/v1\/projects\/prj-202\/materials/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "mat-999",
            project_id: "prj-202",
            filename: "cell_bio.pdf",
            original_filename: "cell_bio.pdf",
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

    // 4. Mock Tutor Conversations
    await page.route(/\/api\/v1\/projects\/prj-202\/tutor\/conversations/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // 5. Mock Quizzes API
    await page.route(/\/api\/v1\/projects\/prj-202\/quizzes/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(quizzesList),
        });
      } else if (route.request().method() === "POST") {
        quizzesList = [fullQuiz];
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(fullQuiz),
        });
      }
    });

    await page.route(/\/api\/v1\/quizzes\/quiz-401$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fullQuiz),
      });
    });

    await page.route(/\/api\/v1\/quizzes\/quiz-401\/attempts$/, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockAttemptId,
          quiz_id: mockQuizId,
          user_id: "usr-123",
          started_at: new Date().toISOString(),
          completed_at: null,
          score: null,
          answers: [],
        }),
      });
    });

    let submittedAnswersList: any[] = [];

    await page.route(/\/api\/v1\/attempts\/attempt-501\/answers$/, async (route) => {
      const payload = JSON.parse(route.request().postData() || "{}");
      let answerObj: any;

      if (payload.question_id === q1Id) {
        // MCQ answer
        answerObj = {
          id: "ans-1",
          attempt_id: mockAttemptId,
          question_id: q1Id,
          answer_text: payload.answer_text,
          is_correct: true,
          score: 1.0,
          feedback: "Correct! Mitochondria generate cellular ATP via aerobic respiration.",
          evaluation_details: null,
          evaluated_by: "system",
          created_at: new Date().toISOString(),
          question: {
            id: q1Id,
            quiz_id: mockQuizId,
            question_type: "mcq",
            question_text: "Which organelle is responsible for generating cellular ATP?",
            correct_answer: "Mitochondria",
            explanation: "Mitochondria produce ATP via respiration.",
            difficulty: "medium",
            source_citations: [{ material_id: "mat-999", page_number: 1 }],
          },
        };
      } else {
        // Open-ended answer
        answerObj = {
          id: "ans-2",
          attempt_id: mockAttemptId,
          question_id: q2Id,
          answer_text: payload.answer_text,
          is_correct: true,
          score: 0.9,
          feedback: "Accurate explanation of photon absorption driving glucose synthesis.",
          evaluation_details: {
            strengths: ["Clear light absorption mechanism", "Identified glucose synthesis"],
            gaps: ["Could mention Calvin cycle explicitly"],
            improvement_hint: "Review dark reactions in stroma.",
          },
          evaluated_by: "ai",
          created_at: new Date().toISOString(),
          question: {
            id: q2Id,
            quiz_id: mockQuizId,
            question_type: "open_ended",
            question_text: "Explain how chloroplasts function to support photosynthesis.",
            correct_answer: "Chloroplasts capture photons via chlorophyll to synthesize glucose.",
            explanation: "Thylakoid membranes contain light-harvesting complexes.",
            difficulty: "medium",
            source_citations: [{ material_id: "mat-999", page_number: 2 }],
          },
        };
      }

      submittedAnswersList.push(answerObj);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(answerObj),
      });
    });

    await page.route(/\/api\/v1\/attempts\/attempt-501\/complete$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockAttemptId,
          quiz_id: mockQuizId,
          user_id: "usr-123",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          score: 95.0,
          answers: submittedAnswersList,
        }),
      });
    });

    // Step 1: Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "student@example.com");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // Step 2: Open Project Page
    await page.goto("/projects/prj-202");
    await expect(page.locator("h2")).toContainText("Cell Biology 101");

    // Step 3: Verify Quiz Section & Generate Quiz
    const quizSection = page.locator("#quizzes-section");
    await expect(quizSection).toBeVisible();

    const generateBtn = page.locator("#generate-quiz-btn");
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Fill title in modal and generate
    await page.fill("#quiz-title-input", "Cellular Energy Mastery Quiz");
    await page.click("#submit-generate-quiz-btn");

    // Step 4: Start Quiz / Take MCQ Question
    await expect(page.getByText("Question 1 of 2")).toBeVisible();
    await expect(page.getByText("Which organelle is responsible for generating cellular ATP?")).toBeVisible();

    // Select Mitochondria option (option 0)
    await page.click("#mcq-option-0");

    // Submit MCQ answer
    await page.click("#submit-answer-btn");

    // Verify deterministic feedback
    await expect(page.getByText("Correct!", { exact: true })).toBeVisible();
    await expect(page.getByText("Mitochondria generate cellular ATP via aerobic respiration.")).toBeVisible();


    // Navigate to next question
    await page.click("#next-question-btn");

    // Step 5: Answer Open-Ended Question
    await expect(page.getByText("Question 2 of 2")).toBeVisible();
    await expect(page.getByText("Explain how chloroplasts function to support photosynthesis.")).toBeVisible();

    // Enter open-ended explanation
    await page.fill(
      "#open-ended-textarea",
      "Chloroplasts capture photons with chlorophyll to drive light reactions and synthesize glucose from CO2."
    );

    // Submit Open-Ended answer for AI evaluation
    await page.click("#submit-answer-btn");

    // Verify AI diagnostic feedback
    await expect(page.getByText("Accurate explanation of photon absorption")).toBeVisible();
    await expect(page.getByText("Clear light absorption mechanism")).toBeVisible();
    await expect(page.getByText("Review dark reactions in stroma.")).toBeVisible();

    // Step 6: Complete Quiz
    const completeBtn = page.locator("#complete-quiz-btn");
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // Step 7: View Diagnostic Report & Score
    const resultsModal = page.locator("#quiz-results");
    await expect(resultsModal).toBeVisible();

    const scoreDisplay = page.locator("#quiz-score");
    await expect(scoreDisplay).toContainText("95%");

    await expect(page.getByText("2 of 2 Questions Correct")).toBeVisible();
    await expect(page.getByText("Cited from Page 1")).toBeVisible();
    await expect(page.getByText("Cited from Page 2")).toBeVisible();

    // Close results
    await page.click("#close-results-btn");
    await expect(resultsModal).not.toBeVisible();
  });
});
