"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { getBeadAngle, getBeadPosition, getBeadTransformLine, braceletArc, getEvenSpacingBonus } from "@/lib/bead-layout";
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

// Free orbit/pan/zoom
function enableFreeControls(c: CameraControls) {
  c.mouseButtons.left = 1; c.mouseButtons.right = 2;
  c.mouseButtons.middle = 16; c.mouseButtons.wheel = 16;
  c.touches.one = 64; c.touches.two = 4096; c.touches.three = 128;
}
// Edit mode: no rotation or zoom, but right-drag / two-finger-drag pans so
// the user can move the view when zoomed in.
function enableEditControls(c: CameraControls) {
  c.mouseButtons.left = 0; c.mouseButtons.right = 2;  // 2 = TRUCK
  c.mouseButtons.middle = 0; c.mouseButtons.wheel = 0;
  c.touches.one = 0; c.touches.two = 2048; c.touches.three = 0; // 2048 = TOUCH_TRUCK
}

interface CameraControllerProps {
  controlsRef: React.RefObject<CameraControls>;
}

export function CameraController({ controlsRef }: CameraControllerProps) {
  const { selectedBead, beads, isEditMode, editViewMode, viewMode, braceletSize, selectAllActive, isEvenlySpaced, canvasTool } = useStore(useShallow((s) => ({
    selectedBead:    s.selectedBead,
    beads:           s.beads,
    isEditMode:      s.isEditMode,
    editViewMode:    s.editViewMode,
    viewMode:        s.viewMode,
    braceletSize:    s.braceletSize,
    selectAllActive: s.selectAllActive,
    isEvenlySpaced:  s.isEvenlySpaced,
    canvasTool:      s.canvasTool,
  })));

  const prevViewModeRef        = useRef(viewMode);
  const prevEditViewModeRef    = useRef(editViewMode);
  const prevIsEditModeRef      = useRef(isEditMode);
  const prevSelectedBeadRef    = useRef(selectedBead);
  const prevSelectAllRef       = useRef(selectAllActive);
  const prevIsEvenlySpacedRef  = useRef(isEvenlySpaced);

  // Refs for values needed inside the effect but that should NOT trigger re-runs.
  // beads is only read to find a selected bead's position; selectedBead changing
  // already covers that case. braceletSize is only needed for radius math.
  const beadsRef          = useRef(beads);
  beadsRef.current        = beads;
  const braceletSizeRef   = useRef(braceletSize);
  braceletSizeRef.current = braceletSize;
  const canvasToolRef     = useRef(canvasTool);
  canvasToolRef.current   = canvasTool;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Snapshot previous state, then sync ALL refs immediately. Every branch
    // below can return early without worrying about stale transition flags.
    const prev = {
      viewMode:        prevViewModeRef.current,
      editViewMode:    prevEditViewModeRef.current,
      isEditMode:      prevIsEditModeRef.current,
      selectedBead:    prevSelectedBeadRef.current,
      selectAllActive: prevSelectAllRef.current,
    };
    prevViewModeRef.current        = viewMode;
    prevEditViewModeRef.current    = editViewMode;
    prevIsEditModeRef.current      = isEditMode;
    prevSelectedBeadRef.current    = selectedBead;
    prevSelectAllRef.current       = selectAllActive;
    const isEvenlySpacedChanged    = isEvenlySpaced !== prevIsEvenlySpacedRef.current;
    prevIsEvenlySpacedRef.current  = isEvenlySpaced;

    const radius = BRACELET_SIZE_RADIUS[braceletSizeRef.current];

    // Shared transition flags
    const enteredEdit      = isEditMode && !prev.isEditMode;
    const switchedView     = viewMode !== prev.viewMode;
    const switchedEditView = editViewMode !== prev.editViewMode;
    const justDeselected   = prev.selectedBead && !selectedBead;
    const justActivatedAll = selectAllActive && !prev.selectAllActive;
    const beadChanged      = selectedBead &&
      (!prev.selectedBead || prev.selectedBead.instanceId !== selectedBead.instanceId);
    const justSelected     = selectedBead && !selectAllActive && (switchedView || beadChanged);

    // ── Line view ─────────────────────────────────────────────────────────────
    if (viewMode === 'line') {
      const cordLength = braceletArc(radius);
      const camZ = (cordLength / 2) / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180) * 0.55;
      const camY = camZ * 0.05;
      const camZZoomed = camZ * 0.55;

      // Top only when explicitly toggled there — never on fresh entry, so edit
      // mode always *starts* on the side view.
      const wantTop        = isEditMode && editViewMode === 'top' && !enteredEdit && !switchedView;
      const wantEditAdjust = isEditMode && (enteredEdit || switchedView || switchedEditView);

      if (wantTop) {
        controls.setLookAt(0, LINE_VIEW_EDIT_HEIGHT, 0, 0, 0, 0, true);
      } else if (wantEditAdjust) {
        controls.setLookAt(0, camY, camZ, 0, 0, 0, true);          // side
      } else if (justActivatedAll) {
        controls.setLookAt(0, camY, camZ, 0, 0, 0, true);
      } else if (justSelected) {
        const i = beadsRef.current.findIndex((b) => b.instanceId === selectedBead!.instanceId);
        if (i !== -1) {
          const bx = getBeadTransformLine(i, beadsRef.current).position[0];
          controls.setLookAt(bx, camY, camZZoomed, bx, 0, 0, true);
        }
      } else if (justDeselected || switchedView) {
        controls.setLookAt(0, camY, camZ, 0, 0, 0, true);
      }
      // else: leave camera where the user put it

      const polarBuffer = Math.PI * 0.2;                            // ~36° from poles
      controls.minPolarAngle = polarBuffer;
      controls.maxPolarAngle = Math.PI - polarBuffer;
      enableFreeControls(controls);
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

      // Lock the camera at its final angle once the animation settles
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
        enableEditControls(controls!);
        // Hand tool: left-drag pans (truck) instead of doing nothing; select
        // tool leaves left free for bead interaction.
        controls!.mouseButtons.left = canvasToolRef.current === 'pan' ? 2 : 0;
        controls!.removeEventListener('rest', lockOnRest);
      }
      controls.addEventListener('rest', lockOnRest);
      return () => controls.removeEventListener('rest', lockOnRest);
    }

    // ── 3D free mode ──────────────────────────────────────────────────────────
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    enableFreeControls(controls);

    if (justActivatedAll) {
      // Select All — re-centre orbit pivot, leave camera alone
      const t = controls.getTarget(new Vector3());
      controls.setTarget(0, t.y, 0, true);
    } else if (justDeselected) {
      // Deselect — re-centre orbit pivot, leave camera alone
      const t = controls.getTarget(new Vector3());
      controls.setTarget(0, t.y, 0, true);
    } else if (justSelected) {
      // Zoom toward the bead, preserving current camera angle
      const i = beadsRef.current.findIndex((b) => b.instanceId === selectedBead!.instanceId);
      if (i !== -1) {
        const extraSpacing = isEvenlySpaced ? getEvenSpacingBonus(beadsRef.current, radius) : 0;
        const angle = getBeadAngle(i, beadsRef.current, radius, extraSpacing);
        const [bx, by, bz] = getBeadPosition(angle, radius);
        const radialLen = Math.sqrt(bx * bx + bz * bz);
        const nx = radialLen > 0 ? bx / radialLen : 0;
        const nz = radialLen > 0 ? bz / radialLen : 0;
        controls.setLookAt(
          bx + nx * ZOOM_BEAD_RADIAL_DISTANCE,
          by + ZOOM_BEAD_Y_OFFSET,
          bz + nz * ZOOM_BEAD_RADIAL_DISTANCE,
          bx, by, bz,
          true,
        );
      }
    } else if (!selectedBead && !prev.selectedBead && !isEvenlySpacedChanged) {
      // Init / reset (skip when only isEvenlySpaced changed — spacing doesn't
      // affect camera position, and the reset discards the user's orbit angle)
      controls.setLookAt(...CAMERA_DEFAULT_POSITION, 0, 0, 0, true);
    }
  }, [viewMode, isEditMode, editViewMode, selectedBead, controlsRef, selectAllActive, isEvenlySpaced]);

  // Live-toggle the hand (pan) tool without repositioning the camera: swap the
  // left mouse button between bead-interaction (0) and truck/pan (2). 3D edit only.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !isEditMode || viewMode === 'line') return;
    controls.mouseButtons.left = canvasTool === 'pan' ? 2 : 0;
  }, [canvasTool, isEditMode, viewMode, controlsRef]);

  return null;
}