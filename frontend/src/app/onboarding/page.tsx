"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getInitials } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateProfile, uploadAvatar } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (displayName !== user?.display_name) {
        await updateProfile({ display_name: displayName });
      }
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }
      router.push("/chat");
    } catch {
      // Profile update is optional, proceed anyway
      router.push("/chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-text-primary">Set Up Profile</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Add a photo and name for your profile
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-24 w-24 overflow-hidden rounded-full bg-signal-blue-light transition-transform hover:scale-105"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-signal-blue">
                  {displayName ? getInitials(displayName) : "?"}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-3 text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !displayName}
            className="w-full rounded-lg bg-signal-blue py-3 font-medium text-white transition-colors hover:bg-signal-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Continue"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="w-full py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
