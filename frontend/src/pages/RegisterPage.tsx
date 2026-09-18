import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] text-[#172033] dark:text-[#F4F5F7] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle Ambient Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#6C5CE7]/5 dark:bg-[#8175F5]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card Container */}
      <div className="w-full max-w-[460px] relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-7 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6C5CE7] to-[#8175F5] shadow-md shadow-[#6C5CE7]/20 mb-1">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-[#172033] dark:text-[#F4F5F7]">
            AI Study Companion
          </h1>
          <p className="text-xs font-medium text-[#667085] dark:text-[#A7B0C0]">
            Create your personalized study workspace
          </p>
        </div>

        {/* Authentication Card */}
        <div className="bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] rounded-2xl p-8 sm:p-10 shadow-xs transition-colors duration-200">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl sm:text-[28px] font-extrabold text-[#172033] dark:text-[#F4F5F7] tracking-tight">
              Create your account
            </h2>
            <p className="text-sm text-[#667085] dark:text-[#A7B0C0] leading-relaxed">
              Start building your personalized learning workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full h-12 px-4 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full h-12 px-4 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full h-12 pl-4 pr-11 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-[#172033] dark:text-[#F4F5F7] mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full h-12 pl-4 pr-11 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-sm text-[#172033] dark:text-[#F4F5F7] placeholder:text-[#98A2B3] dark:placeholder:text-[#7F8AA0] focus:outline-none focus:bg-white dark:focus:bg-[#121A2D] focus:border-[#6C5CE7] dark:focus:border-[#8175F5] focus:ring-2 focus:ring-[#6C5CE7]/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition p-1"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#6C5CE7] dark:bg-[#8175F5] hover:bg-[#5B4DD6] dark:hover:bg-[#9187FF] text-white font-semibold text-sm transition shadow-sm shadow-[#6C5CE7]/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Register</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Navigation to Login */}
          <div className="mt-7 text-center text-sm text-[#667085] dark:text-[#A7B0C0]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#6C5CE7] dark:text-[#8175F5] hover:text-[#5B4DD6] dark:hover:text-[#9187FF] transition inline-flex items-center gap-0.5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
