"use client";

import { useMemo } from "react";
import { CatmullRomCurve3, Vector3, TubeGeometry } from "three";
import { useThree } from "@react-three/fiber";
import { ThreeEvent } from "@react-three/fiber";
import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import {
  BRACELET_SIZE_RADIUS,
  HIGHLIGHT_SELECT_COLOR,
  EDIT_MODE_HIGHLIGHT_SELECT_COLOR,
} from "@/lib/constants";

const BAR_COLORS: Record<string, string> = {
  gold:        "#D4A843",
  gold_filled: "#C8A227",
  sterling:    "#B0B8BC",
};
const BAR_DEFAULT_COLOR = "#D4A843";

interface BarOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
  isDragged?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (index: number) => void;
  isLocked?: boolean;
}

export function BarOnBracelet({
  bead,
  slotIndex,
  isDragged = false,
  isDragTarget = false,
  onDragStart,
  isLocked = false,
}: BarOnBraceletProps) {
  const { gl } = useThree();
  const {
    selectBead,
    selectedBead,
    editSelectedIds,
    toggleEditBead,
    clearSelectedBead,
    clearEditSelection,
    beads,
    braceletSize,
    isEditMode,
    viewMode,
    selectAllActive,
  } = useStore((s) => ({
    selectBead:         s.selectBead,
    selectedBead:       s.selectedBead,
    editSelectedIds:    s.editSelectedIds,
    toggleEditBead:     s.toggleEditBead,
    clearSelectedBead:  s.clearSelectedBead,
    clearEditSelection: s.clearEditSelection,
    beads:              s.beads,
    braceletSize:       s.braceletSize,
    isEditMode:         s.isEditMode,
    viewMode:           s.viewMode,
    selectAllActive:    s.selectAllActive,
  }));

  const braceletRadius = BRACELET_SIZE_RADIUS[braceletSize];
  const { position, outerRotation, innerRotation } = viewMode === "line"
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, braceletRadius);

  // Arc span in metres (size_mm drives the visible length)
  const arcLength  = (bead.product.size_mm ?? 10) / 1000;
  // Half-angle the bar subtends on the bracelet ring
  const halfAngle  = arcLength / (2 * braceletRadius);
  // Tube cross-section radius
  const tubeRadius = bead.product.diameter / 2;

  // Build tube geometry that follows the bracelet arc in the bar's local XZ plane.
  // After outerRotation: local X = radial, local Z = tangential.
  // Arc path: (R*(cos φ − 1), 0, R*sin φ) for φ ∈ [−halfAngle, +halfAngle].
  const { tubeGeom, endA, endB } = useMemo(() => {
    const nPts = 64;
    const pts: Vector3[] = [];
    for (let i = 0; i <= nPts; i++) {
      const phi = -halfAngle + (i / nPts) * 2 * halfAngle;
      pts.push(new Vector3(
        braceletRadius * (Math.cos(phi) - 1),
        0,
        braceletRadius * Math.sin(phi),
      ));
    }
    const curve = new CatmullRomCurve3(pts, false, "catmullrom", 0);
    const geom  = new TubeGeometry(curve, 64, tubeRadius, 12, false);
    return { tubeGeom: geom, endA: pts[0].clone(), endB: pts[nPts].clone() };
  }, [halfAngle, braceletRadius, tubeRadius]);

  // Half the arc length as the visual radius for hit detection and selection ring
  const vizRadius = arcLength / 2;

  const isSelected = isEditMode
    ? editSelectedIds.includes(bead.instanceId)
    : selectedBead?.instanceId === bead.instanceId
    || (selectAllActive && selectedBead?.product.id === bead.product.id);

  const highlightColor = isEditMode ? EDIT_MODE_HIGHLIGHT_SELECT_COLOR : HIGHLIGHT_SELECT_COLOR;
  const matColor = BAR_COLORS[bead.product.material ?? ""] ?? BAR_DEFAULT_COLOR;

  const liftedPosition: [number, number, number] = [
    position[0],
    position[1] + (isDragged ? 0.003 : 0),
    position[2],
  ];

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (isLocked) return;
    if (isEditMode) {
      const ne = e.nativeEvent;
      if (ne && (ne.metaKey || ne.ctrlKey)) {
        selectBead(bead);
        toggleEditBead(bead.instanceId);
      } else {
        clearSelectedBead();
        toggleEditBead(bead.instanceId);
      }
    } else {
      selectBead(bead);
    }
  }

  const DRAG_THRESHOLD = 4;

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    if (!isEditMode) return;
    e.stopPropagation();
    const startX = e.nativeEvent.clientX;
    const startY = e.nativeEvent.clientY;
    function onMove(ev: PointerEvent) {
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > DRAG_THRESHOLD) {
        clearEditSelection();
        clearSelectedBead();
        gl.domElement.style.cursor = "grabbing";
        onDragStart?.(slotIndex);
        cleanup();
      }
    }
    function onUp() { cleanup(); }
    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handlePointerEnter() {
    if (!isEditMode) return;
    gl.domElement.style.cursor = "grab";
  }

  function handlePointerLeave() {
    if (!isEditMode) return;
    gl.domElement.style.cursor = "";
  }

  return (
    <group
      position={liftedPosition}
      rotation={outerRotation}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <group rotation={innerRotation}>
        {/* Curved tube following the bracelet arc */}
        <mesh geometry={tubeGeom}>
          <meshStandardMaterial
            color={matColor}
            metalness={1}
            roughness={0.2}
            envMapIntensity={0.3}
          />
        </mesh>

        {/* Spherical end caps */}
        <mesh position={endA}>
          <sphereGeometry args={[tubeRadius, 12, 12]} />
          <meshStandardMaterial color={matColor} metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={endB}>
          <sphereGeometry args={[tubeRadius, 12, 12]} />
          <meshStandardMaterial color={matColor} metalness={1} roughness={0.2} />
        </mesh>

        {/* Invisible hit area */}
        <mesh visible={false}>
          <sphereGeometry args={[vizRadius * 1.2, 8, 8]} />
          <meshBasicMaterial />
        </mesh>

        {/* Selection ring lying flat in the bracelet plane */}
        {isSelected && vizRadius > 0 && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[vizRadius * 1.15, 0.0003, 8, 32]} />
            <meshBasicMaterial color={highlightColor} transparent opacity={0.7} />
          </mesh>
        )}

        {/* Drag-target ring */}
        {isDragTarget && vizRadius > 0 && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[vizRadius * 1.3, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        )}
      </group>
    </group>
  );
}
