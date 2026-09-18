import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import {
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  BookOpen,
  User as UserIcon,
} from "lucide-react";

export interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  activeProjectName?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, breadcrumbs = [], activeProjectName, actions }: AppShellProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      active: location.pathname === "/dashboard",
    },
    ...(user?.is_admin
      ? [
          {
            label: "Admin Portal",
            icon: ShieldCheck,
            href: "/admin",
            active: location.pathname.startsWith("/admin"),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1020] text-[#172033] dark:text-[#F4F5F7] flex flex-col md:flex-row font-sans selection:bg-[#6C5CE7]/20 selection:text-[#6C5CE7] transition-colors duration-200">
      {/* Mobile Top Header */}
      <header className="md:hidden border-b border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] px-4 h-16 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6C5CE7] to-[#8175F5] flex items-center justify-center shadow-md shadow-[#6C5CE7]/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-[#172033] dark:text-[#F4F5F7] tracking-tight">AI Study Companion</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Desktop Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#121A2D] border-r border-[#E3E6EF] dark:border-[#26324B] flex flex-col justify-between transition-all duration-200 md:translate-x-0 md:static shadow-xs ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="p-5 border-b border-[#E3E6EF] dark:border-[#26324B]">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C5CE7] to-[#8175F5] flex items-center justify-center shadow-md shadow-[#6C5CE7]/25 group-hover:scale-105 transition">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-[#172033] dark:text-[#F4F5F7] tracking-tight leading-tight group-hover:text-[#6C5CE7] dark:group-hover:text-[#8175F5] transition">
                  AI Study Companion
                </span>
                <span className="text-[11px] text-[#667085] dark:text-[#A7B0C0] font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Gemini 2.5 Flash
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="p-3.5 space-y-1.5 flex-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#7F8AA0]">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${
                    item.active
                      ? "bg-[#F0EDFF] dark:bg-[#211D42] text-[#6C5CE7] dark:text-[#8175F5] border border-[#6C5CE7]/30 dark:border-[#8175F5]/30 shadow-xs"
                      : "text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] hover:bg-[#FAF9FF] dark:hover:bg-[#18223A] border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.active ? "text-[#6C5CE7] dark:text-[#8175F5]" : "text-[#667085] dark:text-[#A7B0C0] group-hover:text-[#172033] dark:group-hover:text-[#F4F5F7]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {activeProjectName && (
              <div className="pt-4">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#7F8AA0]">
                  Active Workspace
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-xs text-[#172033] dark:text-[#F4F5F7]">
                  <BookOpen className="w-4 h-4 text-[#6C5CE7] dark:text-[#8175F5] shrink-0" />
                  <span className="truncate font-semibold">{activeProjectName}</span>
                </div>
              </div>
            )}
          </nav>

          {/* User Account & Logout Footer */}
          <div className="p-3.5 border-t border-[#E3E6EF] dark:border-[#26324B] bg-[#FAF9FF]/60 dark:bg-[#18223A]/60">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#121A2D] border border-[#E3E6EF] dark:border-[#26324B] shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#F0EDFF] dark:bg-[#211D42] border border-[#6C5CE7]/20 dark:border-[#8175F5]/30 flex items-center justify-center text-[#6C5CE7] dark:text-[#8175F5] font-bold text-xs shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#172033] dark:text-[#F4F5F7] truncate">{user?.name || "Learner"}</span>
                  <span className="text-[10px] text-[#667085] dark:text-[#A7B0C0] truncate">{user?.email}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="p-1.5 rounded-lg text-[#667085] dark:text-[#A7B0C0] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-6 border-b border-[#E3E6EF] dark:border-[#26324B] bg-white dark:bg-[#121A2D] sticky top-0 z-20 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-2 text-xs">
            <Link to="/dashboard" className="text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition">
              Home
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] dark:text-[#7F8AA0]" />
                {crumb.href ? (
                  <Link to={crumb.href} className="text-[#667085] dark:text-[#A7B0C0] hover:text-[#172033] dark:hover:text-[#F4F5F7] transition">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#172033] dark:text-[#F4F5F7] font-semibold truncate max-w-xs">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {actions}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF9FF] dark:bg-[#18223A] border border-[#E3E6EF] dark:border-[#26324B] text-[11px] text-[#667085] dark:text-[#A7B0C0]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Grounded AI Engine</span>
              <span className="text-[#6C5CE7] dark:text-[#8175F5] font-semibold">Gemini 2.5</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
