import React from "react";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      id="theme-toggle-btn"
      data-testid="theme-toggle-btn"
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to Dark theme" : "Switch to Light theme"}
      aria-label="Toggle theme"
      className={`relative inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${
        theme === "light"
          ? "bg-white hover:bg-[#FAF9FF] text-[#172033] border-[#E3E6EF] hover:border-[#D3D8E5] shadow-xs"
          : "bg-[#121A2D] hover:bg-[#18223A] text-[#F4F5F7] border-[#26324B] hover:border-[#354361] shadow-xs"
      } ${className}`}
    >
      {theme === "light" ? (
        <span className="flex items-center gap-1.5 text-xs text-[#667085] hover:text-[#172033]">
          <Moon className="w-4 h-4 text-[#6C5CE7]" />
          <span className="hidden sm:inline font-medium">Dark</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-[#A7B0C0] hover:text-[#F4F5F7]">
          <Sun className="w-4 h-4 text-[#F2B84B]" />
          <span className="hidden sm:inline font-medium">Light</span>
        </span>
      )}
    </button>
  );
};
