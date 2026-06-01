"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { getBeadAngle, getBeadPosition, getBeadTransformLine, braceletArc } from "@/lib/bead-layout";
import {
  CAMERA_DEFAULT_POSITION,
  CAMERA_EDIT_HEIGHT,
  CAMERA_EDIT_SIDE_POSITION,
  ZOOM_BEAD_RADIAL_DISTANCE,
  ZOOM_BEAD_Y_OFFSET,
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
    selectedBead:    s.selectedBead,
    beads:           s.beads,
    isEditMode:      s.isEditMode,
    editViewMode:    s.editViewMode,
    viewMode:        s.viewMode,
    braceletSize:    s.braceletSize,
    selectAllActive: s.selectAllActive,
  }));

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const radius = BRACELET_SIZE_RADIUS[braceletSize];

    // ── Line view: camera always locked ──────────────────────────────────────
    if (viewMode === 'line') {
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;

      const cordLength = braceletArc(radius);
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

      controls.mouseButtons.left   = 0;
      controls.mouseButtons.right  = 0;
      controls.mouseButtons.middle = 16;
      controls.mouseButtons.wheel  = 16;
      controls.touches.one   = 0;
      controls.touches.two   = 4096;
      controls.touches.three = 0;
      return; // ← prevent fallthrough into 3D edit-mode block
    }

    // ── 3D edit mode ──────────────────────────────────────────────────────────
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

    // ── 3D free mode ──────────────────────────────────────────────────────────
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

      // Pass the correct per-size radius so the bead world position matches
      // what's actually rendered in the scene.
      const angle = getBeadAngle(index, beads, radius);
      const [x, y, z] = getBeadPosition(angle, radius);

      // Place the camera directly outside the bracelet along the bead's own
      // radial direction. This keeps the bead centred for all ring positions —
      // front, back, left, and right — unlike per-axis multipliers which skew
      // the camera sideways for beads not on the front arc.
      const radialLen = Math.sqrt(x * x + z * z); // ≈ radius
      const nx = radialLen > 0 ? x / radialLen : 0;
      const nz = radialLen > 0 ? z / radialLen : 0;

      controls.setLookAt(
        x + nx * ZOOM_BEAD_RADIAL_DISTANCE,
        y + ZOOM_BEAD_Y_OFFSET,
        z + nz * ZOOM_BEAD_RADIAL_DISTANCE,
        x, y, z,
        true
      );
    } else {
      controls.setLookAt(...CAMERA_DEFAULT_POSITION, 0, 0, 0, true);
    }
  }, [viewMode, isEditMode, editViewMode, selectedBead, beads, braceletSize, controlsRef, selectAllActive]);

  return null;
}