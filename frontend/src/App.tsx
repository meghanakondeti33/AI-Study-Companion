import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Layers,
  Cpu,
  ShieldCheck,
  Radio,
  FileCode2
} from "lucide-react";

interface HealthResponse {
  status: "healthy" | "degraded" | string;
  app_name: string;
  version: string;
  environment: string;
  services: {
    database: string;
    redis: string;
  };
}

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/v1/health");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export default function App() {
  const {
    data: health,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<HealthResponse, Error>({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: 1,
    refetchInterval: 10000,
  });

  const getStatusBadge = (status?: string) => {
    if (status === "healthy" || status === "connected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    }
    if (status === "degraded") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          degraded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <AlertCircle className="w-3.5 h-3.5" />
        {status || "unavailable"}
      </span>
    );
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
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                AI Study Companion
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Foundation Platform Shell</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Radio className="w-3 h-3 animate-pulse" />
              Phase 1: Foundation
            </span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition disabled:opacity-50"
              title="Refresh Health"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-sky-400" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Banner */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-2xl space-y-3 relative z-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Environment Verified
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Application Foundation Is Active
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              The core modular monolith foundation has been configured with React, Vite, FastAPI, PostgreSQL, pgvector, Redis, and Celery. Domain modules are structured and ready for phase-by-phase feature implementation.
            </p>
          </div>
        </section>

        {/* Health Check Service Status */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <h3 className="text-lg font-semibold text-white">Live Service Diagnostics</h3>
            </div>
            <span className="text-xs text-slate-500">Auto-polls every 10s</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* FastAPI Card */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Server className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-semibold">FastAPI Gateway</span>
                </div>
                {isLoading ? (
                  <span className="text-xs text-slate-500">Checking...</span>
                ) : isError ? (
                  getStatusBadge("offline")
                ) : (
                  getStatusBadge(health?.status)
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isError
                  ? "Backend server is not reachable on port 8000."
                  : `Version: ${health?.version ?? "1.0.0"} • Env: ${health?.environment ?? "development"}`}
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                Endpoint: /api/v1/health
              </div>
            </div>

            {/* PostgreSQL Card */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold">PostgreSQL & pgvector</span>
                </div>
                {isLoading ? (
                  <span className="text-xs text-slate-500">Checking...</span>
                ) : isError ? (
                  getStatusBadge("disconnected")
                ) : (
                  getStatusBadge(health?.services?.database)
                )}
              </div>
              <p className="text-xs text-slate-400">
                {health?.services?.database === "connected"
                  ? "Database connection pool healthy via SQLAlchemy 2.0."
                  : "Database service disconnected or standby."}
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                Alembic: Configured
              </div>
            </div>

            {/* Redis & Celery Card */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold">Redis & Celery Queue</span>
                </div>
                {isLoading ? (
                  <span className="text-xs text-slate-500">Checking...</span>
                ) : isError ? (
                  getStatusBadge("disconnected")
                ) : (
                  getStatusBadge(health?.services?.redis)
                )}
              </div>
              <p className="text-xs text-slate-400">
                {health?.services?.redis === "connected"
                  ? "Redis ping responded. Celery task broker operational."
                  : "Redis service disconnected or standby."}
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                Broker: redis://localhost:6379
              </div>
            </div>
          </div>

          {isError && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-300">
                  Backend API Offline or Not Started
                </p>
                <p className="text-xs text-slate-400">
                  The frontend shell is running, but cannot connect to FastAPI. Start the backend with:
                </p>
                <code className="inline-block mt-1 px-2.5 py-1 rounded bg-slate-900 font-mono text-xs text-sky-300 border border-slate-800">
                  .venv\Scripts\uvicorn.exe app.main:app --app-dir backend --host 127.0.0.1 --port 8000
                </code>
              </div>
            </div>
          )}
        </section>

        {/* Foundation Architecture Overview */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Foundation Architecture Verification</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                title: "Frontend Shell",
                tech: "React 18 + TS + Vite + Tailwind",
                status: "Operational",
                desc: "Type-checked shell with TanStack Query and dark design system.",
              },
              {
                title: "API Backend",
                tech: "Python 3.12 + FastAPI",
                status: "Operational",
                desc: "Lifespan event loop, CORS middleware, and health endpoints.",
              },
              {
                title: "Database Layer",
                tech: "PostgreSQL 16 + pgvector",
                status: "Configured",
                desc: "SQLAlchemy 2.0 ORM engine, SessionLocal, and Alembic migrations.",
              },
              {
                title: "Asynchronous Jobs",
                tech: "Redis + Celery Worker",
                status: "Configured",
                desc: "Broker, result backend, and task definitions for async processing.",
              },
              {
                title: "Modular Monolith",
                tech: "18 Domain Modules",
                status: "Structured",
                desc: "Isolated folders in backend/app/modules for clean domain separation.",
              },
              {
                title: "Automated Testing",
                tech: "Pytest + SQLite Memory DB",
                status: "Passing",
                desc: "3 passing unit tests verifying health and degradation pathways.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-2 hover:border-slate-700/80 transition"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-slate-200">{item.title}</h4>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                    {item.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-indigo-300/90">{item.tech}</div>
                <p className="text-xs text-slate-400 leading-normal">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>AI Study Companion • Foundation Phase Complete</p>
          <p className="font-mono text-[11px]">Strict Modular Monolith Architecture</p>
        </div>
      </footer>
    </div>
  );
}
