"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getBeadAngle, getBeadPosition } from "@/lib/bead-layout";
import {
  CAMERA_DEFAULT_POSITION,
  CAMERA_EDIT_HEIGHT,
  CAMERA_EDIT_SIDE_POSITION,
  ZOOM_BEAD_X_MULTIPLIER,
  ZOOM_BEAD_Y_OFFSET,
  ZOOM_BEAD_Z_MULTIPLIER,
} from "@/lib/constants";
import type { CameraControls } from "@react-three/drei";

interface CameraControllerProps {
  controlsRef: React.RefObject<CameraControls>;
}

export function CameraController({ controlsRef }: CameraControllerProps) {
  const { selectedBead, beads, isEditMode, editViewMode } = useStore((s) => ({
    selectedBead: s.selectedBead,
    beads: s.beads,
    isEditMode: s.isEditMode,
    editViewMode: s.editViewMode,
  }));

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (isEditMode) {
      // Reset polar constraints so the animation can reach any position
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;

      if (editViewMode === 'top') {
        controls.setLookAt(0, CAMERA_EDIT_HEIGHT, 0, 0, 0, 0, true);
      } else {
        controls.setLookAt(...CAMERA_EDIT_SIDE_POSITION, 0, 0, 0, true);
      }

      function lockOnRest() {
        if (editViewMode === 'top') {
          controls!.minPolarAngle = 0;
          controls!.maxPolarAngle = 0;
        } else {
          const [cx, cy, cz] = CAMERA_EDIT_SIDE_POSITION;
          const polar = Math.atan2(Math.hypot(cx, cz), cy);
          controls!.minPolarAngle = polar;
          controls!.maxPolarAngle = polar;
        }
        controls!.mouseButtons.left   = 0;
        controls!.mouseButtons.right  = 0;
        controls!.mouseButtons.middle = 0;
        controls!.mouseButtons.wheel  = 0;
        controls!.touches.one   = 0;
        controls!.touches.two   = 0;
        controls!.touches.three = 0;
        controls!.removeEventListener('rest', lockOnRest);
      }
      controls.addEventListener('rest', lockOnRest);
      return () => controls.removeEventListener('rest', lockOnRest);
    }

    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.mouseButtons.left   = 1;
    controls.mouseButtons.right  = 2;
    controls.mouseButtons.middle = 16;
    controls.mouseButtons.wheel  = 16;
    controls.touches.one   = 64;
    controls.touches.two   = 4096;
    controls.touches.three = 128;

    if (selectedBead) {
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
  }, [isEditMode, editViewMode, selectedBead, beads, controlsRef]);

  return null;
}