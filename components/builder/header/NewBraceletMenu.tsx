"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, LayoutTemplate, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface NewBraceletMenuProps {
  onFromScratch: () => void;
  onCopy: () => void;
  onFromPattern: () => void;
}

/** "New Bracelet" split button: a dropdown of creation options. */
export function NewBraceletMenu({ onFromScratch, onCopy, onFromPattern }: NewBraceletMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function select(fn: () => void) {
    setOpen(false);
    fn();
  }

  const itemClass = "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-mint";

  return (
    <div className="relative" ref={ref}>
      <Button onClick={() => setOpen((o) => !o)} className="gap-1.5">
        <Plus size={14} />
        New Bracelet
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-[2px] border border-default bg-white font-normal tracking-normal shadow-lg">
          <button onClick={() => select(onFromScratch)} className={itemClass}>
            <Plus size={15} className="mt-0.5 shrink-0 text-navy" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">From scratch</span>
              <span className="text-xs text-color-base/60">Start with an empty bracelet</span>
            </span>
          </button>
          <button onClick={() => select(onCopy)} className={itemClass}>
            <Copy size={15} className="mt-0.5 shrink-0 text-navy" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">Copy bracelet</span>
              <span className="text-xs text-color-base/60">Duplicate the current bracelet</span>
            </span>
          </button>
          <button onClick={() => select(onFromPattern)} className={itemClass}>
            <LayoutTemplate size={15} className="mt-0.5 shrink-0 text-navy" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">From pattern</span>
              <span className="text-xs text-color-base/60">Start from a saved pattern</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}