import React, { useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ProjectItem, SpaceItem, MaterialItem } from "../api/client";
import {
  BookOpen,
  Target,
  FileText,
  Clock,
  Trash2,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
  Loader2,
  FileWarning,
  Sparkles,
  MessageSquare
} from "lucide-react";

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const {
    data: project,
    isLoading: isLoadingProject,
    isError: isProjectError,
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

  // Materials query with auto-polling for queued/processing documents
  const {
    data: materials = [],
    isLoading: isLoadingMaterials,
  } = useQuery<MaterialItem[]>({
    queryKey: ["materials", projectId],
    queryFn: () => api.materials.list(projectId!),
    enabled: !!projectId,
    refetchInterval: (query) => {
      const items = query.state.data;
      if (!Array.isArray(items) || items.length === 0) return false;
      const hasPending = items.some(
        (m) => m.status === "QUEUED" || m.status === "PROCESSING"
      );
      return hasPending ? 2000 : false;
    },
  });

  // Mutations
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

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: string) => api.materials.delete(materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", projectId] });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setUploadError(null);

    // Basic client validation
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF documents (.pdf) are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File exceeds the 25 MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      await api.materials.upload(projectId, file);
      queryClient.invalidateQueries({ queryKey: ["materials", projectId] });
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload PDF. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteProject = () => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProjectMutation.mutate();
    }
  };

  const handleDeleteMaterial = (materialId: string) => {
    if (confirm("Are you sure you want to delete this material?")) {
      deleteMaterialMutation.mutate(materialId);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">
        Loading project workspace...
      </div>
    );
  }

  if (isProjectError || !project) {
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
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

        {/* Phase 2: Study Materials / PDF Processing Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-base font-semibold text-white">Study Materials</h3>
                <p className="text-xs text-slate-400">
                  Upload PDF courseware, textbooks, or research papers for grounded learning.
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {materials.length}
              </span>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="material-file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading PDF...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Upload PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold">Upload failed: </span>
                <span>{uploadError}</span>
              </div>
            </div>
          )}

          {/* Materials List */}
          {isLoadingMaterials ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading materials...</div>
          ) : !Array.isArray(materials) || materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center space-y-3 bg-slate-900/20">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">No Materials Uploaded Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a lecture PDF or textbook chapter to extract pages, create vector embeddings, and prepare your study material.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Select PDF Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((m) => {
                const isProcessing = m.status === "PROCESSING" || m.status === "QUEUED";
                const isReady = m.status === "READY";
                const isFailed = m.status === "FAILED";

                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 hover:border-slate-700 transition relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 text-sky-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-sm font-semibold text-white truncate" title={m.original_filename}>
                            {m.original_filename}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{formatBytes(m.file_size)}</span>
                            <span>•</span>
                            <span>{new Date(m.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMaterial(m.id)}
                        disabled={deleteMaterialMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 transition p-1 text-slate-500 hover:text-rose-400"
                        title="Delete material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                      {m.status === "QUEUED" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                          <Clock className="w-3 h-3" />
                          Queued for processing
                        </span>
                      )}

                      {m.status === "PROCESSING" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px]">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Extracting & Embedding...
                        </span>
                      )}

                      {isReady && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      )}

                      {isFailed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px]">
                          <FileWarning className="w-3 h-3" />
                          Processing Failed
                        </span>
                      )}

                      {isReady && m.page_count !== null && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {m.page_count} {m.page_count === 1 ? "page" : "pages"} indexed
                        </span>
                      )}
                    </div>

                    {/* Error message if failed */}
                    {isFailed && m.error_message && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 leading-relaxed">
                        {m.error_message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Phase 3 Notice: AI Tutor Integration Standby */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 text-center space-y-3 max-w-2xl mx-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Next Phase: Grounded AI Tutor</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Once PDF materials are processed into chunks and embeddings, Phase 3 will enable grounded question-answering with exact page citations and confidence scores.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
