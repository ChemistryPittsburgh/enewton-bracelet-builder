"use client";

import { X } from "lucide-react";
import type { User } from "@/types";
import { Button } from "@/components/ui/Button";

export function OtpCreatedModal({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-[2px] border border-neutral-200 bg-white shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-color-base/80">User created</h2>
          <button onClick={onClose} className="icon-only-btn">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm">
          <span className="font-semibold">{user.name}</span> has been created. They can sign in
          using their email address.
        </p>

        <Button
          onClick={onClose}
          size="sm"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
