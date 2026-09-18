import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  MaterialItem,
  ConceptItem,
  ConceptMasteryItem,
  QuizItem,
  TutorConversationItem,
  RecommendationItem,
} from "../api/client";
import AppShell from "../components/AppShell";
import TutorWorkspace from "../components/TutorWorkspace";
import QuizSection from "../components/QuizSection";
import MasterySection from "../components/MasterySection";
import GrowthSection from "../components/GrowthSection";
import RecommendationsSection from "../components/RecommendationsSection";
import ProjectAnalyticsSection from "../components/ProjectAnalyticsSection";
import {
  FileText,
  UploadCloud,
  Sparkles,
  Award,
  HelpCircle,
  Compass,
  BarChart3,
  Loader2,
  AlertCircle,
  Trash2,
  Clock,
  CheckCircle2,
  FileWarning,
  Target,
  BookOpen,
  MessageSquare,
} from "lucide-react";

type TabKey = "materials" | "tutor" | "quiz" | "mastery" | "recommendations" | "analytics";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State with URL query sync
  const tabParam = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam || "materials");

  // Sync state if URL search param changes
  useEffect(() => {
    if (tabParam && ["materials", "tutor", "quiz", "mastery", "recommendations", "analytics"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Queries
  const {
    data: project,
    isLoading: isLoadingProject,
    isError: isProjectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.projects.get(projectId!),
    enabled: !!projectId,
  });

  const { data: space } = useQuery({
    queryKey: ["space", project?.space_id],
    queryFn: () => api.spaces.get(project!.space_id),
    enabled: !!project?.space_id,
  });

  const {
    data: materials = [],
    isLoading: isLoadingMaterials,
  } = useQuery<MaterialItem[]>({
    queryKey: ["materials", projectId],
    queryFn: () => api.materials.list(projectId!),
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data as MaterialItem[] | undefined;
      const hasProcessing = data?.some(
        (m) => m.status === "QUEUED" || m.status === "PROCESSING"
      );
      return hasProcessing ? 2000 : false;
    },
  });

  const { data: concepts = [] } = useQuery<ConceptItem[]>({
    queryKey: ["project-concepts", projectId],
    queryFn: () => api.mastery.getConcepts(projectId!),
    enabled: !!projectId,
  });

  const { data: masteries = [] } = useQuery<ConceptMasteryItem[]>({
    queryKey: ["project-mastery", projectId],
    queryFn: () => api.mastery.getMastery(projectId!),
    enabled: !!projectId,
  });

  const { data: quizzes = [] } = useQuery<QuizItem[]>({
    queryKey: ["project-quizzes", projectId],
    queryFn: () => api.quizzes.list(projectId!),
    enabled: !!projectId,
  });

  const { data: conversations = [] } = useQuery<TutorConversationItem[]>({
    queryKey: ["tutor-conversations", projectId],
    queryFn: () => api.tutor.listConversations(projectId!),
    enabled: !!projectId,
  });

  const { data: recommendations = [] } = useQuery<RecommendationItem[]>({
    queryKey: ["project-recommendations", projectId],
    queryFn: () => api.recommendations.list(projectId!),
    enabled: !!projectId,
  });

  const hasReadyMaterials = materials.some((m) => m.status === "READY");

  // Calculations for header
  const averageMastery =
    masteries.length > 0
      ? Math.round(masteries.reduce((acc, m) => acc + m.mastery_score, 0) / masteries.length)
      : 0;

  // Mutations
  const deleteProjectMutation = useMutation({
    mutationFn: () => api.projects.delete(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/dashboard");
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: string) => api.materials.delete(materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-concepts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-mastery", projectId] });
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
      <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] flex items-center justify-center text-xs text-[#667085] dark:text-[#A7B0C0]">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#6C5CE7] dark:text-[#8175F5]" />
        <span>Loading project workspace...</span>
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] flex flex-col items-center justify-center p-4 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
        <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">Project not found or inaccessible</p>
        <Link to="/dashboard" className="text-xs text-[#6C5CE7] dark:text-[#8175F5] hover:underline font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const tabs: { id: TabKey; label: string; icon: React.ElementType; badge?: string | number }[] = [
    { id: "materials", label: "Materials", icon: FileText, badge: materials.length },
    { id: "tutor", label: "AI Tutor", icon: Sparkles, badge: "Grounded" },
    { id: "quiz", label: "Adaptive Quiz", icon: HelpCircle, badge: quizzes.length },
    { id: "mastery", label: "Mastery & Growth", icon: Award, badge: concepts.length },
    { id: "recommendations", label: "Recommendations", icon: Compass, badge: recommendations.length },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <AppShell
      breadcrumbs={[
        ...(space ? [{ label: space.name, href: `/spaces/${space.id}` }] : []),
        { label: project.name },
      ]}
      activeProjectName={project.name}
    >
      <div className="space-y-6">
        {/* ==================================================
            PROJECT HEADER
        ================================================== */}
        <section className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-8 space-y-6 shadow-xs relative overflow-hidden transition-colors duration-200">
          <div className="absolute top-0 right-0 w-96 h-48 bg-[#6C5CE7]/5 dark:bg-[#8175F5]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar: Tag + Space link + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30">
                <BookOpen className="w-3.5 h-3.5" />
                Project
              </span>
              {space && (
                <span className="text-xs text-[#667085] dark:text-[#A7B0C0]">
                  in{" "}
                  <Link to={`/spaces/${space.id}`} className="text-[#172033] dark:text-[#F4F5F7] hover:text-[#6C5CE7] dark:hover:text-[#8175F5] font-medium underline">
                    {space.name}
                  </Link>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-[#667085] dark:text-[#A7B0C0]">
                <Clock className="w-3.5 h-3.5" />
                <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
              <button
                onClick={handleDeleteProject}
                disabled={deleteProjectMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/40 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Project</span>
              </button>
            </div>
          </div>

          {/* Title and Description */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight">
              {project.name}
            </h2>
            {project.description && (
              <p className="text-sm text-[#667085] dark:text-[#A7B0C0] max-w-3xl leading-relaxed">
                {project.description}
              </p>
            )}
            {project.learning_goal && (
              <p className="text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 inline-flex items-center gap-2">
                <Target className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Goal: {project.learning_goal}</span>
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 pt-2 border-t border-[#E3E6EF] dark:border-[#26324B]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#172033] dark:text-[#F4F5F7] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
                Progress
              </span>
              <span className="font-mono font-bold text-[#6C5CE7] dark:text-[#8175F5] text-sm">
                {averageMastery}%
              </span>
            </div>
            <div className="w-full bg-[#F0EDFF] dark:bg-[#211D42] rounded-full h-2.5 overflow-hidden border border-[#E3E6EF] dark:border-[#26324B]">
              <div
                className="h-full bg-gradient-to-r from-[#6C5CE7] to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${averageMastery}%` }}
              />
            </div>
          </div>

          {/* Metric Summary Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0]">
              <FileText className="w-3.5 h-3.5 text-[#6C5CE7] dark:text-[#8175F5]" />
              <span>
                <strong className="text-[#172033] dark:text-[#F4F5F7]">{materials.length}</strong> Materials
              </span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0]">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong className="text-[#172033] dark:text-[#F4F5F7]">{concepts.length}</strong> Concepts
              </span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0]">
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong className="text-[#172033] dark:text-[#F4F5F7]">{averageMastery}%</strong> Mastery
              </span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#667085] dark:text-[#A7B0C0]">
              <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>
                <strong className="text-[#172033] dark:text-[#F4F5F7]">{conversations.length}</strong> Chats
              </span>
            </div>
          </div>
        </section>

        {/* ==================================================
            TAB NAVIGATION
        ================================================== */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] overflow-x-auto shadow-xs transition-colors duration-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30 shadow-xs"
                    : "text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-[#6C5CE7] dark:text-[#8175F5]" : "text-[#667085] dark:text-[#A7B0C0]"}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? "bg-[#6C5CE7] dark:bg-[#8175F5] text-white"
                        : "bg-[#FAF9FF] dark:bg-[#18223A] text-[#667085] dark:text-[#A7B0C0] border border-[#E3E6EF] dark:border-[#26324B]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ==================================================
            ACTIVE TAB CONTENT
        ================================================== */}
        <div className="tab-content-area">
          {/* TAB 1: STUDY MATERIALS */}
          {activeTab === "materials" && (
            <section id="materials-section" className="space-y-4">
              <div className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] p-6 sm:p-7 space-y-6 shadow-xs transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E3E6EF] dark:border-[#26324B] pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-[#172033] dark:text-[#F4F5F7]">Study Materials</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30">
                        {materials.length} {materials.length === 1 ? "Document" : "Documents"}
                      </span>
                    </div>
                    <p className="text-xs text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
                      Upload PDF courseware, textbooks, lecture slides, or papers (up to 25 MB) for intelligent tutoring.
                    </p>
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
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] text-white text-xs font-semibold transition shadow-sm shadow-[#6C5CE7]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading & Processing...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Upload PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {uploadError && (
                  <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Uploaded Materials Grid */}
                {isLoadingMaterials ? (
                  <div className="py-12 text-center text-xs text-[#667085] dark:text-[#A7B0C0] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6C5CE7] dark:text-[#8175F5]" />
                    <span>Loading materials...</span>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E3E6EF] dark:border-[#26324B] p-10 text-center space-y-3 bg-[#FAF9FF] dark:bg-[#18223A]">
                    <div className="w-12 h-12 rounded-2xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7]">No Materials Uploaded Yet</p>
                    <p className="text-xs text-[#667085] dark:text-[#A7B0C0] max-w-md mx-auto leading-relaxed">
                      Upload your first PDF document to enable grounded RAG tutoring and question answering.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#121A2D] hover:bg-[#F0EDFF] dark:hover:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30 text-xs font-semibold transition shadow-xs"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Choose PDF File</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materials.map((m) => {
                      const isReady = m.status === "READY";
                      const isFailed = m.status === "FAILED";

                      return (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF] dark:bg-[#18223A] p-5 space-y-3.5 hover:border-[#6C5CE7]/50 dark:hover:border-[#8175F5]/50 hover:bg-white dark:hover:bg-[#121A2D] transition relative group shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] flex items-center justify-center shrink-0 border border-[#6C5CE7]/20 dark:border-[#8175F5]/30">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <h4 className="text-sm font-bold text-[#172033] dark:text-[#F4F5F7] truncate" title={m.original_filename}>
                                  {m.original_filename}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-[#667085] dark:text-[#A7B0C0]">
                                  <span>{formatBytes(m.file_size)}</span>
                                  <span>•</span>
                                  <span>{new Date(m.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteMaterial(m.id)}
                              disabled={deleteMaterialMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 transition p-1.5 text-[#667085] dark:text-[#A7B0C0] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                              title="Delete material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#E3E6EF] dark:border-[#26324B] text-xs">
                            {m.status === "QUEUED" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 text-[11px]">
                                <Clock className="w-3 h-3" />
                                <span>Queued for processing</span>
                              </span>
                            )}

                            {m.status === "PROCESSING" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30 text-[11px]">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Extracting & Embedding...</span>
                              </span>
                            )}

                            {isReady && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-[11px]">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Ready</span>
                              </span>
                            )}

                            {isFailed && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 text-[11px]">
                                <FileWarning className="w-3 h-3" />
                                <span>Processing Failed</span>
                              </span>
                            )}

                            {isReady && m.page_count !== null && (
                              <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-mono">
                                {m.page_count} {m.page_count === 1 ? "page" : "pages"} indexed
                              </span>
                            )}
                          </div>

                          {isFailed && m.error_message && (
                            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                              {m.error_message}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 2: AI TUTOR WORKSPACE */}
          {activeTab === "tutor" && (
            <section id="tutor-section" className="space-y-4">
              <TutorWorkspace
                projectId={projectId!}
                projectName={project.name}
                materials={materials}
              />
            </section>
          )}

          {/* TAB 3: ADAPTIVE QUIZZES */}
          {activeTab === "quiz" && (
            <div id="quiz-tab-wrapper" className="space-y-4">
              <QuizSection projectId={projectId!} hasReadyMaterials={hasReadyMaterials} />
            </div>
          )}

          {/* TAB 4: MASTERY & GROWTH */}
          {activeTab === "mastery" && (
            <div id="mastery-tab-wrapper" className="space-y-6">
              <MasterySection projectId={projectId!} />
              <GrowthSection projectId={projectId!} />
            </div>
          )}

          {/* TAB 5: RECOMMENDATIONS */}
          {activeTab === "recommendations" && (
            <div id="recommendations-tab-wrapper" className="space-y-4">
              <RecommendationsSection projectId={projectId!} />
            </div>
          )}

          {/* TAB 6: ANALYTICS */}
          {activeTab === "analytics" && (
            <div id="analytics-tab-wrapper" className="space-y-4">
              <ProjectAnalyticsSection projectId={projectId!} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
