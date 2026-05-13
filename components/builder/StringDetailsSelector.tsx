"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { BRACELET_MATERIALS, BRACELET_SIZES, BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { usedArc, braceletArc } from "@/lib/bead-layout";

const toggleClass = (active: boolean, disabled = false) =>
  cn(
    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
    disabled
      ? "border-neutral-200 bg-neutral-50 text-neutral-300 cursor-not-allowed"
      : active
        ? "border-neutral-900 bg-neutral-900 text-white"
        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
  );

export function StringDetailsSelector() {
  const [open, setOpen] = useState(true);
  const { stringMaterial, braceletSize, setStringMaterial, setBraceletSize, beads } = useStore((s) => ({
    stringMaterial: s.stringMaterial,
    braceletSize: s.braceletSize,
    setStringMaterial: s.setStringMaterial,
    setBraceletSize: s.setBraceletSize,
    beads: s.beads,
  }));

  const arc = usedArc(beads);

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
            {BRACELET_MATERIALS.map(({ value, label }) => (
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
            {BRACELET_SIZES.map(({ value, label }) => {
              const isDisabled = arc > braceletArc(BRACELET_SIZE_RADIUS[value]);
              return (
                <button
                  key={value}
                  onClick={() => !isDisabled && setBraceletSize(value)}
                  disabled={isDisabled}
                  className={toggleClass(braceletSize === value, isDisabled)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
