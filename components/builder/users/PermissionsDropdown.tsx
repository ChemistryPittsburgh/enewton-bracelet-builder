"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { User } from "@/types";

export const PERMISSION_FIELDS: { key: keyof User["permissions"]; label: string }[] = [
  { key: "is_bracelet_editor", label: "Bracelet Editor" },
  { key: "is_reviewer",        label: "Reviewer" },
  { key: "is_publisher",       label: "Publisher" },
  { key: "is_component_admin", label: "Component Admin" },
  { key: "is_admin",           label: "Admin" },
];

export function PermissionsDropdown({
  selected,
  onChange,
  disabled = false,
}: {
  selected: Set<keyof User["permissions"]>;
  onChange: (next: Set<keyof User["permissions"]>) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(key: keyof User["permissions"]) {
    if (disabled) return;
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
  }

  const label =
    selected.size === 0
      ? "No permissions"
      : PERMISSION_FIELDS.filter((f) => selected.has(f.key))
          .map((f) => f.label)
          .join(", ");

  return (
    <div ref={ref} className={`relative ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-600 transition-colors"
      >
        <span className="truncate text-left text-sm" title={label}>
          {label}
        </span>
        <ChevronDown size={14} className={`ml-2 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg py-1">
          {PERMISSION_FIELDS.map(({ key, label: pLabel }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  selected.has(key)
                    ? "border-neutral-800 bg-neutral-800"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {selected.has(key) && <Check size={10} className="text-white" />}
              </span>
              {pLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
