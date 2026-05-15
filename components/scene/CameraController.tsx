"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getBeadAngle, getBeadPosition } from "@/lib/bead-layout";
import {
  CAMERA_DEFAULT_POSITION,
  ZOOM_BEAD_X_MULTIPLIER,
  ZOOM_BEAD_Y_OFFSET,
  ZOOM_BEAD_Z_MULTIPLIER,
} from "@/lib/constants";
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

      controls.setLookAt(
        x * ZOOM_BEAD_X_MULTIPLIER,
        y + ZOOM_BEAD_Y_OFFSET,
        z * ZOOM_BEAD_Z_MULTIPLIER,
        x, y, z,
        true
      );
    } else {
      controls.setLookAt(
        ...CAMERA_DEFAULT_POSITION,
        0, 0, 0,
        true
      );
    }
  }, [selectedBead, beads, controlsRef]);

  return null;
}