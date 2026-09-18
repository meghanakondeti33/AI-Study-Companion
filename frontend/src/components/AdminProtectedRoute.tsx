import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const AdminProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#635BFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#667085] font-semibold">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  if (!user && !token) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
