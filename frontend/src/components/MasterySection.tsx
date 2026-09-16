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
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
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
      colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      barColor: "bg-emerald-500",
    };
  }
  if (score >= 50) {
    return {
      label: "Developing",
      colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      barColor: "bg-amber-500",
    };
  }
  return {
    label: "Needs Practice",
    colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    barColor: "bg-rose-500",
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
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Concept Mastery Tracking</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Deterministic
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Track your understanding of core concepts derived from course materials, updated deterministically from quizzes and active learning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {historyRecords.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              id="toggle-mastery-history-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
            >
              <History className="w-3.5 h-3.5" />
              {showHistory ? "Hide History" : "Audit Trail"}
            </button>
          )}

          <button
            onClick={handleRefresh}
            id="refresh-mastery-btn"
            disabled={isRefetchingConcepts}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700 disabled:opacity-50"
            title="Refresh concepts and mastery scores"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetchingConcepts ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          Analyzing concept mastery...
        </div>
      ) : concepts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center space-y-3 bg-slate-900/20">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-300">No Concepts Extracted Yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate" title={concept.name}>
                        {concept.name}
                      </h4>
                      {concept.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {concept.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right space-y-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.colorClass}`}
                      >
                        {hasBeenAssessed ? `${Math.round(score)}%` : "Not Assessed"}
                      </span>

                      {/* Trend indicator if previous history exists */}
                      {latestHistory && (
                        <div className="flex items-center justify-end gap-1 text-[10px]">
                          {latestHistory.new_score > latestHistory.previous_score ? (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" />
                              +{Math.round(latestHistory.new_score - latestHistory.previous_score)}%
                            </span>
                          ) : latestHistory.new_score < latestHistory.previous_score ? (
                            <span className="text-rose-400 flex items-center gap-0.5">
                              <TrendingDown className="w-3 h-3" />
                              {Math.round(latestHistory.new_score - latestHistory.previous_score)}%
                            </span>
                          ) : (
                            <span className="text-slate-500">stable</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          hasBeenAssessed ? badge.barColor : "bg-slate-700"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>0%</span>
                      <span className="text-slate-400 font-medium">
                        {hasBeenAssessed ? `${score.toFixed(1)}% Mastery` : "Baseline: 0%"}
                      </span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Footer with last assessed timestamp */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {hasBeenAssessed
                          ? `Assessed ${new Date(mastery.last_assessed_at).toLocaleDateString()}`
                          : "Awaiting first assessment"}
                      </span>
                    </div>

                    {hasBeenAssessed && (
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
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
              className="mt-6 rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <History className="w-4 h-4 text-sky-400" />
                  <span>Mastery Score Audit Trail</span>
                </div>
                <span className="text-[11px] text-slate-500">{historyRecords.length} records</span>
              </div>

              {historyRecords.length === 0 ? (
                <p className="text-xs text-slate-500">No score adjustments recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
                  {historyRecords.map((record) => (
                    <div
                      key={record.id}
                      className="py-2.5 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 truncate">
                            {record.concept_name || "Concept"}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
                            {record.source}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {new Date(record.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                        <span className="text-slate-400">{record.previous_score.toFixed(1)}%</span>
                        <span className="text-slate-600">→</span>
                        <span
                          className={`font-semibold ${
                            record.new_score >= record.previous_score
                              ? "text-emerald-400"
                              : "text-rose-400"
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
