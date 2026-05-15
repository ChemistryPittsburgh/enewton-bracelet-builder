"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { parseBraceletJson } from "@/lib/import-bracelet";

type ImportStatus = { message: string; warnings: string[] } | null;

export function useBraceletImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ImportStatus>(null);
  const { beads, loadBeads } = useStore((s) => ({
    beads: s.beads,
    loadBeads: s.loadBeads,
  }));

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const text = await file.text();
    let result;
    try {
      result = parseBraceletJson(text);
    } catch (err: any) {
      setStatus({ message: `Error: ${err.message}`, warnings: [] });
      setTimeout(() => setStatus(null), 4000);
      return;
    }

    if (beads.length > 0) {
      const confirmed = window.confirm(
        `This will replace your current ${beads.length} bead${beads.length !== 1 ? "s" : ""} with the ${result.beads.length} beads from the imported file. Continue?`
      );
      if (!confirmed) return;
    }

    loadBeads(result.beads, result.name ?? undefined);

    const n = result.beads.length;
    const w = result.warnings.length;
    setStatus({
      message: w > 0
        ? `Loaded ${n} bead${n !== 1 ? "s" : ""} with ${w} warning${w !== 1 ? "s" : ""}`
        : `Loaded ${n} bead${n !== 1 ? "s" : ""} successfully`,
      warnings: result.warnings,
    });
    setTimeout(() => setStatus(null), w > 0 ? 6000 : 3000);
  }

  return { inputRef, status, handleClick, handleFile };
}
