"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { ThreeEvent } from "@react-three/fiber";
import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { cloneShared } from "@/lib/measure-bead";

interface BeadOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
  isDragged?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (index: number) => void;
}

export function BeadOnBracelet({
  bead,
  slotIndex,
  isDragged = false,
  isDragTarget = false,
  onDragStart,
}: BeadOnBraceletProps) {
  const { scene } = useGLTF(bead.product.glbPath);
  const cloned = useMemo(() => cloneShared(scene), [scene]);
  const { gl } = useThree();
  const { selectBead, selectedBead, editSelectedBead, setEditSelectedBead, beads, braceletSize, isEditMode, viewMode } = useStore((s) => ({
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
    editSelectedBead: s.editSelectedBead,
    setEditSelectedBead: s.setEditSelectedBead,
    beads: s.beads,
    braceletSize: s.braceletSize,
    isEditMode: s.isEditMode,
    viewMode: s.viewMode,
  }));

  const isSelected = isEditMode
    ? editSelectedBead?.instanceId === bead.instanceId
    : selectedBead?.instanceId === bead.instanceId;
  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const { position, outerRotation, innerRotation } = viewMode === 'line'
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, radius);

  const liftedPosition: [number, number, number] = isDragged
    ? [position[0], position[1] + 0.003, position[2]]
    : position;

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (!isEditMode) selectBead(bead);
  }

  function handleDoubleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (!isEditMode) return;
    setEditSelectedBead(bead);
    selectBead(bead);
  }

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    if (!isEditMode) return;
    e.stopPropagation();
    gl.domElement.setPointerCapture(e.pointerId);
    gl.domElement.style.cursor = "grabbing";
    onDragStart?.(slotIndex);
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
      onDoubleClick={handleDoubleClick}
    >
      <group rotation={innerRotation} dispose={null}>
        <primitive object={cloned} />
        {/* Invisible slightly-larger hit area so small beads are easy to tap */}
        {bead.product.diameter !== undefined && (
          <mesh visible={false}>
            <sphereGeometry args={[bead.product.diameter * 0.9, 8, 8]} />
          </mesh>
        )}
        {/* Selection highlight ring */}
        {isSelected && bead.product.diameter !== undefined && (
          <mesh>
            <torusGeometry args={[bead.product.diameter * 0.65, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#c8a97e" />
          </mesh>
        )}
        {/* Drag target indicator ring — edit mode only */}
        {isDragTarget && bead.product.diameter !== undefined && (
          <mesh>
            <torusGeometry args={[bead.product.diameter * 0.65, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        )}
      </group>
    </group>
  );
}
