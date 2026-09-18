import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ConceptItem,
  ConceptMasteryItem,
  MasteryHistoryItem,
} from "../api/client";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  History,
  BookOpen,
} from "lucide-react";

interface MasterySectionProps {
  projectId: string;
}

function getMasteryBadge(score: number) {
  if (score >= 80) {
    return {
      label: "Mastered",
      colorClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
      barColor: "bg-[#16A37A] dark:bg-[#32C79A]",
    };
  }
  if (score >= 50) {
    return {
      label: "Developing",
      colorClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
      barColor: "bg-[#E9A23B] dark:bg-[#F2B84B]",
    };
  }
  return {
    label: "Needs Practice",
    colorClass: "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40",
    barColor: "bg-[#E05252] dark:bg-[#F06A6A]",
  };
}

export default function MasterySection({ projectId }: MasterySectionProps) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  // Queries
  const {
    data: concepts = [],
    isLoading: isLoadingConcepts,
    isRefetching: isRefetchingConcepts,
  } = useQuery<ConceptItem[]>({
    queryKey: ["project-concepts", projectId],
    queryFn: () => api.mastery.getConcepts(projectId),
    enabled: !!projectId,
  });

  const {
    data: masteries = [],
    isLoading: isLoadingMastery,
  } = useQuery<ConceptMasteryItem[]>({
    queryKey: ["project-mastery", projectId],
    queryFn: () => api.mastery.getMastery(projectId),
    enabled: !!projectId,
  });

  const {
    data: historyRecords = [],
    isLoading: isLoadingHistory,
  } = useQuery<MasteryHistoryItem[]>({
    queryKey: ["project-mastery-history", projectId],
    queryFn: () => api.mastery.getMasteryHistory(projectId),
    enabled: !!projectId,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["project-concepts", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-mastery", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-mastery-history", projectId] });
  };

  // Map mastery by concept_id
  const masteryMap = new Map<string, ConceptMasteryItem>();
  masteries.forEach((m) => masteryMap.set(m.concept_id, m));

  // Map latest history by concept_id for trend
  const latestHistoryMap = new Map<string, MasteryHistoryItem>();
  historyRecords.forEach((h) => {
    if (!latestHistoryMap.has(h.concept_id)) {
      latestHistoryMap.set(h.concept_id, h);
    }
  });

  const isLoading = isLoadingConcepts || isLoadingMastery;

  return (
    <section
      id="mastery-section"
      className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-7 space-y-6 shadow-sm transition-colors duration-200"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E6EF] dark:border-[#26324B] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#172033] dark:text-[#F4F5F7]">Concept Mastery Tracking</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              Deterministic
            </span>
          </div>
          <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
            Track your understanding of core concepts derived from course materials, updated deterministically from quizzes and active learning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {historyRecords.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              id="toggle-mastery-history-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] hover:bg-white dark:hover:bg-[#121A2D] text-[#172033] dark:text-[#F4F5F7] text-xs font-semibold transition border border-[#E3E6EF] dark:border-[#26324B] shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
              <span>{showHistory ? "Hide Audit" : "Audit Trail"}</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            id="refresh-mastery-btn"
            disabled={isRefetchingConcepts}
            className="p-2 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] hover:bg-white dark:hover:bg-[#121A2D] text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition border border-[#E3E6EF] dark:border-[#26324B] disabled:opacity-50"
            title="Refresh concepts and mastery scores"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetchingConcepts ? "animate-spin text-[#6C5CE7] dark:text-[#8175F5]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0] flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Analyzing concept mastery...</span>
        </div>
      ) : concepts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E3E6EF] dark:border-[#26324B] p-10 text-center space-y-3 bg-[#FAF9FF] dark:bg-[#18223A]">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">No Concepts Extracted Yet</p>
          <p className="text-xs text-[#667085] dark:text-[#A7B0C0] max-w-md mx-auto leading-relaxed">
            Upload courseware PDF materials or generate a quiz to extract learning concepts and start tracking mastery.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="concepts-grid">
            {concepts.map((concept) => {
              const mastery = masteryMap.get(concept.id);
              const score = mastery ? mastery.mastery_score : 0;
              const hasBeenAssessed = !!mastery;
              const badge = getMasteryBadge(score);
              const latestHistory = latestHistoryMap.get(concept.id);

              return (
                <div
                  key={concept.id}
                  data-testid="concept-mastery-card"
                  className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-5 space-y-3.5 hover:border-[#6C5CE7]/50 dark:hover:border-[#8175F5]/50 hover:bg-white dark:hover:bg-[#121A2D] transition shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7] truncate" title={concept.name}>
                        {concept.name}
                      </h4>
                      {concept.description && (
                        <p className="text-xs text-[#667085] dark:text-[#A7B0C0] line-clamp-2 leading-relaxed">
                          {concept.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right space-y-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.colorClass}`}
                      >
                        {hasBeenAssessed ? `${Math.round(score)}%` : "Not Assessed"}
                      </span>

                      {/* Trend indicator if previous history exists */}
                      {latestHistory && (
                        <div className="flex items-center justify-end gap-1 text-[10px]">
                          {latestHistory.new_score > latestHistory.previous_score ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" />
                              +{Math.round(latestHistory.new_score - latestHistory.previous_score)}%
                            </span>
                          ) : latestHistory.new_score < latestHistory.previous_score ? (
                            <span className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-0.5">
                              <TrendingDown className="w-3 h-3" />
                              {Math.round(latestHistory.new_score - latestHistory.previous_score)}%
                            </span>
                          ) : (
                            <span className="text-[#667085] dark:text-[#A7B0C0]">stable</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full bg-[#F0EDFF] dark:bg-[#211D42] rounded-full h-2.5 overflow-hidden border border-[#E3E6EF] dark:border-[#26324B]">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          hasBeenAssessed ? badge.barColor : "bg-[#D0D5DD] dark:bg-[#354361]"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#667085] dark:text-[#A7B0C0] font-mono">
                      <span>0%</span>
                      <span className="text-[#172033] dark:text-[#F4F5F7] font-semibold">
                        {hasBeenAssessed ? `${score.toFixed(1)}% Mastery` : "Baseline: 0%"}
                      </span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Footer with last assessed timestamp */}
                  <div className="pt-2 border-t border-[#E3E6EF] dark:border-[#26324B] flex items-center justify-between text-[11px] text-[#667085] dark:text-[#A7B0C0]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        {hasBeenAssessed
                          ? `Assessed ${new Date(mastery.last_assessed_at).toLocaleDateString()}`
                          : "Awaiting first assessment"}
                      </span>
                    </div>

                    {hasBeenAssessed && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#667085] dark:text-[#A7B0C0]">
                        {badge.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit Trail / History view */}
          {showHistory && (
            <div
              id="mastery-history-audit"
              className="mt-6 rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E3E6EF] dark:border-[#26324B] pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#172033] dark:text-[#F4F5F7]">
                  <History className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5]" />
                  <span>Mastery Score Audit Trail</span>
                </div>
                <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0]">{historyRecords.length} records</span>
              </div>

              {historyRecords.length === 0 ? (
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0]">No score adjustments recorded yet.</p>
              ) : (
                <div className="divide-y divide-[#E3E6EF] dark:divide-[#26324B] max-h-60 overflow-y-auto">
                  {historyRecords.map((record) => (
                    <div
                      key={record.id}
                      className="py-2.5 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#172033] dark:text-[#F4F5F7] truncate">
                            {record.concept_name || "Concept"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white dark:bg-[#121A2D] text-[#172033] dark:text-[#F4F5F7] border border-[#E3E6EF] dark:border-[#26324B]">
                            {record.source}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#667085] dark:text-[#A7B0C0]">
                          {new Date(record.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                        <span className="text-[#667085] dark:text-[#A7B0C0]">{record.previous_score.toFixed(1)}%</span>
                        <span className="text-[#667085] dark:text-[#A7B0C0]">→</span>
                        <span
                          className={`font-bold ${
                            record.new_score >= record.previous_score
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {record.new_score.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
