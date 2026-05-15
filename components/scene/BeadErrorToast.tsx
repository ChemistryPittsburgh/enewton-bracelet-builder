"use client";

import { useStore } from "@/lib/store";

export function BeadErrorToast() {
  const { errors, removeBead } = useStore((s) => ({
    errors: s.beadLoadErrors,
    removeBead: s.removeBead,
  }));

  if (errors.length === 0) return null;

  return (
    <div className="absolute top-3 right-3 z-40 flex flex-col gap-1.5 max-w-xs">
      {errors.map((err) => (
        <div
          key={err.instanceId}
          className="flex items-start gap-2 rounded-lg bg-white/90 backdrop-blur-sm shadow px-3 py-2 text-xs"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-orange-500 m-0">Model not found</p>
            <p className="text-neutral-600 truncate m-0">{err.name}</p>
            <p className="text-neutral-400 truncate m-0">{err.filename}</p>
          </div>
          <button
            onClick={() => removeBead(err.instanceId)}
            className="text-neutral-400 hover:text-neutral-700 shrink-0 leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
