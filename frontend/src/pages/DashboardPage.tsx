import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api, SpaceItem, ProjectItem, LearnerContextItem } from "../api/client";
import {
  Layers,
  LogOut,
  Plus,
  Folder,
  BookOpen,
  Target,
  ArrowRight,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  TrendingDown,
  ShieldAlert
} from "lucide-react";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceError, setSpaceError] = useState<string | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);

  // Queries
  const { data: spaces = [], isLoading: isLoadingSpaces } = useQuery<SpaceItem[]>({
    queryKey: ["spaces"],
    queryFn: () => api.spaces.list(),
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<ProjectItem[]>({
    queryKey: ["projects"],
    queryFn: () => api.projects.list(),
  });

  const { data: learnerContexts = [] } = useQuery<LearnerContextItem[]>({
    queryKey: ["learner-context"],
    queryFn: () => api.learnerContext.getGlobalContext(),
  });

  const strengths = learnerContexts.filter(c => c.context_type === "strength");
  const weaknesses = learnerContexts.filter(c => c.context_type === "weakness");

  // Mutations
  const createSpaceMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => api.spaces.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      setIsSpaceModalOpen(false);
      setSpaceName("");
      setSpaceDescription("");
      setSpaceError(null);
    },
    onError: (err: any) => {
      setSpaceError(err.message || "Failed to create space");
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: { space_id: string; name: string; description?: string; learning_goal?: string }) =>
      api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsProjectModalOpen(false);
      setSelectedSpaceId("");
      setProjectName("");
      setProjectDescription("");
      setProjectGoal("");
      setProjectError(null);
    },
    onError: (err: any) => {
      setProjectError(err.message || "Failed to create project");
    },
  });

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim()) return;
    createSpaceMutation.mutate({
      name: spaceName,
      description: spaceDescription.trim() || undefined,
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const spaceId = selectedSpaceId || (spaces.length > 0 ? spaces[0].id : "");
    if (!projectName.trim() || !spaceId) return;
    createProjectMutation.mutate({
      space_id: spaceId,
      name: projectName,
      description: projectDescription.trim() || undefined,
      learning_goal: projectGoal.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white">AI Study Companion</h1>
              <p className="text-[11px] text-slate-400 font-medium">Personal Learning Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user?.is_admin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 hover:bg-amber-500/20 transition font-medium"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </Link>
            )}
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{user?.name}</div>
              <div className="text-[11px] text-slate-400">{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Welcome Banner */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-slate-950 p-6 relative overflow-hidden shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Sparkles className="w-3 h-3" />
                Phase 1 Active
              </div>
              <h2 className="text-xl font-bold text-white">Welcome back, {user?.name}!</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                Organize your study goals into Spaces (disciplines) and Projects (focused learning journeys).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSpaceModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition border border-slate-700"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                New Space
              </button>
              <button
                onClick={() => {
                  if (spaces.length > 0 && !selectedSpaceId) {
                    setSelectedSpaceId(spaces[0].id);
                  }
                  setIsProjectModalOpen(true);
                }}
                disabled={spaces.length === 0}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition shadow-md shadow-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        </section>

        {/* Global Learner Context Section */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strengths.length > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400 mb-1">Recognized Strengths</h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    {strengths.map(s => (
                      <li key={s.id}>• {s.context_key} (from {s.source})</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {weaknesses.length > 0 && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-md bg-rose-500/20 flex items-center justify-center">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-rose-400 mb-1">Topics to Review</h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    {weaknesses.map(w => (
                      <li key={w.id}>• {w.context_key} (from {w.source})</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Spaces Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-sky-400" />
              <h3 className="font-semibold text-base text-white">Study Spaces</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {spaces.length}
              </span>
            </div>
          </div>

          {isLoadingSpaces ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading spaces...</div>
          ) : spaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center space-y-3">
              <Folder className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No Spaces Created Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Spaces group your learning topics (e.g. Computer Science, Mathematics, Biology).
              </p>
              <button
                onClick={() => setIsSpaceModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Create your first Space
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {spaces.map((space) => {
                const spaceProjects = projects.filter((p) => p.space_id === space.id);
                return (
                  <Link
                    key={space.id}
                    to={`/spaces/${space.id}`}
                    className="group rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-sky-500/50 hover:bg-slate-900/70 transition space-y-3 block"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-105 transition">
                        <Folder className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {spaceProjects.length} {spaceProjects.length === 1 ? "project" : "projects"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-100 group-hover:text-sky-300 transition">
                        {space.name}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {space.description || "No description provided."}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                      <span>View space</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Projects Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-base text-white">Active Projects</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {projects.length}
              </span>
            </div>
          </div>

          {isLoadingProjects ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No Projects Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Projects define a specific learning goal within a Space (e.g. "Linear Algebra Mastery").
              </p>
              {spaces.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedSpaceId(spaces[0].id);
                    setIsProjectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-semibold text-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create a Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const parentSpace = spaces.find((s) => s.id === project.space_id);
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="group rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-indigo-500/50 hover:bg-slate-900/70 transition space-y-3 block"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      {parentSpace && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 truncate max-w-[120px]">
                          {parentSpace.name}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition">
                        {project.name}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {project.description || "No description provided."}
                      </p>
                    </div>

                    {project.learning_goal && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        <Target className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{project.learning_goal}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                      <span>Open workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Create Space Modal */}
      {isSpaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Study Space</h3>
              <button
                onClick={() => setIsSpaceModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {spaceError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{spaceError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Space Name</label>
                <input
                  type="text"
                  required
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={spaceDescription}
                  onChange={(e) => setSpaceDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the discipline or subject matter..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSpaceModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSpaceMutation.isPending || !spaceName.trim()}
                  className="px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400 transition disabled:opacity-50"
                >
                  {createSpaceMutation.isPending ? "Creating..." : "Create Space"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Learning Project</h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {projectError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{projectError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Space</label>
                <select
                  required
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Distributed Systems Architecture"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={2}
                  placeholder="Overview of this study project..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Learning Goal (Optional)</label>
                <input
                  type="text"
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  placeholder="e.g. Master consensus algorithms & Raft"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending || !projectName.trim() || !selectedSpaceId}
                  className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold text-xs hover:bg-indigo-400 transition disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
