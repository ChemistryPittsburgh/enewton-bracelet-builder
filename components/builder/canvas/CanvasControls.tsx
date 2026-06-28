"use client";

import { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Hand, SwitchCamera } from "lucide-react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import {
  CAMERA_MIN_DISTANCE,
  CAMERA_EDIT_HEIGHT,
  CAMERA_EDIT_SIDE_POSITION,
  CAMERA_EDIT_SIDE_DISTANCE,
  CAMERA_EDIT_ZOOM_STEP,
} from "@/lib/constants";
import { Tooltip } from "@/components/ui/Tooltip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EditBtn } from "./EditModeToolbar";

// One tap orbits the camera 45° around the bracelet. Edit mode pins the
// elevation (polar) angle but leaves azimuth free, so this rotates at the
// current top/side height without breaking the two-view lock.
const ROTATE_STEP = Math.PI / 7.5;

/**
 * Canvas-navigation cluster pinned to the right edge in edit mode: zoom,
 * rotate, and the top/side view toggle. These drive the shared CameraControls
 * instance (store `controlsEl`) the same way the old top-bar zoom buttons did.
 */
export function CanvasControls() {
  const { isEditMode, viewMode, editViewMode, toggleEditViewMode, controlsEl, canvasTool, setCanvasTool } = useStore(useShallow((s) => ({
    isEditMode: s.isEditMode,
    viewMode: s.viewMode,
    editViewMode: s.editViewMode,
    toggleEditViewMode: s.toggleEditViewMode,
    controlsEl: s.controlsEl,
    canvasTool: s.canvasTool,
    setCanvasTool: s.setCanvasTool,
  })));

  const isPanning = canvasTool === 'pan';

  // Line view keeps free scroll/orbit, so zoom + rotate buttons only apply to 3D.
  const isLineView = viewMode === 'line';
  const baseDistance = editViewMode === 'top' ? CAMERA_EDIT_HEIGHT : CAMERA_EDIT_SIDE_DISTANCE;
  const [zoomDistance, setZoomDistance] = useState(baseDistance);

  // Re-sync whenever CameraController resets the camera (view or mode change).
  useEffect(() => {
    setZoomDistance(baseDistance);
  }, [editViewMode, isEditMode, baseDistance]);

  function handleZoomIn() {
    const next = Math.max(CAMERA_MIN_DISTANCE, zoomDistance - CAMERA_EDIT_ZOOM_STEP);
    setZoomDistance(next);
    controlsEl?.dollyTo(next, true);
  }

  function handleZoomOut() {
    const next = Math.min(baseDistance, zoomDistance + CAMERA_EDIT_ZOOM_STEP);
    setZoomDistance(next);
    if (next >= baseDistance) {
      // Fully zoomed out — reset to the initial edit camera position so any
      // panning or rotation done while zoomed in is also cleared.
      const [cx, cy, cz] = editViewMode === 'top'
        ? [0, CAMERA_EDIT_HEIGHT, 0] as const
        : CAMERA_EDIT_SIDE_POSITION;
      controlsEl?.setLookAt(cx, cy, cz, 0, 0, 0, true);
    } else {
      controlsEl?.dollyTo(next, true);
    }
  }

  // Keyboard shortcuts mirroring each button: V toggles view (works in both
  // views); +/- zoom, [ ] rotate, H pan are 3D-only (like the buttons).
  useEffect(() => {
    if (!isEditMode) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return; // leave mod-combos to the toolbar

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        toggleEditViewMode();
        return;
      }
      if (isLineView) return; // remaining shortcuts are 3D-only

      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
        case "_":
          e.preventDefault();
          handleZoomOut();
          break;
        case "[":
          e.preventDefault();
          controlsEl?.rotate(-ROTATE_STEP, 0, true);
          break;
        case "]":
          e.preventDefault();
          controlsEl?.rotate(ROTATE_STEP, 0, true);
          break;
        case "h":
        case "H":
          e.preventDefault();
          setCanvasTool(canvasTool === 'pan' ? 'select' : 'pan');
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditMode, isLineView, canvasTool, zoomDistance, baseDistance, controlsEl, toggleEditViewMode, setCanvasTool]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditMode) return null;

  return (
    <div>
    {!isLineView && (
      <>
      <SectionHeading className="text-[11px] mb-[2px] text-color-base/60">Canvas Controls</SectionHeading>
        <div className="pointer-events-auto flex items-center bg-white shadow-sm rounded-[2px] divide-x divide-default rounded-[2px] shadow-sm">
          <Tooltip content="Zoom in" placement="left">
            <EditBtn onClick={handleZoomIn} disabled={zoomDistance <= CAMERA_MIN_DISTANCE} label="Zoom in">
              <ZoomIn size={22} />
            </EditBtn>
          </Tooltip>
          <Tooltip content="Zoom out" placement="left">
            <EditBtn onClick={handleZoomOut} disabled={zoomDistance >= baseDistance} label="Zoom out">
              <ZoomOut size={22} />
            </EditBtn>
          </Tooltip>
          <Tooltip content="Rotate left" placement="left">
            <EditBtn onClick={() => controlsEl?.rotate(-ROTATE_STEP, 0, true)} label="Rotate left">
              <RotateCcw size={22} />
            </EditBtn>
          </Tooltip>
          <Tooltip content="Rotate right" placement="left">
            <EditBtn onClick={() => controlsEl?.rotate(ROTATE_STEP, 0, true)} label="Rotate right">
              <RotateCw size={22} />
            </EditBtn>
          </Tooltip>
          <Tooltip content={isPanning ? "Done panning" : "Pan the canvas"} placement="left">
            <EditBtn
              onClick={() => setCanvasTool(isPanning ? 'select' : 'pan')}
              label={isPanning ? "Stop panning" : "Pan the canvas"}
              className={isPanning ? "bg-navy hover:bg-navy/80" : ""}
            >
              <Hand size={22} className={isPanning ? "text-white" : ""} />
            </EditBtn>
          </Tooltip>
        <Tooltip content={editViewMode === 'top' ? 'Switch to side view' : 'Switch to top view'} placement="left">
          <EditBtn
            onClick={toggleEditViewMode}
            label={editViewMode === 'top' ? 'Switch to side view' : 'Switch to top view'}
          >
            <SwitchCamera size={22} />
          </EditBtn>
        </Tooltip>
      </div>
      </>
    )}
    </div>
  );
}