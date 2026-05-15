"use client";

import { Upload } from "lucide-react";
import { useBraceletImport } from "@/hooks/useBraceletImport";
import { Button } from "@/components/ui/Button";

export function BraceletImporter() {
  const { inputRef, status, handleClick, handleFile } = useBraceletImport();

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFile}
      />

      <Button onClick={handleClick} className="ml-4 justify-end" variant="black">
        <Upload size={14} />
        <span>Import JSON</span>
      </Button>

      {status && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-neutral-900 px-4 py-2 text-xs text-white shadow-lg animate-fade-up max-w-sm">
          <p className="whitespace-nowrap">{status.message}</p>
          {status.warnings.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-neutral-400 list-disc list-inside">
              {status.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
