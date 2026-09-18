import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  RecommendationItem,
} from "../api/client";
import {
  Lightbulb,
  BookOpen,
  Dumbbell,
  RotateCcw,
  Rocket,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface RecommendationsSectionProps {
  projectId: string;
}

function RecommendationIcon({ type }: { type: string }) {
  switch (type) {
    case "review":
      return <BookOpen className="w-4 h-4" />;
    case "practice":
      return <Dumbbell className="w-4 h-4" />;
    case "revisit":
      return <RotateCcw className="w-4 h-4" />;
    case "continue":
      return <Rocket className="w-4 h-4" />;
    default:
      return <Lightbulb className="w-4 h-4" />;
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "high") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 uppercase tracking-wider">
        High
      </span>
    );
  }
  if (priority === "medium") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 uppercase tracking-wider">
        Med
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border border-[#E3E6EF] dark:border-[#26324B] uppercase tracking-wider">
      Low
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    review: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40",
    practice: "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border-[#6C5CE7]/30 dark:border-[#8175F5]/30",
    revisit: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
    continue: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
  };
  const colorClass = colors[type] || "bg-gray-100 dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border-[#E3E6EF] dark:border-[#26324B]";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
      <RecommendationIcon type={type} />
      <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
    </span>
  );
}

export default function RecommendationsSection({ projectId }: RecommendationsSectionProps) {
  const queryClient = useQueryClient();

  const {
    data: recommendations = [],
    isLoading,
    isError,
  } = useQuery<RecommendationItem[]>({
    queryKey: ["recommendations", projectId],
    queryFn: () => api.recommendations.list(projectId, "active"),
    enabled: !!projectId,
    refetchInterval: 30000,
  });

  const completeMutation = useMutation({
    mutationFn: (recId: string) => api.recommendations.complete(recId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations", projectId] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (recId: string) => api.recommendations.dismiss(recId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations", projectId] });
    },
  });

  const highPriority = recommendations.filter((r) => r.priority === "high");
  const medPriority = recommendations.filter((r) => r.priority === "medium");
  const lowPriority = recommendations.filter((r) => r.priority === "low");

  return (
    <section
      id="recommendations-section"
      className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-7 space-y-6 shadow-sm transition-colors duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E3E6EF] dark:border-[#26324B] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#172033] dark:text-[#F4F5F7]">Personalized Recommendations</h3>
            {recommendations.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                {recommendations.length} active
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
            Evidence-based learning actions generated from your mastery trends and assessment performance.
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0] flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#6C5CE7] dark:text-[#8175F5]" />
          <span>Loading recommendations...</span>
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0]">
          Unable to load recommendations.
        </div>
      ) : recommendations.length === 0 ? (
        <div className="py-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] flex items-center justify-center mx-auto text-[#98A2B3] dark:text-[#7F8AA0]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">All Caught Up!</p>
          <p className="text-xs text-[#667085] dark:text-[#A7B0C0] max-w-sm mx-auto leading-relaxed">
            No active recommendations. Complete quizzes and tutor sessions to generate personalized study actions.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Render by priority groups */}
          {[
            { items: highPriority, label: "High Priority" },
            { items: medPriority, label: "Medium Priority" },
            { items: lowPriority, label: "Low Priority" },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label} className="space-y-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#667085] dark:text-[#A7B0C0]">
                  {group.label}
                </h4>
                <div className="space-y-2.5">
                  {group.items.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-4 hover:border-[#6C5CE7]/50 dark:hover:border-[#8175F5]/50 hover:bg-white dark:hover:bg-[#121A2D] transition group shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] flex items-center justify-center shrink-0 text-[#6C5CE7] dark:text-[#8175F5] mt-0.5">
                            <RecommendationIcon type={rec.recommendation_type} />
                          </div>
                          <div className="min-w-0 space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-semibold text-[#172033] dark:text-[#F4F5F7]">{rec.title}</h5>
                              <TypeBadge type={rec.recommendation_type} />
                              <PriorityBadge priority={rec.priority} />
                            </div>
                            <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">{rec.description}</p>
                            {rec.target_concept_name && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#6C5CE7] dark:text-[#8175F5] font-medium">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Concept: {rec.target_concept_name}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => completeMutation.mutate(rec.id)}
                            disabled={completeMutation.isPending}
                            title="Mark as completed"
                            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => dismissMutation.mutate(rec.id)}
                            disabled={dismissMutation.isPending}
                            title="Dismiss"
                            className="p-1.5 rounded-lg text-[#98A2B3] dark:text-[#7F8AA0] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
