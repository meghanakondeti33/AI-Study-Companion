import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ConceptItem, ConceptMasteryItem, QuizItem, MaterialItem, TutorConversationItem, GrowthOverviewItem } from "../api/client";
import {
  BarChart3,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Target,
  FileText,
  HelpCircle,
} from "lucide-react";

interface ProjectAnalyticsProps {
  projectId: string;
}

export default function ProjectAnalyticsSection({ projectId }: ProjectAnalyticsProps) {
  const { data: materials = [] } = useQuery<MaterialItem[]>({
    queryKey: ["materials", projectId],
    queryFn: () => api.materials.list(projectId),
    enabled: !!projectId,
  });

  const { data: concepts = [] } = useQuery<ConceptItem[]>({
    queryKey: ["project-concepts", projectId],
    queryFn: () => api.mastery.getConcepts(projectId),
    enabled: !!projectId,
  });

  const { data: masteries = [] } = useQuery<ConceptMasteryItem[]>({
    queryKey: ["project-mastery", projectId],
    queryFn: () => api.mastery.getMastery(projectId),
    enabled: !!projectId,
  });

  const { data: quizzes = [] } = useQuery<QuizItem[]>({
    queryKey: ["project-quizzes", projectId],
    queryFn: () => api.quizzes.list(projectId),
    enabled: !!projectId,
  });

  const { data: conversations = [] } = useQuery<TutorConversationItem[]>({
    queryKey: ["tutor-conversations", projectId],
    queryFn: () => api.tutor.listConversations(projectId),
    enabled: !!projectId,
  });

  const { data: growth } = useQuery<GrowthOverviewItem>({
    queryKey: ["project-growth", projectId],
    queryFn: () => api.growth.getOverview(projectId),
    enabled: !!projectId,
  });

  // Calculate metrics
  const totalMaterials = materials.length;
  const readyMaterials = materials.filter((m) => m.status === "READY").length;
  const totalPagesIndexed = materials.reduce((acc, m) => acc + (m.page_count || 0), 0);

  const totalConcepts = concepts.length;
  const masteredConcepts = masteries.filter((m) => m.mastery_score >= 80).length;
  const developingConcepts = masteries.filter((m) => m.mastery_score >= 50 && m.mastery_score < 80).length;
  const needsPracticeConcepts = masteries.filter((m) => m.mastery_score < 50).length;

  const averageMastery =
    masteries.length > 0
      ? Math.round(masteries.reduce((acc, m) => acc + m.mastery_score, 0) / masteries.length)
      : 0;

  const completedQuizzes = quizzes.filter((q) => q.status === "completed").length;
  const totalQuizzes = quizzes.length;

  return (
    <div id="analytics-section" className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-7 shadow-sm transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#172033] dark:text-[#F4F5F7]">Project Learning Analytics</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30">
                Real-Time Telemetry
              </span>
            </div>
            <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
              Comprehensive telemetry tracking your knowledge acquisition, quiz evaluations, and Socratic study engagement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0] flex items-center gap-2 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
              <span>Grounded in {readyMaterials} PDFs</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Mastery */}
        <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-5 space-y-3 shadow-xs hover:border-[#6C5CE7]/40 dark:hover:border-[#8175F5]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] dark:text-[#A7B0C0]">Average Mastery</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight">
              {averageMastery}%
            </span>
            <span className="text-xs text-[#667085] dark:text-[#A7B0C0] ml-1.5 font-medium">overall score</span>
          </div>
          <div className="w-full bg-[#E3E6EF] dark:bg-[#26324B] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${averageMastery}%` }}
            />
          </div>
        </div>

        {/* Card 2: Knowledge Coverage */}
        <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-5 space-y-3 shadow-xs hover:border-[#6C5CE7]/40 dark:hover:border-[#8175F5]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] dark:text-[#A7B0C0]">Concept Coverage</span>
            <div className="w-7 h-7 rounded-lg bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight">
              {masteredConcepts}
            </span>
            <span className="text-xs text-[#667085] dark:text-[#A7B0C0] ml-1.5 font-medium">/ {totalConcepts} mastered</span>
          </div>
          <div className="w-full bg-[#E3E6EF] dark:bg-[#26324B] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6C5CE7] to-[#8174FC] dark:from-[#8175F5] dark:to-[#9187FF] rounded-full transition-all duration-500"
              style={{
                width: totalConcepts > 0 ? `${Math.round((masteredConcepts / totalConcepts) * 100)}%` : "0%",
              }}
            />
          </div>
        </div>

        {/* Card 3: Adaptive Quizzes */}
        <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-5 space-y-3 shadow-xs hover:border-[#6C5CE7]/40 dark:hover:border-[#8175F5]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] dark:text-[#A7B0C0]">Quizzes Evaluated</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight">
              {completedQuizzes}
            </span>
            <span className="text-xs text-[#667085] dark:text-[#A7B0C0] ml-1.5 font-medium">/ {totalQuizzes} completed</span>
          </div>
          <div className="w-full bg-[#E3E6EF] dark:bg-[#26324B] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{
                width: totalQuizzes > 0 ? `${Math.round((completedQuizzes / totalQuizzes) * 100)}%` : "0%",
              }}
            />
          </div>
        </div>

        {/* Card 4: Socratic Tutor Sessions */}
        <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-5 space-y-3 shadow-xs hover:border-[#6C5CE7]/40 dark:hover:border-[#8175F5]/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#667085] dark:text-[#A7B0C0]">Tutor Sessions</span>
            <div className="w-7 h-7 rounded-lg bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight">
              {conversations.length}
            </span>
            <span className="text-xs text-[#667085] dark:text-[#A7B0C0] ml-1.5 font-medium">study threads</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#A7B0C0]">
            <Clock className="w-3 h-3" />
            <span>{totalPagesIndexed} indexed pages</span>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Concept Mastery Distribution */}
        <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E3E6EF] dark:border-[#26324B] pb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5]" />
              <h4 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Concept Mastery Distribution</h4>
            </div>
            <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-mono font-medium">{totalConcepts} Total</span>
          </div>

          <div className="space-y-3">
            {/* Mastered (>= 80%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Mastered (80%+)
                </span>
                <span className="font-mono text-[#172033] dark:text-[#F4F5F7] font-bold">{masteredConcepts}</span>
              </div>
              <div className="w-full bg-[#E3E6EF] dark:bg-[#26324B] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: totalConcepts > 0 ? `${(masteredConcepts / totalConcepts) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>

            {/* Developing (50 - 79%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Developing (50–79%)
                </span>
                <span className="font-mono text-[#172033] dark:text-[#F4F5F7] font-bold">{developingConcepts}</span>
              </div>
              <div className="w-full bg-[#E3E6EF] dark:bg-[#26324B] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: totalConcepts > 0 ? `${(developingConcepts / totalConcepts) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>

            {/* Needs Practice (< 50%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  Needs Practice (&lt;50%)
                </span>
                <span className="font-mono text-[#172033] dark:text-[#F4F5F7] font-bold">{needsPracticeConcepts}</span>
              </div>
              <div className="w-full bg-[#E3E6EF] dark:bg-[#26324B] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{
                    width: totalConcepts > 0 ? `${(needsPracticeConcepts / totalConcepts) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Study Materials & Corpus Pipeline */}
        <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E3E6EF] dark:border-[#26324B] pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5]" />
              <h4 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Knowledge Base Corpus</h4>
            </div>
            <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-mono font-medium">{totalPagesIndexed} Pages</span>
          </div>

          <div className="space-y-3">
            {materials.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#667085] dark:text-[#A7B0C0] italic bg-[#FAF9FF] dark:bg-[#18223A] rounded-xl border border-[#E3E6EF] dark:border-[#26324B]">
                No PDF materials uploaded yet. Upload documents to activate knowledge graph analytics.
              </div>
            ) : (
              materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5] shrink-0" />
                    <span className="font-semibold text-[#172033] dark:text-[#F4F5F7] truncate">{m.original_filename}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[#667085] dark:text-[#A7B0C0] font-mono font-medium">{m.page_count || 0} pages</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        m.status === "READY"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
