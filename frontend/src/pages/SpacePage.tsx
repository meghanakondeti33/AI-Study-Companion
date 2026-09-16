import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SpaceItem, ProjectItem } from "../api/client";
import {
  Folder,
  BookOpen,
  ArrowLeft,
  Plus,
  Trash2,
  Target,
  ArrowRight,
  AlertCircle,
  X
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

  if (isLoadingSpace) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">
        Loading space...
      </div>
    );
  }

  if (isSpaceError || !space) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm font-semibold text-white">Space not found or inaccessible</p>
        <Link to="/dashboard" className="text-xs text-sky-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <button
            onClick={handleDeleteSpace}
            disabled={deleteSpaceMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Space
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Space Header */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/60 to-slate-950 p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2 text-xs text-sky-400 font-semibold">
            <Folder className="w-4 h-4" />
            Study Space
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{space.name}</h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            {space.description || "No description provided for this space."}
          </p>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Created {new Date(space.created_at).toLocaleDateString()}
            </span>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Project
            </button>
          </div>
        </section>

        {/* Projects in this Space */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-base text-white">Projects in {space.name}</h3>
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
              <p className="text-sm font-medium text-slate-300">No Projects in this Space Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create your first project to begin organizing learning materials and goals.
              </p>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-semibold text-xs transition"
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
                  className="group rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-indigo-500/50 hover:bg-slate-900/70 transition space-y-3 block"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition">
                      <BookOpen className="w-4 h-4" />
                    </div>
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
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">New Project in {space.name}</h3>
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
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Graph Algorithms Deep Dive"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={2}
                  placeholder="Project scope or notes..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Learning Goal (Optional)</label>
                <input
                  type="text"
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  placeholder="e.g. Implement Dijkstra and A* from scratch"
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
                  disabled={createProjectMutation.isPending || !projectName.trim()}
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
