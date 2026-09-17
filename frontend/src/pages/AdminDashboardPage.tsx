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
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Learner App</span>
          </Link>
          <div className="h-5 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span className="font-semibold tracking-tight text-white">Administration Console</span>
            <span className="px-2 py-0.5 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full font-mono">
              System Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleRefreshAll}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1.5 transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <div className="text-xs text-slate-400 font-mono">
            Admin: <span className="text-slate-200">{user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Total Users</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats?.total_users ?? 0}</span>
              <span className="text-xs text-emerald-400 font-medium">({stats?.active_users ?? 0} active)</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Spaces / Projects</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats?.total_projects ?? 0}</span>
              <span className="text-xs text-slate-400">in {stats?.total_spaces ?? 0} spaces</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Study Materials</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats?.total_materials ?? 0}</span>
              <span className="text-xs text-sky-400">PDF documents</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Quizzes & Attempts</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats?.total_quizzes ?? 0}</span>
              <span className="text-xs text-purple-400">({stats?.total_quiz_attempts ?? 0} taken)</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-xs text-slate-400 font-medium">AI Requests</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sky-400">{stats?.total_ai_requests ?? 0}</span>
              <span className="text-xs text-slate-400">invocations</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Background Jobs</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">{stats?.total_background_jobs ?? 0}</span>
              <span className="text-xs text-slate-400">tasks</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("health")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "health"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Infrastructure Health</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "users"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts ({stats?.total_users ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "projects"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Spaces & Projects ({stats?.total_projects ?? 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "ai"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>AI Observability & Evaluations</span>
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "jobs"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Background Task Queues</span>
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "activity"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Learning Activity Feed</span>
          </button>
        </div>

        {/* Tab Content: Infrastructure Health */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-sm">PostgreSQL + pgvector</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono rounded-full ${
                      health?.services.database === "connected"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {health?.services.database ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Primary transactional database and vector embeddings persistence.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-sm">Redis Broker & Cache</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono rounded-full ${
                      health?.services.redis === "connected"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {health?.services.redis ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Celery background job queue message broker and temporary results store.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-sm">Document Storage Subsystem</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono rounded-full ${
                      health?.services.storage === "ready"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {health?.services.storage ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Isolated local storage path for PDF uploads and extracted document chunks.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-sm">AI Provider Service</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono rounded-full ${
                      health?.services.ai_provider === "configured"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-700 text-slate-300 border border-slate-600"
                    }`}
                  >
                    {health?.services.ai_provider ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Controlled AI layer (OpenAI LLM & embeddings) with deterministic mock fallback in development.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-sm">Background Worker</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono rounded-full ${
                      health?.services.celery_broker === "connected"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {health?.services.celery_broker ?? "checking..."}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Celery distributed asynchronous worker processing PDF chunking and contextual refreshes.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-sm">Overall Status</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono rounded-full uppercase ${
                      health?.status === "healthy"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {health?.status ?? "unknown"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
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
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="text-xs text-slate-400">
                Total found: <span className="text-white font-semibold">{usersData?.total ?? 0}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Name & Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Spaces</th>
                    <th className="px-4 py-3">Projects</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersData?.users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{u.name}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_admin ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-400 rounded-full">
                            Learner
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] ${
                            u.is_active ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.is_active ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          />
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{u.spaces_count}</td>
                      <td className="px-4 py-3 text-slate-300">{u.projects_count}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {u.last_activity_at
                          ? new Date(u.last_activity_at).toLocaleString()
                          : "No activity yet"}
                      </td>
                    </tr>
                  ))}
                  {(!usersData || usersData.users.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
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
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Space</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Materials</th>
                  <th className="px-4 py-3">Quizzes</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {projectsData?.projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{p.name}</div>
                      {p.learning_goal && (
                        <div className="text-slate-500 text-[11px] truncate max-w-xs">{p.learning_goal}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.space_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{p.user_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{p.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.materials_count}</td>
                    <td className="px-4 py-3 text-slate-300">{p.quizzes_count}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!projectsData || projectsData.projects.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Total AI Invocations</span>
                <div className="mt-2 text-2xl font-bold text-white">{aiData?.total_requests ?? 0}</div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-emerald-400">{aiData?.successful_requests ?? 0} success</span>
                  <span className="text-rose-400">{aiData?.failed_requests ?? 0} failed</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Average Latency</span>
                <div className="mt-2 text-2xl font-bold text-sky-400">
                  {Math.round(aiData?.average_latency_ms ?? 0)} ms
                </div>
                <span className="text-[11px] text-slate-500">Across all model endpoints</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Total Token Consumption</span>
                <div className="mt-2 text-2xl font-bold text-purple-400">
                  {aiData?.total_tokens.toLocaleString() ?? 0}
                </div>
                <span className="text-[11px] text-slate-500">Prompt & completion tokens</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">AI Evaluation Quality</span>
                <div className="mt-2 text-2xl font-bold text-emerald-400">
                  {Math.round(aiData?.evaluations.average_score ?? 0)}%
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {aiData?.evaluations.passed_evaluations ?? 0} passed / {aiData?.evaluations.total_evaluations ?? 0} total
                </div>
              </div>
            </div>

            {/* Feature Breakdown */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-semibold text-sm text-slate-200">AI Feature Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-2">Feature / Module</th>
                      <th className="py-2">Total Invocations</th>
                      <th className="py-2">Successful</th>
                      <th className="py-2">Failed</th>
                      <th className="py-2">Avg Latency</th>
                      <th className="py-2">Total Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {aiData?.features.map((f) => (
                      <tr key={f.feature} className="hover:bg-slate-800/20">
                        <td className="py-2.5 font-medium text-slate-200 capitalize">{f.feature}</td>
                        <td className="py-2.5 text-slate-300">{f.total_requests}</td>
                        <td className="py-2.5 text-emerald-400">{f.successful_requests}</td>
                        <td className="py-2.5 text-rose-400">{f.failed_requests}</td>
                        <td className="py-2.5 font-mono text-slate-400">{Math.round(f.average_latency_ms)} ms</td>
                        <td className="py-2.5 font-mono text-slate-400">{f.total_tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!aiData || aiData.features.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
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
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Queued</span>
                <div className="mt-2 text-2xl font-bold text-amber-400">{jobsData?.queued_count ?? 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Running</span>
                <div className="mt-2 text-2xl font-bold text-sky-400">{jobsData?.running_count ?? 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Completed</span>
                <div className="mt-2 text-2xl font-bold text-emerald-400">{jobsData?.completed_count ?? 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400">Failed</span>
                <div className="mt-2 text-2xl font-bold text-rose-400">{jobsData?.failed_count ?? 0}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Job Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Attempts</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Error / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {jobsData?.recent_jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-mono font-medium text-slate-200">{j.job_type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
                            j.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : j.status === "RUNNING"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                              : j.status === "FAILED"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{j.user_email}</td>
                      <td className="px-4 py-3 text-slate-300">{j.attempts}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {new Date(j.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                        {j.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                  {(!jobsData || jobsData.recent_jobs.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Activity Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activityData?.events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">{e.user_email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{e.description}</td>
                  </tr>
                ))}
                {(!activityData || activityData.events.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No learning events recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
