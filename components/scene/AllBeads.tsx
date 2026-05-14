"use client";

import { Suspense } from "react";
import { useStore } from "@/lib/store";
import { BeadOnBracelet } from "./BeadOnBracelet";
import { BeadErrorBoundary } from "./BeadErrorBoundary";

export function AllBeads() {
  const beads = useStore((s) => s.beads);

  return (
    <group name="all-beads">
      {beads.map((bead, index) => (
        <BeadErrorBoundary key={bead.instanceId} bead={bead} slotIndex={index}>
          <Suspense fallback={null}>
            <BeadOnBracelet bead={bead} slotIndex={index} />
          </Suspense>
        </BeadErrorBoundary>
      ))}
    </group>
  );
}
