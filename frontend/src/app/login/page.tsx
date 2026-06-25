"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(loginValue, password);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-signal-blue">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Signal</h1>
          <p className="mt-1 text-sm text-text-secondary">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              placeholder="Phone or username"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !loginValue || !password}
            className="w-full rounded-lg bg-signal-blue py-3 font-medium text-white transition-colors hover:bg-signal-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-signal-blue hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
