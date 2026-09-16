import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  QuizItem,
  QuizQuestionItem,
  QuizAttemptItem,
  QuizAnswerItem,
} from "../api/client";
import {
  Brain,
  HelpCircle,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Award,
  Bookmark,
  X,
  Lightbulb,
} from "lucide-react";

interface QuizSectionProps {
  projectId: string;
  hasReadyMaterials: boolean;
}

export default function QuizSection({ projectId, hasReadyMaterials }: QuizSectionProps) {
  const queryClient = useQueryClient();

  // Dialog / Mode States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDifficulty, setCreateDifficulty] = useState("medium");
  const [createNumQuestions, setCreateNumQuestions] = useState(4);
  const [createTitle, setCreateTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<QuizAttemptItem | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, QuizAnswerItem>>({});
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isCompletingAttempt, setIsCompletingAttempt] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [completedAttempt, setCompletedAttempt] = useState<QuizAttemptItem | null>(null);

  // Quizzes Query
  const {
    data: quizzes = [],
    isLoading: isLoadingQuizzes,
  } = useQuery<QuizItem[]>({
    queryKey: ["quizzes", projectId],
    queryFn: () => api.quizzes.list(projectId),
    enabled: !!projectId,
  });

  // Generate Quiz Mutation
  const generateQuizMutation = useMutation({
    mutationFn: (payload: { difficulty: string; num_questions: number; title?: string }) =>
      api.quizzes.generate(projectId, payload),
    onSuccess: (newQuiz) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes", projectId] });
      setShowCreateModal(false);
      setCreateTitle("");
      setCreateError(null);
      // Automatically open the generated quiz
      handleStartQuiz(newQuiz);
    },
    onError: (err: any) => {
      setCreateError(err.message || "Failed to generate quiz. Please verify study materials are processed.");
    },
  });

  const handleStartQuiz = async (quiz: QuizItem) => {
    try {
      // Fetch full quiz with questions
      const fullQuiz = await api.quizzes.get(quiz.id);
      const attempt = await api.quizzes.startAttempt(quiz.id);
      setActiveQuiz(fullQuiz);
      setActiveAttempt(attempt);
      setCurrentQuestionIndex(0);
      setAnswersMap({});
      setSubmittedAnswers({});
      setShowResultsModal(false);
      setCompletedAttempt(null);
    } catch (err: any) {
      alert(err.message || "Failed to start quiz attempt.");
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (submittedAnswers[questionId]) return; // already submitted
    setAnswersMap((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitAnswer = async () => {
    if (!activeAttempt || !activeQuiz || !activeQuiz.questions) return;
    const currentQ = activeQuiz.questions[currentQuestionIndex];
    if (!currentQ) return;

    const answerText = answersMap[currentQ.id]?.trim();
    if (!answerText) return;

    setIsSubmittingAnswer(true);
    try {
      const answer = await api.quizzes.submitAnswer(activeAttempt.id, currentQ.id, answerText);
      setSubmittedAnswers((prev) => ({ ...prev, [currentQ.id]: answer }));
    } catch (err: any) {
      alert(err.message || "Failed to submit answer.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleCompleteQuiz = async () => {
    if (!activeAttempt) return;
    setIsCompletingAttempt(true);
    try {
      const finalAttempt = await api.quizzes.completeAttempt(activeAttempt.id);
      setCompletedAttempt(finalAttempt);
      setShowResultsModal(true);
      setActiveAttempt(null);
      queryClient.invalidateQueries({ queryKey: ["quizzes", projectId] });
    } catch (err: any) {
      alert(err.message || "Failed to complete quiz attempt.");
    } finally {
      setIsCompletingAttempt(false);
    }
  };

  const questions = activeQuiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isCurrentSubmitted = currentQuestion ? !!submittedAnswers[currentQuestion.id] : false;
  const currentAnswerObj = currentQuestion ? submittedAnswers[currentQuestion.id] : null;
  const allQuestionsAnswered =
    questions.length > 0 && questions.every((q) => !!submittedAnswers[q.id]);

  const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];

  return (
    <section id="quizzes-section" className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Adaptive Quizzes</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Understanding Evaluation
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Test your comprehension with grounded Multiple Choice and AI-evaluated conceptual questions that adapt to past mistakes.
          </p>
        </div>

        <div>
          <button
            id="generate-quiz-btn"
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            disabled={!hasReadyMaterials}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/20"
            title={!hasReadyMaterials ? "Upload and process materials before generating quizzes" : "Generate a new quiz"}
          >
            <Plus className="w-3.5 h-3.5" />
            Generate Quiz
          </button>
        </div>
      </div>

      {/* Notice if no materials ready */}
      {!hasReadyMaterials && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Upload and process at least one study PDF above to unlock grounded adaptive quiz generation.</span>
        </div>
      )}

      {/* Quizzes List */}
      {isLoadingQuizzes ? (
        <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          Loading project quizzes...
        </div>
      ) : safeQuizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center space-y-3 bg-slate-900/20">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-purple-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-300">No Quizzes Generated Yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Generate your first quiz to evaluate your retention on core concepts. Quizzes include automated MCQ grading and intelligent AI diagnostics on open-ended answers.
          </p>
          {hasReadyMaterials && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Quiz
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeQuizzes.map((quiz) => (

            <div
              key={quiz.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4 hover:border-slate-700 transition relative flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white leading-snug">{quiz.title}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/20 shrink-0">
                    {quiz.question_count} {quiz.question_count === 1 ? "Question" : "Questions"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Created {new Date(quiz.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="capitalize">{quiz.status.toLowerCase()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500">Grounded in uploaded documents</span>
                <button
                  id={`start-quiz-${quiz.id}`}
                  onClick={() => handleStartQuiz(quiz)}
                  className="start-quiz-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition shadow-sm shadow-purple-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Quiz Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Generate Adaptive Quiz</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Quiz Title (Optional)
                </label>
                <input
                  id="quiz-title-input"
                  type="text"
                  placeholder="e.g. Chapter 1 Mastery Check"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["easy", "medium", "hard"].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setCreateDifficulty(diff)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium capitalize border transition ${
                        createDifficulty === diff
                          ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCreateNumQuestions(num)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                        createNumQuestions === num
                          ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={generateQuizMutation.isPending}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                id="submit-generate-quiz-btn"
                type="button"
                onClick={() =>
                  generateQuizMutation.mutate({
                    difficulty: createDifficulty,
                    num_questions: createNumQuestions,
                    title: createTitle.trim() || undefined,
                  })
                }
                disabled={generateQuizMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {generateQuizMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating Grounded Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Quiz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Quiz Taking Modal / Overlay */}
      {activeAttempt && activeQuiz && currentQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            {/* Header / Progress */}
            <div className="space-y-3 border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-purple-400">{activeQuiz.title}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Exit this quiz attempt? Your progress so far will be saved.")) {
                      setActiveAttempt(null);
                    }
                  }}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  {currentQuestion.question_type === "mcq" ? "Multiple Choice" : "Open-Ended Concept"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {currentQuestion.difficulty}
                </span>
                {currentQuestion.source_citations && currentQuestion.source_citations.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <Bookmark className="w-3 h-3 text-purple-400" />
                    Page {currentQuestion.source_citations[0].page_number}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentQuestion.question_text}
              </h3>

              {/* Question Input / Options */}
              {currentQuestion.question_type === "mcq" ? (
                <div className="space-y-2.5 pt-2">
                  {(currentQuestion.options || []).map((option, idx) => {
                    const isSelected = answersMap[currentQuestion.id] === option;
                    return (
                      <button
                        key={idx}
                        id={`mcq-option-${idx}`}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, option)}
                        disabled={isCurrentSubmitted}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs leading-relaxed transition flex items-start gap-3 ${
                          isSelected
                            ? "bg-purple-600/15 border-purple-500 text-white font-medium"
                            : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        } ${isCurrentSubmitted ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                            isSelected
                              ? "border-purple-500 bg-purple-600"
                              : "border-slate-700 bg-slate-900"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="flex-1">{option}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="pt-2 space-y-2">
                  <textarea
                    id="open-ended-textarea"
                    rows={4}
                    value={answersMap[currentQuestion.id] || ""}
                    onChange={(e) =>
                      setAnswersMap((prev) => ({
                        ...prev,
                        [currentQuestion.id]: e.target.value,
                      }))
                    }
                    disabled={isCurrentSubmitted}
                    placeholder="Write your explanation grounded in the study material..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition disabled:opacity-75"
                  />
                </div>
              )}

              {/* Answer Evaluation Feedback Box */}
              {isCurrentSubmitted && currentAnswerObj && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2.5 animate-in fade-in duration-200 ${
                    currentAnswerObj.is_correct
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {currentAnswerObj.is_correct ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Correct!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>Needs Review</span>
                      </>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed">{currentAnswerObj.feedback}</p>

                  {/* Open-Ended Diagnostic Details */}
                  {currentAnswerObj.evaluation_details && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      {currentAnswerObj.evaluation_details.strengths?.length > 0 && (
                        <div>
                          <span className="font-semibold text-emerald-400">Strengths: </span>
                          <span className="text-slate-300">
                            {currentAnswerObj.evaluation_details.strengths.join(", ")}
                          </span>
                        </div>
                      )}
                      {currentAnswerObj.evaluation_details.gaps?.length > 0 && (
                        <div>
                          <span className="font-semibold text-amber-400">Gaps: </span>
                          <span className="text-slate-300">
                            {currentAnswerObj.evaluation_details.gaps.join(", ")}
                          </span>
                        </div>
                      )}
                      {currentAnswerObj.evaluation_details.improvement_hint && (
                        <div className="flex items-start gap-1.5 text-sky-300 bg-sky-500/10 p-2 rounded-lg border border-sky-500/20 mt-1">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-400" />
                          <span>
                            <strong>Hint: </strong>
                            {currentAnswerObj.evaluation_details.improvement_hint}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation & Submission Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                id="prev-question-btn"
                type="button"
                onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                {!isCurrentSubmitted ? (
                  <button
                    id="submit-answer-btn"
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={isSubmittingAnswer || !answersMap[currentQuestion.id]?.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-600/20"
                  >
                    {isSubmittingAnswer ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Submit Answer
                      </>
                    )}
                  </button>
                ) : currentQuestionIndex < questions.length - 1 ? (
                  <button
                    id="next-question-btn"
                    type="button"
                    onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition shadow-md shadow-purple-600/20"
                  >
                    Next Question
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="complete-quiz-btn"
                    type="button"
                    onClick={handleCompleteQuiz}
                    disabled={isCompletingAttempt || !allQuestionsAnswered}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50 shadow-md shadow-emerald-600/20"
                  >
                    {isCompletingAttempt ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Scoring...
                      </>
                    ) : (
                      <>
                        <Award className="w-3.5 h-3.5" />
                        Complete Quiz & View Score
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Results Diagnostic Modal */}
      {showResultsModal && completedAttempt && activeQuiz && (
        <div id="quiz-results" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="text-center space-y-2 border-b border-slate-800 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-2">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Quiz Completed</h3>
              <p className="text-xs text-slate-400">Here is your grounded diagnostic evaluation report.</p>

              {/* Score Display */}
              <div className="pt-2">
                <span
                  id="quiz-score"
                  className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-sky-400"
                >
                  {completedAttempt.score !== null ? `${completedAttempt.score}%` : "100%"}
                </span>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  {completedAttempt.answers.filter((a) => a.is_correct).length} of{" "}
                  {completedAttempt.answers.length} Questions Correct
                </p>
              </div>
            </div>

            {/* Questions Review Breakdown */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {completedAttempt.answers.map((ans, idx) => (
                <div
                  key={ans.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white">
                      Q{idx + 1}: {ans.question?.question_text || `Question ${idx + 1}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        ans.is_correct
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {ans.is_correct ? "Correct" : "Needs Review"}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-300">
                    <p>
                      <strong className="text-slate-400">Your Answer: </strong>
                      {ans.answer_text}
                    </p>
                    {ans.question?.correct_answer && (
                      <p>
                        <strong className="text-slate-400">Target Concept / Answer: </strong>
                        {ans.question.correct_answer}
                      </p>
                    )}
                    {ans.feedback && (
                      <p className="text-slate-400 italic">"{ans.feedback}"</p>
                    )}
                  </div>

                  {ans.evaluation_details?.improvement_hint && (
                    <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 flex items-start gap-1.5 mt-2">
                      <Lightbulb className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{ans.evaluation_details.improvement_hint}</span>
                    </div>
                  )}

                  {ans.question?.source_citations && ans.question.source_citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                      <Bookmark className="w-3 h-3 text-purple-400" />
                      <span>Cited from Page {ans.question.source_citations[0].page_number}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                id="close-results-btn"
                type="button"
                onClick={() => {
                  setShowResultsModal(false);
                  setActiveQuiz(null);
                  setActiveAttempt(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Close & Return to Project
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
