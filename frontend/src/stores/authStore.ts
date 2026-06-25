import { create } from "zustand";
import { api } from "@/lib/api";
import { User, TokenResponse } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (phone: string, username: string, password: string, displayName: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  fetchUser: () => Promise<void>;
  updateProfile: (data: { display_name?: string; status_text?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: typeof window !== "undefined" && !!localStorage.getItem("access_token"),
  isLoading: false,

  login: async (login, password) => {
    const data = await api.post<TokenResponse>("/api/auth/login", { login, password });
    api.setTokens(data.access_token, data.refresh_token);
    set({ isAuthenticated: true });
  },

  register: async (phone, username, password, displayName) => {
    await api.post("/api/auth/register", {
      phone,
      username,
      password,
      display_name: displayName,
    });
  },

  verifyOtp: async (phone, otp) => {
    const data = await api.post<TokenResponse>("/api/auth/verify-otp", { phone, otp });
    api.setTokens(data.access_token, data.refresh_token);
    set({ isAuthenticated: true });
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const user = await api.get<User>("/api/users/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      api.clearTokens();
    }
  },

  updateProfile: async (data) => {
    const user = await api.patch<User>("/api/users/me", data);
    set({ user });
  },

  uploadAvatar: async (file) => {
    const user = await api.upload<User>("/api/users/me/avatar", file);
    set({ user });
  },

  logout: () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      api.post("/api/auth/logout", { refresh_token: refreshToken }).catch(() => {});
    }
    api.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));
