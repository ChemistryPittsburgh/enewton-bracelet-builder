"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function LoginPage() {
  const router = useRouter();
  const [token, setTokenValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${trimmed}` },
      });

      if (res.status === 401) {
        setError("Invalid token — please try again.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      setToken(trimmed);
      router.replace("/");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <img
          src="https://enewtondesign.com/cdn/shop/files/enewton_header_logo.png"
          alt="eNewton Design"
          className="mx-auto mb-6 max-w-[160px]"
        />
        <h1 className="mb-1 text-center text-lg font-semibold text-neutral-800">
          Bracelet Builder
        </h1>
        <p className="mb-6 text-center text-sm text-neutral-500">
          Enter your access token to continue.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="token"
              className="text-sm font-medium text-neutral-700"
            >
              Access Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setTokenValue(e.target.value)}
              placeholder="Paste your token here"
              autoComplete="current-password"
              className="rounded border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="rounded bg-neutral-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
