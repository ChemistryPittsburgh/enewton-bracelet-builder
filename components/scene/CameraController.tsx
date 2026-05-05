"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getBeadAngle, getBeadPosition } from "@/lib/bead-layout";
import type { CameraControls } from "@react-three/drei";

interface CameraControllerProps {
  controlsRef: React.RefObject<CameraControls>;
}

export function CameraController({ controlsRef }: CameraControllerProps) {
  const { selectedBead, beads } = useStore((s) => ({
    selectedBead: s.selectedBead,
    beads: s.beads,
  }));

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (selectedBead) {
      // Find the index of the selected bead to get its position
      const index = beads.findIndex(
        (b) => b.instanceId === selectedBead.instanceId
      );
      if (index === -1) return;

      const angle = getBeadAngle(index, beads);
      const [x, y, z] = getBeadPosition(angle);

      // Zoom into the bead — pull camera close and look directly at it
      controls.setLookAt(
        x * 3.5,  // camera position — same direction as bead, pulled back a bit
        y + 0.015,
        z * 2.5,
        x,        // look-at target — the bead itself
        y,
        z,
        true      // animate = true
      );
    } else {
      // Zoom back out to the default view
      controls.setLookAt(
        0, 0.08, 0.06,  // default camera position
        0, 0, 0,         // look at bracelet centre
        true
      );
    }
  }, [selectedBead, beads, controlsRef]);

  return null;
}