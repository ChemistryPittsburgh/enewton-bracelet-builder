"use client";

import { useEffect, useRef } from "react";
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
import { Vector3 } from "three";
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

  // Track the previous selectedBead
  const prevSelectedBeadRef = useRef(selectedBead);
  const prevSelectAllActiveRef = useRef(selectAllActive);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const radius = BRACELET_SIZE_RADIUS[braceletSize];

    // ── Line view ─────────────────────────────────────────────────────────────
    if (viewMode === 'line') {
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;

      const cordLength = braceletArc(radius);
      const camZ = (cordLength / 2) / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180) * 0.55;
      const camY = camZ * 0.15;
      // Zoomed-in Z distance to selected bead - fill canvas
      const camZZoomed = camZ * 0.55;

      const prevBead = prevSelectedBeadRef.current;
      const justDeselectedLine = prevBead && !selectedBead;
      const justSelectedLine   = selectedBead && !selectAllActive && (
        !prevBead || prevBead.instanceId !== selectedBead.instanceId
      );

      const justActivatedSelectAll = selectAllActive && !prevSelectAllActiveRef.current;

      if (isEditMode && editViewMode === 'top') {
        controls.setLookAt(0, LINE_VIEW_EDIT_HEIGHT, 0, 0, 0, 0, true);
      } else if (justActivatedSelectAll) {
        // When Select All activated, snap camera out of focus mode
        controls.setLookAt(0, camY, camZ, 0, 0, 0, true);
      } else if (justSelectedLine) {
        // When one bead is selected, pan and zoom to it
        const index = beads.findIndex((b) => b.instanceId === selectedBead.instanceId);
        if (index !== -1) {
          const bx = getBeadTransformLine(index, beads).position[0];
          controls.setLookAt(bx, camY, camZZoomed, bx, 0, 0, true);
        }
      } else if (justDeselectedLine) {
        // When bead is deselected, unpin focus mode
        controls.setLookAt(0, camY, camZ, 0, 0, 0, true);
      }
      // Otherwise, don't move camera

      controls.mouseButtons.left   = 0;
      controls.mouseButtons.right  = 0;
      controls.mouseButtons.middle = 16;
      controls.mouseButtons.wheel  = 16;
      controls.touches.one   = 0;
      controls.touches.two   = 4096;
      controls.touches.three = 0;

      prevSelectAllActiveRef.current = selectAllActive;
      prevSelectedBeadRef.current = selectedBead;
      return;
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

      prevSelectAllActiveRef.current = selectAllActive;
      prevSelectedBeadRef.current = selectedBead;
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

    const prevBead = prevSelectedBeadRef.current;
    const justDeselected = prevBead && !selectedBead;
    const justSelected   = selectedBead && (
      !prevBead || prevBead.instanceId !== selectedBead.instanceId
    );

    const justActivatedSelectAll3D = selectAllActive && !prevSelectAllActiveRef.current;

    if (justActivatedSelectAll3D) {
      // Select All activated, unpin focus mode
      const currentTarget = controls.getTarget(new Vector3());
      controls.setTarget(0, currentTarget.y, 0, true);

    } else if (justDeselected) {
      // On Deselect, re-centre orbit pivot, leave camera completely alone 
      const currentTarget = controls.getTarget(new Vector3());
      controls.setTarget(0, currentTarget.y, 0, true);

    } else if (justSelected && !selectAllActive) {
      // On Select one bead, zoom toward the bead, preserving current camera angle 
      const index = beads.findIndex((b) => b.instanceId === selectedBead.instanceId);
      if (index !== -1) {
        const angle = getBeadAngle(index, beads, radius);
        const [bx, by, bz] = getBeadPosition(angle, radius);

        // Direction from bracelet centre → bead (radial unit vector in XZ)
        const radialLen = Math.sqrt(bx * bx + bz * bz);
        const nx = radialLen > 0 ? bx / radialLen : 0;
        const nz = radialLen > 0 ? bz / radialLen : 0;

        // Push to bead's radial direction - fix for back beads
        controls.setLookAt(
          bx + nx * ZOOM_BEAD_RADIAL_DISTANCE,
          by + ZOOM_BEAD_Y_OFFSET,
          bz + nz * ZOOM_BEAD_RADIAL_DISTANCE,
          bx, by, bz,
          true  // animate
        );
      }

    } else if (!selectedBead && !prevBead) {
      // Init/reset state
      controls.setLookAt(...CAMERA_DEFAULT_POSITION, 0, 0, 0, true);
    }

    prevSelectAllActiveRef.current = selectAllActive;
    prevSelectedBeadRef.current = selectedBead;
  }, [viewMode, isEditMode, editViewMode, selectedBead, beads, braceletSize, controlsRef, selectAllActive]);

  return null;
}