import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ProjectItem, SpaceItem } from "../api/client";
import {
  BookOpen,
  ArrowLeft,
  Target,
  FileText,
  MessageSquare,
  Sparkles,
  Clock,
  Trash2,
  AlertCircle
} from "lucide-react";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: project,
    isLoading,
    isError,
  } = useQuery<ProjectItem>({
    queryKey: ["project", projectId],
    queryFn: () => api.projects.get(projectId!),
    enabled: !!projectId,
  });

  const { data: space } = useQuery<SpaceItem>({
    queryKey: ["space", project?.space_id],
    queryFn: () => api.spaces.get(project!.space_id),
    enabled: !!project?.space_id,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => api.projects.delete(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (project?.space_id) {
        navigate(`/spaces/${project.space_id}`);
      } else {
        navigate("/dashboard");
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">
        Loading project workspace...
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm font-semibold text-white">Project not found or inaccessible</p>
        <Link to="/dashboard" className="text-xs text-sky-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const handleDeleteProject = () => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProjectMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition">
              Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            {space && (
              <>
                <Link to={`/spaces/${space.id}`} className="text-slate-400 hover:text-white transition">
                  {space.name}
                </Link>
                <span className="text-slate-600">/</span>
              </>
            )}
            <span className="text-white font-semibold truncate max-w-[200px]">{project.name}</span>
          </div>

          <button
            onClick={handleDeleteProject}
            disabled={deleteProjectMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Project
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Project Header Banner */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/70 to-slate-950 p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-3.5 h-3.5" />
              Project Workspace
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              Created {new Date(project.created_at).toLocaleDateString()}
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {project.name}
            </h2>
            <p className="text-sm text-slate-400 max-w-3xl mt-2 leading-relaxed">
              {project.description || "No description specified for this learning project."}
            </p>
          </div>

          {project.learning_goal && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3 max-w-3xl">
              <Target className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Target Learning Goal
                </p>
                <p className="text-sm text-slate-200">{project.learning_goal}</p>
              </div>
            </div>
          )}
        </section>

        {/* Phase 1 Completion & Workspace Notice */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Project Workspace Ready</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              This project is initialized with verified ownership and user isolation. PDF document upload, chunking, and grounded AI Tutor sessions will be integrated here in subsequent development phases.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-left">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Phase 2: Materials
              </div>
              <p className="text-[11px] text-slate-500">PDF upload & PyMuPDF processing pipeline (Standby)</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Phase 3: AI Tutor
              </div>
              <p className="text-[11px] text-slate-500">Grounded Q&A with page citations (Standby)</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
