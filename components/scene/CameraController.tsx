"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getBeadAngle, getBeadPosition, getBeadTransformLine, braceletArc } from "@/lib/bead-layout";
import {
  CAMERA_DEFAULT_POSITION,
  CAMERA_EDIT_HEIGHT,
  CAMERA_EDIT_SIDE_POSITION,
  ZOOM_BEAD_X_MULTIPLIER,
  ZOOM_BEAD_Y_OFFSET,
  ZOOM_BEAD_Z_MULTIPLIER,
  BRACELET_SIZE_RADIUS,
  CAMERA_FOV,
  LINE_VIEW_EDIT_HEIGHT,
} from "@/lib/constants";
import type { CameraControls } from "@react-three/drei";

interface CameraControllerProps {
  controlsRef: React.RefObject<CameraControls>;
}

export function CameraController({ controlsRef }: CameraControllerProps) {
const { selectedBead, beads, isEditMode, editViewMode, viewMode, braceletSize, selectAllActive } = useStore((s) => ({
    selectedBead:  s.selectedBead,
    beads:         s.beads,
    isEditMode:    s.isEditMode,
    editViewMode:  s.editViewMode,
    viewMode:      s.viewMode,
    braceletSize:  s.braceletSize,
    selectAllActive: s.selectAllActive,
  }));

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // ── Line view: camera always locked ──────────────────────────────────────
    if (viewMode === 'line') {
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;

      // Compute Z so the full bracelet circumference fits in frame (+ 25% padding).
      // Uses vertical FOV; assumes the canvas is wider than it is tall so horizontal
      // extent is not the constraint, but we still want a comfortable side view.
      const cordLength = braceletArc(BRACELET_SIZE_RADIUS[braceletSize]);
      const camZ = (cordLength / 2) / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180) * 1.25;
      const camY = camZ * 0.35;

      if (isEditMode && editViewMode === 'top') {
        controls.setLookAt(0, LINE_VIEW_EDIT_HEIGHT, 0, 0, 0, 0, true);
      } else if (selectedBead) {
        const index = beads.findIndex((b) => b.instanceId === selectedBead.instanceId);
        if (index !== -1) {
          const bx = getBeadTransformLine(index, beads).position[0];
          controls.setLookAt(bx, camY, camZ, bx, 0, 0, true);
        }
      } else {
        controls.setLookAt(0, camY, camZ, 0, 0, 0, true);
      }

      // Rotation and pan locked; zoom (dolly) enabled — same as 3D free mode
      controls.mouseButtons.left   = 0;    // no rotate
      controls.mouseButtons.right  = 0;    // no pan
      controls.mouseButtons.middle = 16;   // dolly
      controls.mouseButtons.wheel  = 16;   // dolly
      controls.touches.one   = 0;          // no single-finger rotate
      controls.touches.two   = 4096;       // pinch zoom
      controls.touches.three = 0;
    }

    // ── 3D view ───────────────────────────────────────────────────────────────
    if (isEditMode) {
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

    // Restore full controls when returning to 3D free mode
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.mouseButtons.left   = 1;
    controls.mouseButtons.right  = 2;
    controls.mouseButtons.middle = 16;
    controls.mouseButtons.wheel  = 16;
    controls.touches.one   = 64;
    controls.touches.two   = 4096;
    controls.touches.three = 128;

    if (selectedBead && !selectAllActive) {
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
      controls.setLookAt(...CAMERA_DEFAULT_POSITION, 0, 0, 0, true);
    }
  }, [viewMode, isEditMode, editViewMode, selectedBead, beads, braceletSize, controlsRef, selectAllActive]);

  return null;
}