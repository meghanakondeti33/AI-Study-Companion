import React, { useRef, useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ProjectItem,
  SpaceItem,
  MaterialItem,
  TutorConversationItem,
  TutorMessageItem,
} from "../api/client";
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
  MessageSquare,
  Send,
  Bot,
  User,
  Bookmark,
  ShieldAlert,
  Plus,
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

  // AI Tutor state & queries
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: conversations = [],
  } = useQuery<TutorConversationItem[]>({
    queryKey: ["tutor-conversations", projectId],
    queryFn: () => api.tutor.listConversations(projectId!),
    enabled: !!projectId,
  });

  const activeConversationId = selectedConversationId || (conversations.length > 0 ? conversations[0].id : null);

  const {
    data: activeConversation,
    isLoading: isLoadingConversation,
  } = useQuery<TutorConversationItem>({
    queryKey: ["tutor-conversation", activeConversationId],
    queryFn: () => api.tutor.getConversation(activeConversationId!),
    enabled: !!activeConversationId,
  });

  const handleCreateNewConversation = async () => {
    if (!projectId) return;
    try {
      const newConv = await api.tutor.createConversation(
        projectId,
        `Session ${conversations.length + 1}`
      );
      await queryClient.invalidateQueries({ queryKey: ["tutor-conversations", projectId] });
      setSelectedConversationId(newConv.id);
      setTutorError(null);
    } catch (err: any) {
      setTutorError(err.message || "Failed to create conversation");
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = questionInput.trim();
    if (!content || !projectId || isAsking) return;

    setIsAsking(true);
    setTutorError(null);

    try {
      let convId = activeConversationId;
      if (!convId) {
        const titleSnippet = content.length > 25 ? content.slice(0, 25) + "..." : content;
        const newConv = await api.tutor.createConversation(projectId, titleSnippet);
        convId = newConv.id;
        setSelectedConversationId(newConv.id);
        await queryClient.invalidateQueries({ queryKey: ["tutor-conversations", projectId] });
      }

      await api.tutor.sendMessage(convId, content);
      setQuestionInput("");
      await queryClient.invalidateQueries({ queryKey: ["tutor-conversation", convId] });
      await queryClient.invalidateQueries({ queryKey: ["tutor-conversations", projectId] });
    } catch (err: any) {
      setTutorError(err.message || "Failed to receive response from AI Tutor");
    } finally {
      setIsAsking(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
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

        {/* Phase 3: AI Study Tutor Section */}
        <section id="tutor-section" className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6">
          {/* Tutor Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">AI Study Tutor</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Grounded RAG
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ask questions answered strictly from your uploaded materials, with verified page citations and strict hallucination defense.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="new-tutor-session-btn"
                onClick={handleCreateNewConversation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>
          </div>

          {/* Conversations Selector Tabs (if multiple exist) */}
          {conversations.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 text-[11px] font-medium shrink-0">Sessions:</span>
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConversationId(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 border ${
                    c.id === activeConversationId
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {c.title || "Study Session"}
                </button>
              ))}
            </div>
          )}

          {/* Messages Container */}
          <div
            id="tutor-messages-container"
            className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 sm:p-6 min-h-[300px] max-h-[480px] overflow-y-auto space-y-4"
          >
            {isLoadingConversation ? (
              <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                Loading conversation messages...
              </div>
            ) : !activeConversation || !activeConversation.messages || activeConversation.messages.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
                  <Bot className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-300">Ready to Answer Your Questions</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The AI Tutor searches your project documents using vector similarity and cites exact page numbers. If information isn't in your materials, it refuses rather than hallucinating.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setQuestionInput("What are the core concepts covered in this material?");
                    }}
                    className="text-[11px] px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                  >
                    💡 "What are the core concepts covered in this material?"
                  </button>
                  <button
                    onClick={() => {
                      setQuestionInput("Summarize page 1 of the uploaded document.");
                    }}
                    className="text-[11px] px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                  >
                    💡 "Summarize page 1 of the uploaded document."
                  </button>
                </div>
              </div>
            ) : (
              activeConversation.messages.map((msg) => {
                const isUser = msg.role === "user";
                const isRefusal =
                  !isUser &&
                  (msg.content.includes("couldn't find enough information") ||
                    msg.content.includes("not available in the project material"));

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                        isUser
                          ? "bg-sky-600/20 border border-sky-500/30 text-white rounded-tr-none"
                          : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-sans text-[13px]">{msg.content}</p>

                      {/* Grounded Refusal Notice */}
                      {isRefusal && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-300 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Grounded Refusal: Topic is outside the uploaded project materials.</span>
                        </div>
                      )}

                      {/* Verified Page Citations List */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div
                          className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2"
                          data-testid="tutor-citations"
                        >
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <Bookmark className="w-3 h-3 text-indigo-400" />
                            Verified Sources:
                          </span>
                          {msg.citations.map((c, i) => (
                            <span
                              key={i}
                              data-testid="tutor-citation"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-medium hover:bg-indigo-500/25 transition cursor-default"
                              title={c.supporting_text ? `Evidence: "${c.supporting_text}"` : `Cited from Page ${c.page_number}`}
                            >
                              Page {c.page_number}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* In-Flight Response Loader */}
            {isAsking && (
              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-slate-900/90 border border-slate-800 p-4 text-xs text-slate-400 flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Retrieving project pages & generating grounded answer...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Tutor Error Notice */}
          {tutorError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{tutorError}</span>
              </div>
              <button
                onClick={() => setTutorError(null)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Question Input Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              id="tutor-question-input"
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask a question about your uploaded materials (e.g. 'What is photosynthesis?')..."
              disabled={isAsking}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
            />
            <button
              id="tutor-send-btn"
              type="submit"
              disabled={isAsking || !questionInput.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
            >
              {isAsking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Ask Tutor</span>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
