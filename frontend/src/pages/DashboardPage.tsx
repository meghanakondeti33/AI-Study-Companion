import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api, SpaceItem, ProjectItem, LearnerContextItem } from "../api/client";
import { AppShell } from "../components/AppShell";
import GlobalAnalyticsSection from "../components/GlobalAnalyticsSection";
import {
  Folder,
  BookOpen,
  Plus,
  Target,
  ArrowRight,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  TrendingDown,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
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

  const strengths = learnerContexts.filter((c) => c.context_type === "strength");
  const weaknesses = learnerContexts.filter((c) => c.context_type === "weakness");

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
    <AppShell
      breadcrumbs={[{ label: "Overview" }]}
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSpaceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121A2D] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-[#172033] dark:text-[#F4F5F7] text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
            <span>New Space</span>
          </button>
          <button
            onClick={() => {
              if (spaces.length > 0 && !selectedSpaceId) {
                setSelectedSpaceId(spaces[0].id);
              }
              setIsProjectModalOpen(true);
            }}
            disabled={spaces.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] text-white text-xs font-semibold shadow-sm shadow-[#6C5CE7]/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Welcome Card */}
        <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-8 relative overflow-hidden shadow-xs transition-colors duration-200">
          <div className="absolute right-0 top-0 w-80 h-80 bg-[#6C5CE7]/5 dark:bg-[#8175F5]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30">
                <Sparkles className="w-3 h-3" />
                <span>AI Study Companion Workspace</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight">
                Welcome back, {user?.name || "Learner"}!
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
                Continue your learning journey with grounded AI tutoring, adaptive quizzes, and concept mastery tracking across your study spaces.
              </p>
            </div>

            <div className="flex sm:flex-col gap-3 shrink-0">
              <div className="px-5 py-3.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-center min-w-[120px]">
                <div className="text-xl font-extrabold text-[#172033] dark:text-[#F4F5F7]">{projects.length}</div>
                <div className="text-[10px] text-[#667085] dark:text-[#A7B0C0] uppercase tracking-wider font-bold">Active Projects</div>
              </div>
              <div className="px-5 py-3.5 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 text-center min-w-[120px]">
                <div className="text-xl font-extrabold text-[#6C5CE7] dark:text-[#8175F5]">{spaces.length}</div>
                <div className="text-[10px] text-[#6C5CE7] dark:text-[#8175F5] uppercase tracking-wider font-bold">Study Spaces</div>
              </div>
            </div>
          </div>
        </div>

        <GlobalAnalyticsSection />

        {/* Learner Context Section (Strengths & Areas to Review) */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strengths.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-5 flex gap-3.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Recognized Strengths</h4>
                  <ul className="text-xs text-[#172033] dark:text-[#F4F5F7] space-y-1">
                    {strengths.map((s) => (
                      <li key={s.id} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-[#172033] dark:text-[#F4F5F7]">{s.context_key}</span>
                        <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0]">({s.source})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50/60 dark:bg-rose-950/20 p-5 flex gap-3.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Topics to Review</h4>
                  <ul className="text-xs text-[#172033] dark:text-[#F4F5F7] space-y-1">
                    {weaknesses.map((w) => (
                      <li key={w.id} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="font-semibold text-[#172033] dark:text-[#F4F5F7]">{w.context_key}</span>
                        <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0]">({w.source})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Study Spaces Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#F0EDFF] dark:bg-[#211D42] flex items-center justify-center text-[#6C5CE7] dark:text-[#8175F5]">
                <Folder className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Study Spaces</h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-[#667085] dark:text-[#A7B0C0] font-semibold">
                {spaces.length}
              </span>
            </div>
          </div>

          {isLoadingSpaces ? (
            <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0]">Loading study spaces...</div>
          ) : spaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E3E6EF] dark:border-[#26324B] p-10 text-center space-y-3 bg-white dark:bg-[#121A2D] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EDFF] dark:bg-[#211D42] flex items-center justify-center mx-auto text-[#6C5CE7] dark:text-[#8175F5]">
                <Folder className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">No Spaces Created Yet</p>
              <p className="text-xs text-[#667085] dark:text-[#A7B0C0] max-w-sm mx-auto leading-relaxed">
                Spaces group your disciplines and overarching subjects (e.g. Computer Science, Machine Learning).
              </p>
              <button
                onClick={() => setIsSpaceModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] text-white font-semibold text-xs shadow-sm shadow-[#6C5CE7]/20 transition"
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
                    className="group rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-5 hover:border-[#6C5CE7]/50 dark:hover:border-[#8175F5]/50 hover:shadow-md transition space-y-3 block shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 group-hover:scale-105 transition">
                        <Folder className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border border-[#E3E6EF] dark:border-[#26324B]">
                        {spaceProjects.length} {spaceProjects.length === 1 ? "project" : "projects"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7] group-hover:text-[#6C5CE7] dark:group-hover:text-[#8175F5] transition">
                        {space.name}
                      </h4>
                      <p className="text-xs text-[#667085] dark:text-[#A7B0C0] line-clamp-2 mt-1 leading-relaxed">
                        {space.description || "No description provided."}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[#E3E6EF] dark:border-[#26324B] flex items-center justify-between text-xs text-[#667085] dark:text-[#A7B0C0]">
                      <span className="font-medium group-hover:text-[#172033] dark:group-hover:text-[#F4F5F7] transition">Explore space</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:text-[#6C5CE7] dark:group-hover:text-[#8175F5] transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Active Projects Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#F0EDFF] dark:bg-[#211D42] flex items-center justify-center text-[#6C5CE7] dark:text-[#8175F5]">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Active Projects</h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-[#667085] dark:text-[#A7B0C0] font-semibold">
                {projects.length}
              </span>
            </div>
          </div>

          {isLoadingProjects ? (
            <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0]">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E3E6EF] dark:border-[#26324B] p-10 text-center space-y-3 bg-white dark:bg-[#121A2D] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EDFF] dark:bg-[#211D42] flex items-center justify-center mx-auto text-[#6C5CE7] dark:text-[#8175F5]">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">No Projects Yet</p>
              <p className="text-xs text-[#667085] dark:text-[#A7B0C0] max-w-sm mx-auto leading-relaxed">
                Projects define a specific learning goal within a Space with focused document uploads and AI tutoring.
              </p>
              {spaces.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedSpaceId(spaces[0].id);
                    setIsProjectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] text-white font-semibold text-xs shadow-sm shadow-[#6C5CE7]/20 transition"
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
                    className="group rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-5 hover:border-[#6C5CE7]/50 dark:hover:border-[#8175F5]/50 hover:shadow-md transition space-y-3.5 block shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 group-hover:scale-105 transition">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      {parentSpace && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] truncate max-w-[140px] border border-[#E3E6EF] dark:border-[#26324B]">
                          {parentSpace.name}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7] group-hover:text-[#6C5CE7] dark:group-hover:text-[#8175F5] transition">
                        {project.name}
                      </h4>
                      <p className="text-xs text-[#667085] dark:text-[#A7B0C0] line-clamp-2 mt-1 leading-relaxed">
                        {project.description || "No description provided."}
                      </p>
                    </div>

                    {project.learning_goal && (
                      <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                        <Target className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="truncate text-[11px] font-semibold">{project.learning_goal}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#E3E6EF] dark:border-[#26324B] flex items-center justify-between text-xs text-[#667085] dark:text-[#A7B0C0]">
                      <span className="font-medium group-hover:text-[#172033] dark:group-hover:text-[#F4F5F7] transition">Open workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:text-[#6C5CE7] dark:group-hover:text-[#8175F5] transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create Space Modal */}
      {isSpaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1020]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#172033] dark:text-[#F4F5F7]">Create Study Space</h3>
              <button
                onClick={() => setIsSpaceModalOpen(false)}
                className="text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] p-1 rounded-lg hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {spaceError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{spaceError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Space Name</label>
                <input
                  type="text"
                  required
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Description (Optional)</label>
                <textarea
                  value={spaceDescription}
                  onChange={(e) => setSpaceDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the discipline or subject matter..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSpaceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSpaceMutation.isPending || !spaceName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] text-white font-semibold text-xs hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] transition shadow-sm shadow-[#6C5CE7]/20 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-[#0B1020]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#172033] dark:text-[#F4F5F7]">Create Learning Project</h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] p-1 rounded-lg hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {projectError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{projectError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Target Space</label>
                <select
                  required
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Distributed Systems Architecture"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Description (Optional)</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={2}
                  placeholder="Overview of this study project..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Learning Goal (Optional)</label>
                <input
                  type="text"
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  placeholder="e.g. Master consensus algorithms & Raft"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending || !projectName.trim() || !selectedSpaceId}
                  className="px-4 py-2 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] text-white font-semibold text-xs hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] transition shadow-sm shadow-[#6C5CE7]/20 disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
