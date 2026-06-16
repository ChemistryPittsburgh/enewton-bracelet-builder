"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { getToken, setToken } from "@/lib/auth";
import { useRequestCode, useVerifyCode } from "@/hooks/useAuth";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ApiError } from "@/lib/api";
import { LOGO_SRC, LOGO_ALT } from "@/lib/constants";

const emailSchema = z.string().email("Enter a valid email address.");
const codeSchema  = z.string().regex(/^\d{6}$/, "Enter the 6-digit code.");

export default function LoginNewPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [resent, setResent] = useState(false);

  const { mutate: requestCode, isPending: requesting, error: requestError, reset: resetRequest } = useRequestCode();
  const { mutate: verifyCode, isPending: verifying, error: verifyError, reset: resetVerify } = useVerifyCode();

  useEffect(() => {
    if (getToken()) router.replace("/");
  }, [router]);

  function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setEmailError(result.error.issues[0].message);
      return;
    }
    setEmailError(null);
    resetRequest();
    setEmail(result.data);
    requestCode({ email: result.data }, {
      onSuccess: () => setStep("code"),
    });
  }

  function handleVerify(codeValue = code) {
    const result = codeSchema.safeParse(codeValue);
    if (!result.success) {
      setCodeError(result.error.issues[0].message);
      return;
    }
    setCodeError(null);
    resetVerify();
    verifyCode(
      { email, code: result.data, remember },
      {
        onSuccess: (data) => {
          setToken(data.token);
          router.replace("/");
        },
      },
    );
  }

  function handleCodeChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (codeError) setCodeError(null);
    if (verifyError) resetVerify();
    if (digits.length === 6) handleVerify(digits);
  }

  function handleResend() {
    setCode("");
    setCodeError(null);
    resetVerify();
    setResent(false);
    requestCode({ email }, {
      onSuccess: () => { setResent(true); setTimeout(() => setResent(false), 3000); },
    });
  }

  function handleBackToEmail() {
    setStep("email");
    setCode("");
    setCodeError(null);
    resetVerify();
    setResent(false);
  }

  const requestErrorMessage = requestError instanceof ApiError
    ? requestError.message
    : requestError ? "Could not send code. Please try again." : null;

  const verifyErrorMessage = verifyError instanceof ApiError
    ? verifyError.message
    : verifyError ? "Something went wrong. Please try again." : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <img
          src={LOGO_SRC}
          alt={LOGO_ALT}
          className="mx-auto mb-6 max-w-[160px]"
        />
        <h1 className="mb-1 text-center text-lg font-semibold text-neutral-800">
          Bracelet Builder
        </h1>

        {step === "email" ? (
          <>
            <p className="mb-6 text-center text-sm text-neutral-500">
              Enter your email to receive a sign-in code.
            </p>
            <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-neutral-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  disabled={requesting}
                  className={`rounded border px-3 py-2 text-sm outline-none transition disabled:opacity-50 ${
                    emailError
                      ? "border-red-400 focus:border-red-500"
                      : "border-neutral-300 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600"
                  }`}
                />
                {emailError && (
                  <p className="text-xs text-red-500">{emailError}</p>
                )}
              </div>

              {requestErrorMessage && (
                <ErrorAlert message={requestErrorMessage} />
              )}

              <button
                type="submit"
                disabled={requesting || !email.trim()}
                className="rounded bg-neutral-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                {requesting ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-neutral-500">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-neutral-700">{email}</span>.
              Codes expire after 15 minutes.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="code" className="text-sm font-medium text-neutral-700">
                  Sign-in code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  disabled={verifying}
                  placeholder="123456"
                  className={`rounded border px-3 py-2 text-center text-xl font-mono tracking-[0.5em] outline-none transition disabled:opacity-50 ${
                    codeError
                      ? "border-red-400 focus:border-red-500"
                      : "border-neutral-300 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600"
                  }`}
                />
                {codeError && (
                  <p className="text-xs text-red-500">{codeError}</p>
                )}
              </div>

              <label className="flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 accent-neutral-800"
                />
                <span className="text-sm text-neutral-600">Remember me for 7 days</span>
              </label>

              {verifyErrorMessage && (
                <ErrorAlert message={verifyErrorMessage} />
              )}

              <button
                type="button"
                disabled={verifying || code.length !== 6}
                onClick={() => handleVerify()}
                className="rounded bg-neutral-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                {verifying ? "Signing in…" : "Sign in"}
              </button>

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="transition-colors hover:text-neutral-600"
                >
                  ← Different email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={requesting}
                  className="transition-colors hover:text-neutral-600 disabled:opacity-50"
                >
                  {resent ? "Code resent ✓" : requesting ? "Sending…" : "Resend code"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}