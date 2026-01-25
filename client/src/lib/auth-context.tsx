import { createContext, useContext, useState, type ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  username: string;
  role: "admin";
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const login = async (username: string, password: string) => {
    // Mock authentication
    if (username === "Abdulaziz" && password === "Abdulaziz5552") {
      setUser({ username, role: "admin" });
      setLocation("/admin");
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
