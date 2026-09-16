import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Layers, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 shadow-lg shadow-sky-500/20">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">AI Study Companion</h1>
        <p className="text-xs text-slate-400">Sign in to your learning workspace</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="learner@example.com"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-sky-400 hover:text-sky-300 transition">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
