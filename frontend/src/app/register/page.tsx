"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(phone, username, password, displayName);
      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Create Account</h1>
          <p className="mt-1 text-sm text-text-secondary">Join Signal messaging</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div>
            <input
              type="tel"
              placeholder="Phone number (e.g. +1234567890)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              required
              minLength={3}
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !phone || !username || !password || !displayName}
            className="w-full rounded-lg bg-signal-blue py-3 font-medium text-white transition-colors hover:bg-signal-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-signal-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
