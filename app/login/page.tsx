"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

import { LOGO_SRC, LOGO_ALT, DEFAULT_BRACELET_NAME} from "@/lib/constants";

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
      <div className="w-full max-w-sm rounded-xl border border-default bg-white p-8 shadow-sm">
        <img
            src={LOGO_SRC}
            alt={LOGO_ALT}
            className="header-logo w-48 mx-auto"
          />
        <h1 className="mb-1 text-center text-lg font-semibold">
          Bracelet Builder
        </h1>
        <p className="mb-6 text-center text-sm text-color-base/70">
          Enter your access token to continue.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="token" className="text-sm font-medium">
              Access Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setTokenValue(e.target.value)}
              placeholder="Paste your token here"
              autoComplete="current-password"
              className="rounded border border-default px-3 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
              disabled={loading}
            />
          </div>

          {error && <ErrorAlert message={error} />}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading || !token.trim()}
            className="w-full"
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}