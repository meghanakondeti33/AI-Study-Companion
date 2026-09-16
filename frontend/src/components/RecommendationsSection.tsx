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
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase tracking-wider">
        High
      </span>
    );
  }
  if (priority === "medium") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 uppercase tracking-wider">
        Med
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/25 uppercase tracking-wider">
      Low
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    review: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    practice: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    revisit: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    continue: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  const colorClass = colors[type] || "bg-slate-500/10 text-slate-400 border-slate-500/20";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
      <RecommendationIcon type={type} />
      {type.charAt(0).toUpperCase() + type.slice(1)}
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
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Personalized Recommendations</h3>
            {recommendations.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {recommendations.length} active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Evidence-based learning actions generated from your mastery trends and assessment performance.
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          Loading recommendations...
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Unable to load recommendations.
        </div>
      ) : recommendations.length === 0 ? (
        <div className="py-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">All Caught Up!</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No active recommendations. Complete quizzes and tutor sessions to generate personalized study actions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Render by priority groups */}
          {[
            { items: highPriority, label: "High Priority" },
            { items: medPriority, label: "Medium Priority" },
            { items: lowPriority, label: "Low Priority" },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label} className="space-y-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </h4>
                <div className="space-y-2">
                  {group.items.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700 transition group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                            <RecommendationIcon type={rec.recommendation_type} />
                          </div>
                          <div className="min-w-0 space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-semibold text-white">{rec.title}</h5>
                              <TypeBadge type={rec.recommendation_type} />
                              <PriorityBadge priority={rec.priority} />
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
                            {rec.target_concept_name && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 font-medium">
                                <ArrowUpRight className="w-3 h-3" />
                                Concept: {rec.target_concept_name}
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
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => dismissMutation.mutate(rec.id)}
                            disabled={dismissMutation.isPending}
                            title="Dismiss"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
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
