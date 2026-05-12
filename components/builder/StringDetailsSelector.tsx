"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { StringMaterial, BraceletSize } from "@/types";

const MATERIALS: { value: StringMaterial; label: string }[] = [
  { value: "wire",    label: "Wire" },
  { value: "chord",   label: "Chord" },
  { value: "elastic", label: "Elastic" },
];

const SIZES: { value: BraceletSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "large", label: "Large" },
];

const toggleClass = (active: boolean) =>
  cn(
    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
    active
      ? "border-neutral-900 bg-neutral-900 text-white"
      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
  );

export function StringDetailsSelector() {
  const [open, setOpen] = useState(true);
  const { stringMaterial, braceletSize, setStringMaterial, setBraceletSize } = useStore((s) => ({
    stringMaterial: s.stringMaterial,
    braceletSize: s.braceletSize,
    setStringMaterial: s.setStringMaterial,
    setBraceletSize: s.setBraceletSize,
  }));

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="flex w-full items-center justify-between px-5 py-4 border-b border-neutral-100">
        <span className="text-sm font-semibold text-neutral-900">String details</span>
        <ChevronDown
          size={18}
          className={cn(
            "text-neutral-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </Collapsible.Trigger>

      <Collapsible.Content className="px-5 py-4 space-y-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Material</span>
          <div className="flex gap-1.5">
            {MATERIALS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStringMaterial(value)}
                className={toggleClass(stringMaterial === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Bracelet size</span>
          <div className="flex gap-1.5">
            {SIZES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setBraceletSize(value)}
                className={toggleClass(braceletSize === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
