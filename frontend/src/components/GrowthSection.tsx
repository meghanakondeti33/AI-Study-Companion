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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Improving</span>
      </span>
    );
  }
  if (normalized === "requiring_attention" || normalized === "requiring attention") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>Requiring Attention</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border border-[#E3E6EF] dark:border-[#26324B]">
      <Minus className="w-3.5 h-3.5 text-[#98A2B3] dark:text-[#7F8AA0]" />
      <span>Stable</span>
    </span>
  );
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[#16A37A] dark:text-[#32C79A] text-xs font-mono font-semibold">
        <TrendingUp className="w-3 h-3" />
        +{delta.toFixed(1)}%
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[#E05252] dark:text-[#F06A6A] text-xs font-mono font-semibold">
        <TrendingDown className="w-3 h-3" />
        {delta.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[#98A2B3] dark:text-[#7F8AA0] text-xs font-mono font-semibold">
      <Minus className="w-3 h-3" />
      0.0%
    </span>
  );
}

function ConceptRow({ concept }: { concept: ConceptGrowthItem }) {
  const normalized = concept.status.toLowerCase().replace(/\s+/g, "_");
  const barColor =
    normalized === "improving"
      ? "bg-[#16A37A] dark:bg-[#32C79A]"
      : normalized === "requiring_attention"
      ? "bg-[#E9A23B] dark:bg-[#F2B84B]"
      : "bg-[#6C5CE7] dark:bg-[#8175F5]";
  const bgColor =
    normalized === "improving"
      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
      : normalized === "requiring_attention"
      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40"
      : "bg-[#FAF9FF] dark:bg-[#18223A] border-[#E3E6EF] dark:border-[#26324B]";

  return (
    <div className={`rounded-xl p-3.5 ${bgColor} border shadow-xs`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] truncate" title={concept.concept_name}>
          {concept.concept_name}
        </span>
        <DeltaIndicator delta={concept.trend_delta} />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-[#E3E6EF] dark:bg-[#26324B] rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${Math.min(concept.mastery_score, 100)}%` }}
          />
        </div>
        <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-mono w-10 text-right font-medium">
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
      className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-7 space-y-6 shadow-sm transition-colors duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E3E6EF] dark:border-[#26324B] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#172033] dark:text-[#F4F5F7]">Growth Trajectory</h3>
          </div>
          <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
            Deterministic learner growth classification based on mastery trends and assessment evidence.
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0] flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#6C5CE7] dark:text-[#8175F5]" />
          <span>Loading growth trajectory...</span>
        </div>
      ) : isError || !overview ? (
        <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0]">
          Unable to load growth data. Complete a quiz or tutor session to generate learning evidence.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Overall Status */}
            <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-5 space-y-3">
              <p className="text-[11px] font-semibold text-[#667085] dark:text-[#A7B0C0] uppercase tracking-wider">
                Growth Status
              </p>
              <StatusBadge status={overview.status} />
            </div>

            {/* Overall Mastery */}
            <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-5 space-y-2">
              <p className="text-[11px] font-semibold text-[#667085] dark:text-[#A7B0C0] uppercase tracking-wider">
                Overall Mastery
              </p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-extrabold text-[#172033] dark:text-[#F4F5F7] font-mono">
                  {overview.overall_mastery.toFixed(1)}%
                </span>
                <DeltaIndicator delta={overview.trend_delta} />
              </div>
              <div className="bg-[#E3E6EF] dark:bg-[#26324B] rounded-full h-2 overflow-hidden border border-[#E3E6EF] dark:border-[#26324B]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6C5CE7] to-[#8174FC] dark:from-[#8175F5] dark:to-[#9187FF] transition-all duration-700"
                  style={{ width: `${Math.min(overview.overall_mastery, 100)}%` }}
                />
              </div>
            </div>

            {/* Concepts Tracked */}
            <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-5 space-y-2">
              <p className="text-[11px] font-semibold text-[#667085] dark:text-[#A7B0C0] uppercase tracking-wider">
                Concepts Tracked
              </p>
              <span className="text-2xl font-extrabold text-[#172033] dark:text-[#F4F5F7] font-mono">
                {overview.concept_count}
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                {overview.improving_concepts.length > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{overview.improving_concepts.length} improving</span>
                  </span>
                )}
                {overview.attention_concepts.length > 0 && (
                  <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>{overview.attention_concepts.length} need attention</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Concept Breakdowns */}
          {overview.attention_concepts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Requiring Attention ({overview.attention_concepts.length})</span>
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
              <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Improving ({overview.improving_concepts.length})</span>
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
              <h4 className="text-xs font-semibold text-[#667085] dark:text-[#A7B0C0] flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Stable ({overview.stable_concepts.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {overview.stable_concepts.map((c) => (
                  <ConceptRow key={c.concept_id} concept={c} />
                ))}
              </div>
            </div>
          )}

          {overview.concept_count === 0 && (
            <div className="py-8 text-center text-xs text-[#667085] dark:text-[#A7B0C0] space-y-2">
              <BarChart3 className="w-8 h-8 text-[#98A2B3] dark:text-[#7F8AA0] mx-auto" />
              <p className="font-semibold text-[#172033] dark:text-[#F4F5F7]">No Concepts Tracked Yet</p>
              <p>Upload materials and complete quizzes to start tracking your growth trajectory.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
