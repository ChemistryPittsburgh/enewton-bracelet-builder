"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { z } from "zod";
import { useCreateOtpUser } from "@/hooks/useUsers";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { PermissionsDropdown, PERMISSION_FIELDS } from "./PermissionsDropdown";
import type { User } from "@/types";

const schema = z.object({
  name:  z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
});

export function CreateOtpUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (result: User) => void;
}) {
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [permissions, setPermissions] = useState<Set<keyof User["permissions"]>>(new Set());
  const [sendEmail,   setSendEmail]   = useState(true);
  const [nameError,   setNameError]   = useState<string | null>(null);
  const [emailError,  setEmailError]  = useState<string | null>(null);
  const { mutate, isPending, error }  = useCreateOtpUser();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse({ name: name.trim(), email: email.trim() });
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors;
      setNameError(issues.name?.[0] ?? null);
      setEmailError(issues.email?.[0] ?? null);
      return;
    }
    setNameError(null);
    setEmailError(null);
    const perms = Object.fromEntries(
      PERMISSION_FIELDS.map(({ key }) => [key, permissions.has(key)]),
    ) as User["permissions"];
    mutate(
      { name: result.data.name, email: result.data.email, permissions: perms, send_email: sendEmail },
      { onSuccess: onCreated },
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Add OTP user</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-neutral-100 text-neutral-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="otp-create-name" className="text-xs font-medium text-neutral-600">Name</label>
            <input
              id="otp-create-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (nameError) setNameError(null); }}
              className={`rounded-lg border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors ${
                nameError ? "border-red-400 focus:border-red-500" : "border-neutral-300 focus:border-neutral-600"
              }`}
              placeholder="Full name"
            />
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="otp-create-email" className="text-xs font-medium text-neutral-600">Email</label>
            <input
              id="otp-create-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
              className={`rounded-lg border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors ${
                emailError ? "border-red-400 focus:border-red-500" : "border-neutral-300 focus:border-neutral-600"
              }`}
              placeholder="user@example.com"
            />
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600">Permissions</label>
            <PermissionsDropdown selected={permissions} onChange={setPermissions} />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span
              className={`relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                sendEmail ? "bg-neutral-800" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  sendEmail ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="sr-only"
              />
            </span>
            <span className="text-sm text-neutral-700">Send welcome email</span>
          </label>

          {error && (
            <ErrorAlert message={error instanceof Error ? error.message : "Failed to create user"} />
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-neutral-800 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}