"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import type { CreateUserResponse } from "@/hooks/useUsers";

export function TokenModal({ result, onClose }: { result: CreateUserResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(result.token)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">User created</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-neutral-100 text-neutral-400">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-neutral-700">
          <span className="font-semibold">{result.name}</span> has been created. Copy their login token now — it will not be shown again.
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
          <code className="flex-1 text-xs font-mono text-neutral-800 break-all select-all">
            {result.token}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded p-1.5 hover:bg-neutral-200 transition-colors text-neutral-500"
            title="Copy token"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
        </div>

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          This token will not be shown again. Make sure the user saves it before closing.
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-neutral-800 py-2 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}