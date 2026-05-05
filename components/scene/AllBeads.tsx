"use client";

import { Suspense } from "react";
import { useStore } from "@/lib/store";
import { BeadOnBracelet } from "./BeadOnBracelet";

export function AllBeads() {
  const beads = useStore((s) => s.beads);

  return (
    <group name="all-beads">
      {beads.map((bead, index) => (
        <Suspense key={bead.instanceId} fallback={null}>
          <BeadOnBracelet bead={bead} slotIndex={index} />
        </Suspense>
      ))}
    </group>
  );
}
