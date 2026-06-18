"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useCreatePattern } from "@/hooks/useCreatePattern";

const nameSchema = z.string().min(1, "Name is required");

interface CreatePatternDialogProps {
  initialName: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function CreatePatternDialog({ initialName, onClose, onSaved }: CreatePatternDialogProps) {
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const { mutateAsync: createPattern, isPending, error } = useCreatePattern();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = nameSchema.safeParse(name.trim());
    if (!result.success) {
      setNameError(result.error.issues[0].message);
      return;
    }
    setNameError(null);
    await createPattern({ name: result.data });
    onSaved ? onSaved() : onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}
    >
      <div className="w-[420px] rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-semibold">Save as Pattern</h3>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-full p-1 text-color-base/70 hover:bg-default/50 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-color-base/70 -mt-2">
          Save the current bracelet as a reusable pattern template.
        </p>

        {error && <ErrorAlert message="Failed to create pattern — please try again." />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-color-base/70">Pattern name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(null); }}
              placeholder="Enter pattern name"
              autoFocus
              disabled={isPending}
              className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy placeholder:text-color-base/40 disabled:opacity-50"
            />
            {nameError && <p className="text-xs text-error">{nameError}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm" className="w-full" disabled={isPending}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Save Pattern
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
