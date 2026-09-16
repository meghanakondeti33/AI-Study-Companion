import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, clearToken, UserProfile } from "../api/client";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const profile = await api.auth.getMe();
      setUser(profile);
    } catch (err) {
      setUser(null);
      setTokenState(null);
      clearToken();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      setUser(null);
      setTokenState(null);
      clearToken();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      setToken(res.access_token);
      setTokenState(res.access_token);
      const profile = await api.auth.getMe();
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await api.auth.register({ name, email, password });
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
