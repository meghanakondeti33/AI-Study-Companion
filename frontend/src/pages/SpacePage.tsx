import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SpaceItem, ProjectItem } from "../api/client";
import { AppShell } from "../components/AppShell";
import {
  Folder,
  BookOpen,
  Plus,
  Trash2,
  Target,
  ArrowRight,
  AlertCircle,
  X,
} from "lucide-react";

export default function SpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);

  const {
    data: space,
    isLoading: isLoadingSpace,
    isError: isSpaceError,
  } = useQuery<SpaceItem>({
    queryKey: ["space", spaceId],
    queryFn: () => api.spaces.get(spaceId!),
    enabled: !!spaceId,
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<ProjectItem[]>({
    queryKey: ["projects", spaceId],
    queryFn: () => api.projects.list(spaceId),
    enabled: !!spaceId,
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: { space_id: string; name: string; description?: string; learning_goal?: string }) =>
      api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", spaceId] });
      setIsProjectModalOpen(false);
      setProjectName("");
      setProjectDescription("");
      setProjectGoal("");
      setProjectError(null);
    },
    onError: (err: any) => {
      setProjectError(err.message || "Failed to create project");
    },
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: () => api.spaces.delete(spaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      navigate("/dashboard");
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !spaceId) return;
    createProjectMutation.mutate({
      space_id: spaceId,
      name: projectName,
      description: projectDescription.trim() || undefined,
      learning_goal: projectGoal.trim() || undefined,
    });
  };

  const handleDeleteSpace = () => {
    if (confirm("Are you sure you want to delete this space and all projects inside it?")) {
      deleteSpaceMutation.mutate();
    }
  };

  if (isLoadingSpace) {
    return (
      <AppShell breadcrumbs={[{ label: "Spaces", href: "/dashboard" }, { label: "Loading..." }]}>
        <div className="py-20 text-center text-xs text-[#667085] dark:text-[#A7B0C0]">Loading space...</div>
      </AppShell>
    );
  }

  if (isSpaceError || !space) {
    return (
      <AppShell breadcrumbs={[{ label: "Spaces", href: "/dashboard" }, { label: "Not Found" }]}>
        <div className="py-20 flex flex-col items-center justify-center p-4 space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">Space not found or inaccessible</p>
          <Link to="/dashboard" className="text-xs text-[#6C5CE7] dark:text-[#8175F5] hover:underline font-semibold">
            Return to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: "Spaces", href: "/dashboard" },
        { label: space.name },
      ]}
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDeleteSpace}
            disabled={deleteSpaceMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/40 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Space</span>
          </button>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] text-white text-xs font-semibold shadow-sm shadow-[#6C5CE7]/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Project</span>
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Space Header Banner */}
        <section className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-8 space-y-3 relative overflow-hidden shadow-xs transition-colors duration-200">
          <div className="absolute right-0 top-0 w-80 h-80 bg-[#6C5CE7]/5 dark:bg-[#8175F5]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-2 text-xs text-[#6C5CE7] dark:text-[#8175F5] font-bold">
            <Folder className="w-4 h-4" />
            <span>Study Space</span>
          </div>
          <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight">{space.name}</h2>
          <p className="relative z-10 text-xs sm:text-sm text-[#667085] dark:text-[#A7B0C0] max-w-2xl leading-relaxed">
            {space.description || "No description provided for this space."}
          </p>
          <div className="relative z-10 pt-2 flex items-center justify-between">
            <span className="text-xs text-[#667085] dark:text-[#A7B0C0]">
              Created {new Date(space.created_at).toLocaleDateString()}
            </span>
          </div>
        </section>

        {/* Projects in this Space */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#F0EDFF] dark:bg-[#211D42] flex items-center justify-center text-[#6C5CE7] dark:text-[#8175F5]">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7]">Projects in {space.name}</h3>
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
              <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">No Projects in this Space Yet</p>
              <p className="text-xs text-[#667085] dark:text-[#A7B0C0] max-w-sm mx-auto leading-relaxed">
                Create your first project to begin organizing learning materials, notes, and AI-grounded tutoring.
              </p>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] text-white font-semibold text-xs shadow-sm shadow-[#6C5CE7]/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="group rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-5 hover:border-[#6C5CE7]/50 dark:hover:border-[#8175F5]/50 hover:shadow-md transition space-y-3.5 block shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 group-hover:scale-105 transition">
                      <BookOpen className="w-4 h-4" />
                    </div>
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
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1020]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#172033] dark:text-[#F4F5F7]">New Project in {space.name}</h3>
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
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Graph Algorithms Deep Dive"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Description (Optional)</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={2}
                  placeholder="Project scope or notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5">Learning Goal (Optional)</label>
                <input
                  type="text"
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  placeholder="e.g. Implement Dijkstra and A* from scratch"
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
                  disabled={createProjectMutation.isPending || !projectName.trim()}
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
