import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  QuizItem,
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
      handleStartQuiz(newQuiz);
    },
    onError: (err: any) => {
      setCreateError(err.message || "Failed to generate quiz. Please verify study materials are processed.");
    },
  });

  const handleStartQuiz = async (quiz: QuizItem) => {
    try {
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
    if (submittedAnswers[questionId]) return;
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
    <section id="quizzes-section" className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-7 space-y-6 shadow-sm transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E6EF] dark:border-[#26324B] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#172033] dark:text-[#F4F5F7]">Adaptive Quizzes</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30">
              Diagnostic Evaluation
            </span>
          </div>
          <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4DD6] dark:bg-[#8175F5] dark:hover:bg-[#9187FF] text-white text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#6C5CE7]/20"
            title={!hasReadyMaterials ? "Upload and process materials before generating quizzes" : "Generate a new quiz"}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Quiz</span>
          </button>
        </div>
      </div>

      {/* Notice if no materials ready */}
      {!hasReadyMaterials && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Upload and process at least one study PDF to unlock grounded adaptive quiz generation.</span>
        </div>
      )}

      {/* Quizzes List */}
      {isLoadingQuizzes ? (
        <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#6C5CE7] dark:text-[#8175F5]" />
          <span>Loading project quizzes...</span>
        </div>
      ) : safeQuizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E3E6EF] dark:border-[#26324B] p-10 text-center space-y-3 bg-[#FAF9FF] dark:bg-[#18223A]">
          <div className="w-12 h-12 rounded-2xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">No Quizzes Generated Yet</p>
          <p className="text-xs text-[#667085] dark:text-[#A7B0C0] max-w-md mx-auto leading-relaxed">
            Generate your first quiz to evaluate your retention on core concepts. Quizzes include automated MCQ grading and intelligent AI diagnostics on open-ended answers.
          </p>
          {hasReadyMaterials && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#121A2D] hover:bg-[#F0EDFF] dark:hover:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30 text-xs font-semibold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Quiz</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-5 space-y-4 hover:border-[#6C5CE7]/50 dark:hover:border-[#8175F5]/50 hover:bg-white dark:hover:bg-[#121A2D] transition relative flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7] leading-snug">{quiz.title}</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 shrink-0">
                    {quiz.question_count} {quiz.question_count === 1 ? "Question" : "Questions"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#667085] dark:text-[#A7B0C0]">
                  <span>Created {new Date(quiz.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="capitalize font-medium">{quiz.status.toLowerCase()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E3E6EF] dark:border-[#26324B] flex items-center justify-between">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0]">Grounded in study material</span>
                <button
                  id={`start-quiz-${quiz.id}`}
                  onClick={() => handleStartQuiz(quiz)}
                  className="start-quiz-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4DD6] dark:bg-[#8175F5] dark:hover:bg-[#9187FF] text-white text-xs font-semibold transition shadow-sm shadow-[#6C5CE7]/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Quiz</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Quiz Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#172033]/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E3E6EF] dark:border-[#26324B] pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5]" />
                <h3 className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">Generate Adaptive Quiz</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] p-1 rounded-lg hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">
                  Quiz Title (Optional)
                </label>
                <input
                  id="quiz-title-input"
                  type="text"
                  placeholder="e.g. Chapter 1 Mastery Check"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] px-3.5 py-2.5 text-xs text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">
                  Target Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["easy", "medium", "hard"].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setCreateDifficulty(diff)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize border transition ${
                        createDifficulty === diff
                          ? "bg-[#6C5CE7] dark:bg-[#8175F5] text-white border-[#6C5CE7] dark:border-[#8175F5] shadow-xs"
                          : "bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border-[#E3E6EF] dark:border-[#26324B] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-white dark:hover:bg-[#121A2D]"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCreateNumQuestions(num)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                        createNumQuestions === num
                          ? "bg-[#6C5CE7] dark:bg-[#8175F5] text-white border-[#6C5CE7] dark:border-[#8175F5] shadow-xs"
                          : "bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border-[#E3E6EF] dark:border-[#26324B] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-white dark:hover:bg-[#121A2D]"
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E3E6EF] dark:border-[#26324B]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={generateQuizMutation.isPending}
                className="px-4 py-2 rounded-xl border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition font-semibold"
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4DD6] dark:bg-[#8175F5] dark:hover:bg-[#9187FF] text-white text-xs font-semibold transition shadow-sm shadow-[#6C5CE7]/20 disabled:opacity-50"
              >
                {generateQuizMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Grounded Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Quiz</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Quiz Taking Modal / Overlay */}
      {activeAttempt && activeQuiz && currentQuestion && (
        <div className="fixed inset-0 z-50 bg-[#172033]/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-[#172033] dark:text-[#F4F5F7]">
            {/* Header / Progress */}
            <div className="space-y-3 border-b border-[#E3E6EF] dark:border-[#26324B] pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-[#6C5CE7] dark:text-[#8175F5]">{activeQuiz.title}</span>
                  <span className="text-[#98A2B3] dark:text-[#7F8AA0]">•</span>
                  <span className="text-[#667085] dark:text-[#A7B0C0] font-medium">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Exit this quiz attempt? Your progress so far will be saved.")) {
                      setActiveAttempt(null);
                    }
                  }}
                  className="text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] p-1 rounded-lg hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#F0EDFF] dark:bg-[#211D42] h-2 rounded-full overflow-hidden border border-[#E3E6EF] dark:border-[#26324B]">
                <div
                  className="bg-gradient-to-r from-[#6C5CE7] to-[#8174FC] dark:from-[#8175F5] dark:to-[#9187FF] h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF9FF] dark:bg-[#18223A] text-[#172033] dark:text-[#F4F5F7] border border-[#E3E6EF] dark:border-[#26324B]">
                  {currentQuestion.question_type === "mcq" ? "Multiple Choice" : "Open-Ended Concept"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30">
                  {currentQuestion.difficulty}
                </span>
                {currentQuestion.source_citations && currentQuestion.source_citations.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#667085] dark:text-[#A7B0C0] font-mono">
                    <Bookmark className="w-3 h-3 text-[#6C5CE7] dark:text-[#8175F5]" />
                    <span>Page {currentQuestion.source_citations[0].page_number}</span>
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[#172033] dark:text-[#F4F5F7] leading-snug">
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
                            ? "bg-[#F0EDFF] dark:bg-[#211D42] border-[#6C5CE7] dark:border-[#8175F5] text-[#172033] dark:text-[#F4F5F7] font-semibold shadow-xs"
                            : "bg-[#FAF9FF] dark:bg-[#18223A] border-[#E3E6EF] dark:border-[#26324B] text-[#172033] dark:text-[#F4F5F7] hover:border-[#6C5CE7]/40 dark:hover:border-[#8175F5]/40 hover:bg-white dark:hover:bg-[#121A2D]"
                        } ${isCurrentSubmitted ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                            isSelected
                              ? "border-[#6C5CE7] dark:border-[#8175F5] bg-[#6C5CE7] dark:bg-[#8175F5]"
                              : "border-[#D0D5DD] dark:border-[#354361] bg-white dark:bg-[#121A2D]"
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
                    className="w-full rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] p-3.5 text-xs text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition disabled:opacity-75"
                  />
                </div>
              )}

              {/* Answer Evaluation Feedback Box */}
              {isCurrentSubmitted && currentAnswerObj && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2.5 animate-in fade-in duration-200 ${
                    currentAnswerObj.is_correct
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {currentAnswerObj.is_correct ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Correct!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Needs Review</span>
                      </>
                    )}
                  </div>
                  <p className="text-[#172033] dark:text-[#F4F5F7] leading-relaxed">{currentAnswerObj.feedback}</p>

                  {/* Open-Ended Diagnostic Details */}
                  {currentAnswerObj.evaluation_details && (
                    <div className="space-y-2 pt-2 border-t border-[#E3E6EF] dark:border-[#26324B] text-[11px]">
                      {currentAnswerObj.evaluation_details.strengths?.length > 0 && (
                        <div>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">Strengths: </span>
                          <span className="text-[#172033] dark:text-[#F4F5F7]">
                            {currentAnswerObj.evaluation_details.strengths.join(", ")}
                          </span>
                        </div>
                      )}
                      {currentAnswerObj.evaluation_details.gaps?.length > 0 && (
                        <div>
                          <span className="font-bold text-amber-700 dark:text-amber-400">Gaps: </span>
                          <span className="text-[#172033] dark:text-[#F4F5F7]">
                            {currentAnswerObj.evaluation_details.gaps.join(", ")}
                          </span>
                        </div>
                      )}
                      {currentAnswerObj.evaluation_details.improvement_hint && (
                        <div className="flex items-start gap-2 text-[#172033] dark:text-[#F4F5F7] bg-[#F0EDFF] dark:bg-[#211D42] p-2.5 rounded-xl border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 mt-1">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#6C5CE7] dark:text-[#8175F5]" />
                          <span>
                            <strong className="text-[#6C5CE7] dark:text-[#8175F5]">Hint: </strong>
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
            <div className="flex items-center justify-between pt-4 border-t border-[#E3E6EF] dark:border-[#26324B]">
              <button
                id="prev-question-btn"
                type="button"
                onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                {!isCurrentSubmitted ? (
                  <button
                    id="submit-answer-btn"
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={isSubmittingAnswer || !answersMap[currentQuestion.id]?.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4DD6] dark:bg-[#8175F5] dark:hover:bg-[#9187FF] text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[#6C5CE7]/20"
                  >
                    {isSubmittingAnswer ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submit Answer</span>
                      </>
                    )}
                  </button>
                ) : currentQuestionIndex < questions.length - 1 ? (
                  <button
                    id="next-question-btn"
                    type="button"
                    onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4DD6] dark:bg-[#8175F5] dark:hover:bg-[#9187FF] text-white text-xs font-semibold transition shadow-sm shadow-[#6C5CE7]/20"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="complete-quiz-btn"
                    type="button"
                    onClick={handleCompleteQuiz}
                    disabled={isCompletingAttempt || !allQuestionsAnswered}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16A37A] hover:bg-[#138a67] dark:bg-[#32C79A] dark:hover:bg-[#28ad84] text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm shadow-emerald-600/20"
                  >
                    {isCompletingAttempt ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Scoring...</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-3.5 h-3.5" />
                        <span>Complete Quiz & View Score</span>
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
        <div id="quiz-results" className="fixed inset-0 z-50 bg-[#172033]/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-[#172033] dark:text-[#F4F5F7]">
            <div className="text-center space-y-2 border-b border-[#E3E6EF] dark:border-[#26324B] pb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center mx-auto mb-2">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#172033] dark:text-[#F4F5F7]">Quiz Completed</h3>
              <p className="text-xs text-[#667085] dark:text-[#A7B0C0]">Here is your grounded diagnostic evaluation report.</p>

              {/* Score Display */}
              <div className="pt-2">
                <span
                  id="quiz-score"
                  className="text-4xl sm:text-5xl font-black text-[#6C5CE7] dark:text-[#8175F5]"
                >
                  {completedAttempt.score !== null ? `${completedAttempt.score}%` : "100%"}
                </span>
                <p className="text-xs font-semibold text-[#667085] dark:text-[#A7B0C0] mt-1">
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
                  className="p-4 rounded-xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[#172033] dark:text-[#F4F5F7]">
                      Q{idx + 1}: {ans.question?.question_text || `Question ${idx + 1}`}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        ans.is_correct
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                      }`}
                    >
                      {ans.is_correct ? "Correct" : "Needs Review"}
                    </span>
                  </div>

                  <div className="space-y-1 text-[#172033] dark:text-[#F4F5F7]">
                    <p>
                      <strong className="text-[#667085] dark:text-[#A7B0C0]">Your Answer: </strong>
                      {ans.answer_text}
                    </p>
                    {ans.question?.correct_answer && (
                      <p>
                        <strong className="text-[#667085] dark:text-[#A7B0C0]">Target Concept / Answer: </strong>
                        {ans.question.correct_answer}
                      </p>
                    )}
                    {ans.feedback && (
                      <p className="text-[#667085] dark:text-[#A7B0C0] italic">"{ans.feedback}"</p>
                    )}
                  </div>

                  {ans.evaluation_details?.improvement_hint && (
                    <div className="p-2.5 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 text-[11px] text-[#172033] dark:text-[#F4F5F7] flex items-start gap-2 mt-2">
                      <Lightbulb className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5] shrink-0 mt-0.5" />
                      <span>{ans.evaluation_details.improvement_hint}</span>
                    </div>
                  )}

                  {ans.question?.source_citations && ans.question.source_citations.length > 0 && (
                    <div className="pt-2 border-t border-[#E3E6EF] dark:border-[#26324B] flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#A7B0C0] font-mono">
                      <Bookmark className="w-3 h-3 text-[#6C5CE7] dark:text-[#8175F5]" />
                      <span>Cited from Page {ans.question.source_citations[0].page_number}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E3E6EF] dark:border-[#26324B] flex items-center justify-end gap-2">
              <button
                id="close-results-btn"
                type="button"
                onClick={() => {
                  setShowResultsModal(false);
                  setActiveQuiz(null);
                  setActiveAttempt(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] hover:bg-[#6C5CE7] dark:hover:bg-[#8175F5] text-[#6C5CE7] dark:text-[#8175F5] hover:text-white dark:hover:text-white text-xs font-semibold transition"
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
