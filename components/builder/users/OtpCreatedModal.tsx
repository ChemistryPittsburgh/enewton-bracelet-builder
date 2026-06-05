"use client";

import { X } from "lucide-react";
import type { User } from "@/types";

export function OtpCreatedModal({ user, onClose }: { user: User; onClose: () => void }) {
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
          <span className="font-semibold">{user.name}</span> has been created. They can sign in
          using their email address.
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
