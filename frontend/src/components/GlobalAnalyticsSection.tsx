import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import {
  Globe,
  FolderOpen,
  BookOpen,
  Sparkles,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

export default function GlobalAnalyticsSection() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["global-analytics"],
    queryFn: () => api.analytics.getGlobalAnalytics(),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-white/50 dark:bg-[#121A2D]/50 rounded-2xl"></div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="w-5 h-5 text-[#6C5CE7] dark:text-[#8175F5]" />
        <h2 className="text-lg font-bold text-[#172033] dark:text-[#F4F5F7]">
          Global Learning Overview
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <FolderOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Projects</span>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {analytics.total_projects}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Materials</span>
          </div>
          <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {analytics.total_materials}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Tutor Qs</span>
          </div>
          <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {analytics.total_tutor_questions}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Quiz Avg</span>
          </div>
          <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {analytics.quiz_average_score.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
