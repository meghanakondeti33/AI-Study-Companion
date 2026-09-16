import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  GrowthOverviewItem,
  ConceptGrowthItem,
} from "../api/client";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Loader2,
} from "lucide-react";

interface GrowthSectionProps {
  projectId: string;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");

  if (normalized === "improving") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <TrendingUp className="w-3.5 h-3.5" />
        Improving
      </span>
    );
  }
  if (normalized === "requiring_attention" || normalized === "requiring attention") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5" />
        Requiring Attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
      <Minus className="w-3.5 h-3.5" />
      Stable
    </span>
  );
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-mono font-semibold">
        <TrendingUp className="w-3 h-3" />
        +{delta.toFixed(1)}%
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-mono font-semibold">
        <TrendingDown className="w-3 h-3" />
        {delta.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-mono font-semibold">
      <Minus className="w-3 h-3" />
      0.0%
    </span>
  );
}

function ConceptRow({ concept }: { concept: ConceptGrowthItem }) {
  const normalized = concept.status.toLowerCase().replace(/\s+/g, "_");
  const barColor =
    normalized === "improving"
      ? "bg-emerald-500"
      : normalized === "requiring_attention"
      ? "bg-amber-500"
      : "bg-slate-500";
  const bgColor =
    normalized === "improving"
      ? "bg-emerald-500/5"
      : normalized === "requiring_attention"
      ? "bg-amber-500/5"
      : "bg-slate-800/30";

  return (
    <div className={`rounded-lg p-3 ${bgColor} border border-slate-800/60`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-white truncate" title={concept.concept_name}>
          {concept.concept_name}
        </span>
        <DeltaIndicator delta={concept.trend_delta} />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-900/80 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${Math.min(concept.mastery_score, 100)}%` }}
          />
        </div>
        <span className="text-[11px] text-slate-400 font-mono w-10 text-right">
          {concept.mastery_score.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function GrowthSection({ projectId }: GrowthSectionProps) {
  const {
    data: overview,
    isLoading,
    isError,
  } = useQuery<GrowthOverviewItem>({
    queryKey: ["growth-overview", projectId],
    queryFn: () => api.growth.getOverview(projectId),
    enabled: !!projectId,
    refetchInterval: 30000,
  });

  return (
    <section
      id="growth-section"
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Growth Trajectory</h3>
          </div>
          <p className="text-xs text-slate-400">
            Deterministic learner growth classification based on mastery trends and assessment evidence.
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          Loading growth data...
        </div>
      ) : isError || !overview ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Unable to load growth data. Complete a quiz or tutor session to generate learning evidence.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Overall Status */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Growth Status
              </p>
              <StatusBadge status={overview.status} />
            </div>

            {/* Overall Mastery */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Overall Mastery
              </p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-extrabold text-white font-mono">
                  {overview.overall_mastery.toFixed(1)}%
                </span>
                <DeltaIndicator delta={overview.trend_delta} />
              </div>
              <div className="bg-slate-900/80 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${Math.min(overview.overall_mastery, 100)}%` }}
                />
              </div>
            </div>

            {/* Concepts Tracked */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Concepts Tracked
              </p>
              <span className="text-2xl font-extrabold text-white font-mono">
                {overview.concept_count}
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                {overview.improving_concepts.length > 0 && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {overview.improving_concepts.length} improving
                  </span>
                )}
                {overview.attention_concepts.length > 0 && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {overview.attention_concepts.length} need attention
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Concept Breakdowns */}
          {overview.attention_concepts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Requiring Attention ({overview.attention_concepts.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {overview.attention_concepts.map((c) => (
                  <ConceptRow key={c.concept_id} concept={c} />
                ))}
              </div>
            </div>
          )}

          {overview.improving_concepts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Improving ({overview.improving_concepts.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {overview.improving_concepts.map((c) => (
                  <ConceptRow key={c.concept_id} concept={c} />
                ))}
              </div>
            </div>
          )}

          {overview.stable_concepts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Stable ({overview.stable_concepts.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {overview.stable_concepts.map((c) => (
                  <ConceptRow key={c.concept_id} concept={c} />
                ))}
              </div>
            </div>
          )}

          {overview.concept_count === 0 && (
            <div className="py-8 text-center text-xs text-slate-500 space-y-2">
              <BarChart3 className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="font-medium text-slate-300">No Concepts Tracked Yet</p>
              <p>Upload materials and complete quizzes to start tracking your growth trajectory.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
