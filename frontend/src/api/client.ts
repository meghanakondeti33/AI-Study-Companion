const TOKEN_KEY = "ai_study_token";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
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

  const response = await fetch(endpoint, {
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
};
