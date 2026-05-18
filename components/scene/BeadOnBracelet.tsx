"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from 'three';
import { useThree, ThreeEvent } from "@react-three/fiber";
import type { PlacedBead } from "@/types";
import { getBeadTransform } from "@/lib/bead-layout";
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
  const cloned = useMemo(() => {
    const clone = cloneShared(scene);
    // Center the mesh at origin first
    const box = new Box3().setFromObject(clone);
    const center = new Vector3();
    box.getCenter(center);
    clone.position.sub(center);

    // Fix orientation — charm is lying on its side, rotate 90° around X
    clone.rotation.x = Math.PI / 2;
    clone.rotation.z = Math.PI / 1.8;

    return clone;
  }, [scene]);
  const { gl } = useThree();

  const {
    selectBead,
    selectedBead,
    editSelectedBead,
    setEditSelectedBead,
    beads,
    braceletSize,
    isEditMode,
  } = useStore((s) => ({
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
    editSelectedBead: s.editSelectedBead,
    setEditSelectedBead: s.setEditSelectedBead,
    beads: s.beads,
    braceletSize: s.braceletSize,
    isEditMode: s.isEditMode,
  }));

  const isCharm = bead.product.beadCategory === "charm";
  const isSelected = isEditMode
    ? editSelectedBead?.instanceId === bead.instanceId
    : selectedBead?.instanceId === bead.instanceId;

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const { position, outerRotation, innerRotation } = getBeadTransform(slotIndex, beads, radius);

  // Charms: hang below cord in world Y, beads: sit on cord
    const hangOffset = isCharm ? (bead.product.hangOffset ?? -0.009) : 0;
    const depthOffset = isCharm ? (bead.product.depthOffset ?? -0.0005) : 0; 

    const liftedPosition: [number, number, number] = [
      position[0],
      isDragged ? position[1] + 0.002 : position[1] + hangOffset,
      position[2] + depthOffset,
    ];

  // Charms need a 90° tilt so the bail points up to the cord
  const charmInnerRotation: [number, number, number] = [
    innerRotation[0] + Math.PI / 2,
    innerRotation[1],
    innerRotation[2],
  ];
  const finalInnerRotation: [number, number, number] = isCharm
  ? [0, 0, 0]   // charm is already oriented correctly once centered
  : innerRotation;

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
      <group rotation={finalInnerRotation} dispose={null}>
        <primitive object={cloned} />

        {/* Hit area */}
        {bead.product.diameter !== undefined && (
          <mesh visible={false}>
            <sphereGeometry args={[bead.product.diameter * 0.9, 8, 8]} />
          </mesh>
        )}

        {/* Selection ring — flat (XZ plane) for charms, vertical for beads */}
        {isSelected && bead.product.diameter !== undefined && (
          <mesh rotation={isCharm ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
            <torusGeometry args={[bead.product.diameter * 0.65, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#c8a97e" />
          </mesh>
        )}

        {/* Drag target ring */}
        {isDragTarget && bead.product.diameter !== undefined && (
          <mesh rotation={isCharm ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
            <torusGeometry args={[bead.product.diameter * 0.65, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        )}
      </group>
    </group>
  );
}