"use client";

/**
 * BraceletImporter.tsx
 *
 * A hidden file input triggered by a button in the header.
 * Reads a bracelet JSON file, parses it, and loads the beads into the store.
 * Shows a confirmation dialog if beads are already on the bracelet.
 */

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { parseBraceletJson } from "@/lib/import-bracelet";

import { Button } from "@/components/ui/Button";

export function BraceletImporter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
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

    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";

    const text = await file.text();

    let result;
    try {
      result = parseBraceletJson(text);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      setTimeout(() => setStatus(null), 4000);
      return;
    }

    // If beads are already on the bracelet, confirm before replacing
    if (beads.length > 0) {
      const confirmed = window.confirm(
        `This will replace your current ${beads.length} bead${beads.length !== 1 ? "s" : ""} with the ${result.beads.length} beads from the imported file. Continue?`
      );
      if (!confirmed) return;
    }

    loadBeads(result.beads, result.name ?? undefined);

    const msg = result.warnings.length > 0
      ? `Loaded ${result.beads.length} beads (${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""})`
      : `Loaded ${result.beads.length} bead${result.beads.length !== 1 ? "s" : ""} successfully`;

    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFile}
      />

      {/* Trigger button */}

      <Button
        onClick={handleClick}
        className="ml-4 justify-end"
        variant="black"
      >
        <Upload size={14} />
        <span>Import JSON</span>
       </Button>

      {/* Status toast */}
      {status && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-neutral-900 px-4 py-2 text-xs text-white shadow-lg animate-fade-up whitespace-nowrap">
          {status}
        </div>
      )}
    </>
  );
}
