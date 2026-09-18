import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  api,
  AdminStats,
  AdminUserListResponse,
  AdminProjectListResponse,
  AdminActivityListResponse,
  AdminAIObservabilityResponse,
  AdminJobsResponse,
  AdminSystemHealth,
} from "../api/client";
import { AppShell } from "../components/AppShell";
import {
  ShieldAlert,
  Server,
  Users,
  FolderTree,
  BrainCircuit,
  Activity,
  Cpu,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  HardDrive,
  Clock,
  Search,
  Zap,
  Sparkles,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"health" | "users" | "projects" | "ai" | "jobs" | "activity">("health");
  const [userSearch, setUserSearch] = useState("");

  // Queries
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.admin.getStats(),
  });

  const {
    data: health,
    isLoading: isLoadingHealth,
    refetch: refetchHealth,
  } = useQuery<AdminSystemHealth>({
    queryKey: ["admin", "health"],
    queryFn: () => api.admin.getSystemHealth(),
  });

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery<AdminUserListResponse>({
    queryKey: ["admin", "users", userSearch],
    queryFn: () => api.admin.getUsers({ search: userSearch || undefined, limit: 50 }),
  });

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    refetch: refetchProjects,
  } = useQuery<AdminProjectListResponse>({
    queryKey: ["admin", "projects"],
    queryFn: () => api.admin.getProjects({ limit: 50 }),
  });

  const {
    data: aiData,
    isLoading: isLoadingAI,
    refetch: refetchAI,
  } = useQuery<AdminAIObservabilityResponse>({
    queryKey: ["admin", "ai"],
    queryFn: () => api.admin.getAIObservability(30),
  });

  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
  } = useQuery<AdminJobsResponse>({
    queryKey: ["admin", "jobs"],
    queryFn: () => api.admin.getJobs({ limit: 50 }),
  });

  const {
    data: activityData,
    isLoading: isLoadingActivity,
    refetch: refetchActivity,
  } = useQuery<AdminActivityListResponse>({
    queryKey: ["admin", "activity"],
    queryFn: () => api.admin.getLearningActivity({ limit: 100 }),
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchHealth();
    refetchUsers();
    refetchProjects();
    refetchAI();
    refetchJobs();
    refetchActivity();
  };

  return (
    <AppShell
      breadcrumbs={[{ label: "Administration Console" }]}
      actions={
        <button
          onClick={handleRefreshAll}
          className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-[#121A2D] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] text-[#172033] dark:text-[#F4F5F7] rounded-xl flex items-center gap-1.5 transition border border-[#E3E6EF] dark:border-[#26324B] shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
          <span>Refresh All</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Total Users</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#172033] dark:text-[#F4F5F7]">{stats?.total_users ?? 0}</span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">({stats?.active_users ?? 0} active)</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Spaces / Projects</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#172033] dark:text-[#F4F5F7]">{stats?.total_projects ?? 0}</span>
              <span className="text-xs text-[#667085] dark:text-[#A7B0C0]">in {stats?.total_spaces ?? 0} spaces</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Study Materials</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#172033] dark:text-[#F4F5F7]">{stats?.total_materials ?? 0}</span>
              <span className="text-xs text-sky-700 dark:text-sky-400 font-semibold">PDFs</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Quizzes Taken</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#172033] dark:text-[#F4F5F7]">{stats?.total_quizzes ?? 0}</span>
              <span className="text-xs text-[#6C5CE7] dark:text-[#8175F5] font-semibold">({stats?.total_quiz_attempts ?? 0} runs)</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">AI Invocations</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#6C5CE7] dark:text-[#8175F5]">{stats?.total_ai_requests ?? 0}</span>
              <span className="text-xs text-[#667085] dark:text-[#A7B0C0]">calls</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Background Jobs</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.total_background_jobs ?? 0}</span>
              <span className="text-xs text-[#667085] dark:text-[#A7B0C0]">tasks</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#E3E6EF] dark:border-[#26324B] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("health")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
              activeTab === "health"
                ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30"
                : "text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A]"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Infrastructure Health</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
              activeTab === "users"
                ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30"
                : "text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A]"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts ({stats?.total_users ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
              activeTab === "projects"
                ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30"
                : "text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A]"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Spaces & Projects ({stats?.total_projects ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
              activeTab === "ai"
                ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30"
                : "text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A]"
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>AI Observability & Evaluations</span>
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
              activeTab === "jobs"
                ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30"
                : "text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A]"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Background Queues</span>
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
              activeTab === "activity"
                ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30"
                : "text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A]"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity Feed</span>
          </button>
        </div>

        {/* Tab Content: Infrastructure Health */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5]" />
                    <span className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">PostgreSQL + pgvector</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono rounded-full font-semibold ${
                      health?.services.database === "connected"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                    }`}
                  >
                    {health?.services.database ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
                  Primary transactional database and vector embeddings persistence (1536 dims).
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Redis Broker & Cache</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono rounded-full font-semibold ${
                      health?.services.redis === "connected"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                    }`}
                  >
                    {health?.services.redis ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
                  Celery background job queue message broker and temporary results store.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5]" />
                    <span className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Storage Subsystem</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono rounded-full font-semibold ${
                      health?.services.storage === "ready"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                    }`}
                  >
                    {health?.services.storage ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
                  Isolated local storage path for PDF uploads and extracted document chunks.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">AI Provider Service</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono rounded-full font-semibold ${
                      health?.services.ai_provider === "configured"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                        : "bg-gray-100 dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border border-[#E3E6EF] dark:border-[#26324B]"
                    }`}
                  >
                    {health?.services.ai_provider ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
                  Google Gemini 2.5 Flash LLM and Gemini Embedding 2 for document embeddings and tutor reasoning.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5]" />
                    <span className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Background Worker</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono rounded-full font-semibold ${
                      health?.services.celery_broker === "connected"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                    }`}
                  >
                    {health?.services.celery_broker ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
                  Celery distributed asynchronous worker processing PDF chunking and contextual refreshes.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Overall System</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono rounded-full uppercase font-bold ${
                      health?.status === "healthy"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                    }`}
                  >
                    {health?.status ?? "unknown"}
                  </span>
                </div>
                <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed font-medium">
                  App: {health?.app_name} (v{health?.version}, env: {health?.environment})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: User Accounts */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#98A2B3] dark:text-[#7F8AA0] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] rounded-xl text-xs text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition shadow-xs"
                />
              </div>
              <div className="text-xs text-[#667085] dark:text-[#A7B0C0]">
                Total found: <span className="text-[#172033] dark:text-[#F4F5F7] font-bold">{usersData?.total ?? 0}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] font-semibold border-b border-[#E3E6EF] dark:border-[#26324B]">
                  <tr>
                    <th className="px-4 py-3.5">Name & Email</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Spaces</th>
                    <th className="px-4 py-3.5">Projects</th>
                    <th className="px-4 py-3.5">Registered</th>
                    <th className="px-4 py-3.5">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E6EF] dark:divide-[#26324B]">
                  {usersData?.users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#172033] dark:text-[#F4F5F7]">{u.name}</div>
                        <div className="text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px]">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.is_admin ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded-full">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-gray-100 dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border border-[#E3E6EF] dark:border-[#26324B] rounded-full">
                            Learner
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                            u.is_active ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.is_active ? "bg-[#16A37A] dark:bg-[#32C79A]" : "bg-[#E05252] dark:bg-[#F06A6A]"
                            }`}
                          />
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[#172033] dark:text-[#F4F5F7] font-medium">{u.spaces_count}</td>
                      <td className="px-4 py-3.5 text-[#172033] dark:text-[#F4F5F7] font-medium">{u.projects_count}</td>
                      <td className="px-4 py-3.5 text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px]">
                        {u.last_activity_at
                          ? new Date(u.last_activity_at).toLocaleString()
                          : "No activity yet"}
                      </td>
                    </tr>
                  ))}
                  {(!usersData || usersData.users.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[#667085] dark:text-[#A7B0C0]">
                        No users found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Spaces & Projects */}
        {activeTab === "projects" && (
          <div className="overflow-x-auto rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] font-semibold border-b border-[#E3E6EF] dark:border-[#26324B]">
                <tr>
                  <th className="px-4 py-3.5">Project</th>
                  <th className="px-4 py-3.5">Space</th>
                  <th className="px-4 py-3.5">Owner</th>
                  <th className="px-4 py-3.5">Materials</th>
                  <th className="px-4 py-3.5">Quizzes</th>
                  <th className="px-4 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EF] dark:divide-[#26324B]">
                {projectsData?.projects.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#172033] dark:text-[#F4F5F7]">{p.name}</div>
                      {p.learning_goal && (
                        <div className="text-[#667085] dark:text-[#A7B0C0] text-[11px] truncate max-w-xs">{p.learning_goal}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#172033] dark:text-[#F4F5F7] font-medium">{p.space_name}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#172033] dark:text-[#F4F5F7]">{p.user_name}</div>
                      <div className="text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px]">{p.user_email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[#172033] dark:text-[#F4F5F7] font-medium">{p.materials_count}</td>
                    <td className="px-4 py-3.5 text-[#172033] dark:text-[#F4F5F7] font-medium">{p.quizzes_count}</td>
                    <td className="px-4 py-3.5 text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!projectsData || projectsData.projects.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#667085] dark:text-[#A7B0C0]">
                      No projects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab Content: AI Observability & Evaluation */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-sm">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Total Invocations</span>
                <div className="mt-2 text-2xl font-bold text-[#172033] dark:text-[#F4F5F7]">{aiData?.total_requests ?? 0}</div>
                <div className="mt-1 flex items-center gap-2 text-xs font-semibold">
                  <span className="text-emerald-700 dark:text-emerald-400">{aiData?.successful_requests ?? 0} success</span>
                  <span className="text-rose-700 dark:text-rose-400">{aiData?.failed_requests ?? 0} failed</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-sm">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Average Latency</span>
                <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {Math.round(aiData?.average_latency_ms ?? 0)} ms
                </div>
                <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0]">Across all model endpoints</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-sm">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Token Consumption</span>
                <div className="mt-2 text-2xl font-bold text-[#6C5CE7] dark:text-[#8175F5]">
                  {aiData?.total_tokens.toLocaleString() ?? 0}
                </div>
                <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0]">Prompt & completion tokens</span>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-sm">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Evaluation Quality</span>
                <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round(aiData?.evaluations.average_score ?? 0)}%
                </div>
                <div className="mt-1 text-xs text-[#667085] dark:text-[#A7B0C0] font-medium">
                  {aiData?.evaluations.passed_evaluations ?? 0} passed / {aiData?.evaluations.total_evaluations ?? 0} total
                </div>
              </div>
            </div>

            {/* Feature Breakdown */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] space-y-4 shadow-sm">
              <h3 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">AI Feature Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border-b border-[#E3E6EF] dark:border-[#26324B] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Feature / Module</th>
                      <th className="py-2.5 px-3">Total Invocations</th>
                      <th className="py-2.5 px-3">Successful</th>
                      <th className="py-2.5 px-3">Failed</th>
                      <th className="py-2.5 px-3">Avg Latency</th>
                      <th className="py-2.5 px-3">Total Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E6EF] dark:divide-[#26324B]">
                    {aiData?.features.map((f) => (
                      <tr key={f.feature} className="hover:bg-[#FAF9FF] dark:hover:bg-[#18223A]">
                        <td className="py-2.5 px-3 font-semibold text-[#172033] dark:text-[#F4F5F7] capitalize">{f.feature}</td>
                        <td className="py-2.5 px-3 text-[#172033] dark:text-[#F4F5F7] font-medium">{f.total_requests}</td>
                        <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-semibold">{f.successful_requests}</td>
                        <td className="py-2.5 px-3 text-rose-700 dark:text-rose-400 font-semibold">{f.failed_requests}</td>
                        <td className="py-2.5 px-3 font-mono text-[#667085] dark:text-[#A7B0C0]">{Math.round(f.average_latency_ms)} ms</td>
                        <td className="py-2.5 px-3 font-mono text-[#667085] dark:text-[#A7B0C0]">{f.total_tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!aiData || aiData.features.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#667085] dark:text-[#A7B0C0]">
                          No AI telemetry recorded in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Background Jobs */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-sm">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Queued</span>
                <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{jobsData?.queued_count ?? 0}</div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-sm">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Running</span>
                <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">{jobsData?.running_count ?? 0}</div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-sm">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Completed</span>
                <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{jobsData?.completed_count ?? 0}</div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-sm">
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0] font-semibold uppercase tracking-wider">Failed</span>
                <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{jobsData?.failed_count ?? 0}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] font-semibold border-b border-[#E3E6EF] dark:border-[#26324B]">
                  <tr>
                    <th className="px-4 py-3.5">Job Type</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Attempts</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-4 py-3.5">Error / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E6EF] dark:divide-[#26324B]">
                  {jobsData?.recent_jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition">
                      <td className="px-4 py-3.5 font-mono font-semibold text-[#172033] dark:text-[#F4F5F7]">{j.job_type}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            j.status === "COMPLETED"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                              : j.status === "RUNNING"
                              ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40"
                              : j.status === "FAILED"
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px]">{j.user_email}</td>
                      <td className="px-4 py-3.5 text-[#172033] dark:text-[#F4F5F7] font-medium">{j.attempts}</td>
                      <td className="px-4 py-3.5 text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px]">
                        {new Date(j.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3.5 text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px] truncate max-w-xs">
                        {j.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                  {(!jobsData || jobsData.recent_jobs.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#667085] dark:text-[#A7B0C0]">
                        No background jobs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Learning Activity Feed */}
        {activeTab === "activity" && (
          <div className="overflow-x-auto rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] font-semibold border-b border-[#E3E6EF] dark:border-[#26324B]">
                <tr>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Event Type</th>
                  <th className="px-4 py-3.5">Activity Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EF] dark:divide-[#26324B]">
                {activityData?.events.map((e) => (
                  <tr key={e.id} className="hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition">
                    <td className="px-4 py-3.5 text-[#667085] dark:text-[#A7B0C0] font-mono text-[11px]">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#667085] dark:text-[#A7B0C0] text-[11px]">{e.user_email}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-[#18223A] text-[#172033] dark:text-[#F4F5F7] rounded border border-[#E3E6EF] dark:border-[#26324B]">
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#172033] dark:text-[#F4F5F7] font-medium">{e.description}</td>
                  </tr>
                ))}
                {(!activityData || activityData.events.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#667085] dark:text-[#A7B0C0]">
                      No learning events recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
