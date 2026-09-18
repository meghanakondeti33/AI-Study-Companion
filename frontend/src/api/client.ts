/// <reference types="vite/client" />

const TOKEN_KEY = "ai_study_token";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpaceItem {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  description: string | null;
  learning_goal: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialItem {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  error_message: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface CitationItem {
  material_id: string;
  page_number: number;
  supporting_text?: string | null;
}

export interface TutorMessageItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationItem[] | null;
  created_at: string;
}

export interface TutorConversationItem {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: TutorMessageItem[];
}

export interface QuizQuestionItem {
  id: string;
  quiz_id: string;
  question_type: "mcq" | "open_ended";
  question_text: string;
  options?: string[] | null;
  difficulty: string;
  source_citations?: { material_id: string; page_number: number }[] | null;
  correct_answer?: string;
  explanation?: string;
}

export interface QuizItem {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  question_count: number;
  questions?: QuizQuestionItem[];
}

export interface EvaluationDetails {
  strengths: string[];
  gaps: string[];
  improvement_hint: string;
}

export interface QuizAnswerItem {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string;
  is_correct?: boolean | null;
  score?: number | null;
  feedback?: string | null;
  evaluation_details?: EvaluationDetails | null;
  evaluated_by: "system" | "ai";
  created_at: string;
  question?: QuizQuestionItem | null;
}

export interface QuizAttemptItem {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string | null;
  score?: number | null;
  answers: QuizAnswerItem[];
}

export interface ConceptItem {
  id: string;
  project_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ConceptMasteryItem {
  id: string;
  user_id: string;
  project_id: string;
  concept_id: string;
  concept_name?: string;
  concept_description?: string;
  mastery_score: number;
  last_assessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface MasteryHistoryItem {
  id: string;
  user_id: string;
  project_id: string;
  concept_id: string;
  concept_name?: string;
  previous_score: number;
  new_score: number;
  source: string;
  evidence_id?: string;
  evidence_details?: any;
  created_at: string;
}

// Phase 6: Growth Classification
export interface ConceptGrowthItem {
  concept_id: string;
  concept_name: string;
  mastery_score: number;
  trend_delta: number;
  status: "improving" | "stable" | "requiring_attention";
}

export interface GrowthSnapshotItem {
  id: string;
  user_id: string;
  project_id: string;
  status: string;
  overall_mastery: number;
  previous_overall_mastery: number | null;
  trend_delta: number;
  created_at: string;
}

export interface GrowthOverviewItem {
  current_snapshot: GrowthSnapshotItem | null;
  status: string;
  overall_mastery: number;
  trend_delta: number;
  concept_count: number;
  improving_concepts: ConceptGrowthItem[];
  stable_concepts: ConceptGrowthItem[];
  attention_concepts: ConceptGrowthItem[];
}

// Phase 6: Personalized Recommendations
export interface RecommendationItem {
  id: string;
  user_id: string;
  project_id: string;
  recommendation_type: "review" | "practice" | "revisit" | "continue";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  target_concept_id: string | null;
  target_concept_name: string | null;
  action_url: string | null;
  status: "active" | "completed" | "dismissed";
  created_at: string;
  completed_at: string | null;
}

export interface RecommendationActionResponse {
  success: boolean;
  status: string;
  recommendation: RecommendationItem;
}

// Phase 7: Learner Context
export interface LearnerContextItem {
  id: string;
  user_id: string;
  context_type: "strength" | "weakness" | "preference";
  context_key: string;
  context_value: string;
  source: string;
  created_at: string;
  updated_at: string;
}

// Phase 10: Admin Dashboard & System Health
export interface AdminStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_spaces: number;
  total_projects: number;
  total_materials: number;
  total_quizzes: number;
  total_quiz_attempts: number;
  total_ai_requests: number;
  total_background_jobs: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  spaces_count: number;
  projects_count: number;
  last_activity_at: string | null;
}

export interface AdminUserListResponse {
  users: AdminUserItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminProjectItem {
  id: string;
  name: string;
  description: string | null;
  learning_goal: string | null;
  space_id: string;
  space_name: string;
  user_id: string;
  user_email: string;
  user_name: string;
  materials_count: number;
  quizzes_count: number;
  created_at: string;
}

export interface AdminProjectListResponse {
  projects: AdminProjectItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminActivityItem {
  id: string;
  user_id: string;
  user_email: string;
  project_id: string | null;
  event_type: string;
  description: string;
  created_at: string;
}

export interface AdminActivityListResponse {
  events: AdminActivityItem[];
  total: number;
}

export interface AdminAIFeatureStat {
  feature: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_latency_ms: number;
  total_tokens: number;
}

export interface AdminAIEvaluationStats {
  total_evaluations: number;
  passed_evaluations: number;
  failed_evaluations: number;
  average_score: number;
}

export interface AdminAIObservabilityResponse {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_latency_ms: number;
  total_tokens: number;
  features: AdminAIFeatureStat[];
  evaluations: AdminAIEvaluationStats;
}

export interface AdminJobItem {
  id: string;
  job_type: string;
  status: string;
  user_id: string;
  user_email: string;
  project_id: string | null;
  attempts: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AdminJobsResponse {
  queued_count: number;
  running_count: number;
  completed_count: number;
  failed_count: number;
  recent_jobs: AdminJobItem[];
}

export interface AdminSystemHealth {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  services: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Use VITE_API_BASE_URL if available, otherwise default to empty string for relative proxy paths
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const fullEndpoint = `${normalizedBaseUrl}${endpoint}`;

  const response = await fetch(fullEndpoint, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch (e) {
    // Non-JSON response
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    const message = data?.detail || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  auth: {
    register: (payload: { email: string; name: string; password: string }) =>
      request<UserProfile>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    login: (payload: { email: string; password: string }) =>
      request<{ access_token: string; token_type: string }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getMe: () => request<UserProfile>("/api/v1/auth/me"),
  },
  spaces: {
    list: () => request<SpaceItem[]>("/api/v1/spaces"),
    get: (id: string) => request<SpaceItem>(`/api/v1/spaces/${id}`),
    create: (payload: { name: string; description?: string }) =>
      request<SpaceItem>("/api/v1/spaces", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { name?: string; description?: string }) =>
      request<SpaceItem>(`/api/v1/spaces/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<void>(`/api/v1/spaces/${id}`, {
        method: "DELETE",
      }),
  },
  projects: {
    list: (spaceId?: string) => {
      const url = spaceId ? `/api/v1/projects?space_id=${encodeURIComponent(spaceId)}` : "/api/v1/projects";
      return request<ProjectItem[]>(url);
    },
    get: (id: string) => request<ProjectItem>(`/api/v1/projects/${id}`),
    create: (payload: { space_id: string; name: string; description?: string; learning_goal?: string }) =>
      request<ProjectItem>("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { name?: string; description?: string; learning_goal?: string }) =>
      request<ProjectItem>(`/api/v1/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<void>(`/api/v1/projects/${id}`, {
        method: "DELETE",
      }),
  },
  materials: {
    list: (projectId: string) =>
      request<MaterialItem[]>(`/api/v1/projects/${projectId}/materials`),
    get: (materialId: string) =>
      request<MaterialItem>(`/api/v1/materials/${materialId}`),
    upload: (projectId: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<MaterialItem>(`/api/v1/projects/${projectId}/materials`, {
        method: "POST",
        body: formData,
      });
    },
    delete: (materialId: string) =>
      request<void>(`/api/v1/materials/${materialId}`, {
        method: "DELETE",
      }),
  },
  tutor: {
    listConversations: (projectId: string) =>
      request<TutorConversationItem[]>(`/api/v1/projects/${projectId}/tutor/conversations`),
    createConversation: (projectId: string, title?: string) =>
      request<TutorConversationItem>(`/api/v1/projects/${projectId}/tutor/conversations`, {
        method: "POST",
        body: JSON.stringify({ title: title || "New Study Session" }),
      }),
    getConversation: (conversationId: string) =>
      request<TutorConversationItem>(`/api/v1/tutor/conversations/${conversationId}`),
    sendMessage: (conversationId: string, content: string) =>
      request<TutorMessageItem>(`/api/v1/tutor/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  },
  quizzes: {
    list: (projectId: string) =>
      request<QuizItem[]>(`/api/v1/projects/${projectId}/quizzes`),
    generate: (projectId: string, payload: { num_questions?: number; difficulty?: string; title?: string }) =>
      request<QuizItem>(`/api/v1/projects/${projectId}/quizzes`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    get: (quizId: string) =>
      request<QuizItem>(`/api/v1/quizzes/${quizId}`),
    startAttempt: (quizId: string) =>
      request<QuizAttemptItem>(`/api/v1/quizzes/${quizId}/attempts`, {
        method: "POST",
      }),
    getAttempt: (attemptId: string) =>
      request<QuizAttemptItem>(`/api/v1/attempts/${attemptId}`),
    submitAnswer: (attemptId: string, questionId: string, answerText: string) =>
      request<QuizAnswerItem>(`/api/v1/attempts/${attemptId}/answers`, {
        method: "POST",
        body: JSON.stringify({ question_id: questionId, answer_text: answerText }),
      }),
    completeAttempt: (attemptId: string) =>
      request<QuizAttemptItem>(`/api/v1/attempts/${attemptId}/complete`, {
        method: "POST",
      }),
  },
  mastery: {
    getConcepts: (projectId: string) =>
      request<ConceptItem[]>(`/api/v1/projects/${projectId}/concepts`),
    getMastery: (projectId: string) =>
      request<ConceptMasteryItem[]>(`/api/v1/projects/${projectId}/mastery`),
    getMasteryHistory: (projectId: string) =>
      request<MasteryHistoryItem[]>(`/api/v1/projects/${projectId}/mastery/history`),
    getConceptMastery: (conceptId: string) =>
      request<ConceptMasteryItem>(`/api/v1/concepts/${conceptId}/mastery`),
  },
  growth: {
    getOverview: (projectId: string) =>
      request<GrowthOverviewItem>(`/api/v1/projects/${projectId}/growth`),
    getHistory: (projectId: string, limit?: number) =>
      request<GrowthSnapshotItem[]>(
        `/api/v1/projects/${projectId}/growth/history${limit ? `?limit=${limit}` : ""}`
      ),
  },
  recommendations: {
    list: (projectId: string, status?: string) =>
      request<RecommendationItem[]>(
        `/api/v1/projects/${projectId}/recommendations${status ? `?status=${status}` : ""}`
      ),
    complete: (recommendationId: string) =>
      request<RecommendationActionResponse>(
        `/api/v1/recommendations/${recommendationId}/complete`,
        { method: "POST" }
      ),
    dismiss: (recommendationId: string) =>
      request<RecommendationActionResponse>(
        `/api/v1/recommendations/${recommendationId}/dismiss`,
        { method: "POST" }
      ),
  },
  learnerContext: {
    getGlobalContext: async () => {
      const res = await request<{ items: LearnerContextItem[] }>("/api/v1/learner-context");
      return res.items;
    },
  },
  admin: {
    getStats: () => request<AdminStats>("/api/v1/admin/stats"),
    getUsers: (params?: { limit?: number; offset?: number; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.offset) query.set("offset", params.offset.toString());
      if (params?.search) query.set("search", params.search);
      const qs = query.toString() ? `?${query.toString()}` : "";
      return request<AdminUserListResponse>(`/api/v1/admin/users${qs}`);
    },
    getProjects: (params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.offset) query.set("offset", params.offset.toString());
      const qs = query.toString() ? `?${query.toString()}` : "";
      return request<AdminProjectListResponse>(`/api/v1/admin/projects${qs}`);
    },
    getLearningActivity: (params?: { limit?: number; offset?: number; event_type?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.offset) query.set("offset", params.offset.toString());
      if (params?.event_type) query.set("event_type", params.event_type);
      const qs = query.toString() ? `?${query.toString()}` : "";
      return request<AdminActivityListResponse>(`/api/v1/admin/learning-activity${qs}`);
    },
    getAIObservability: (days: number = 30) =>
      request<AdminAIObservabilityResponse>(`/api/v1/admin/ai-observability?days=${days}`),
    getJobs: (params?: { limit?: number; offset?: number; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.offset) query.set("offset", params.offset.toString());
      if (params?.status) query.set("status", params.status);
      const qs = query.toString() ? `?${query.toString()}` : "";
      return request<AdminJobsResponse>(`/api/v1/admin/jobs${qs}`);
    },
    getSystemHealth: () => request<AdminSystemHealth>("/api/v1/admin/system-health"),
  },
};
