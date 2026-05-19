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
  const { cloned, autoHangOffset } = useMemo(() => {
    const clone = cloneShared(scene);
    const box = new Box3().setFromObject(clone);
    const center = new Vector3();
    box.getCenter(center);
    clone.position.sub(center);

    const halfHeight = (box.max.y - box.min.y) / 1.5;

    return { cloned: clone, autoHangOffset: -halfHeight };
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
  const hangOffset = isCharm
    ? (bead.product.hangOffset ?? autoHangOffset)
    : 0;
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
      {/* Selection Ring */}
      {isSelected && bead.product.diameter !== undefined && (
        <mesh
          rotation={isCharm ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
          position={isCharm ? [0, -0.0015, 0] : [0, 0, 0]}
        >
          <torusGeometry args={[bead.product.diameter * 0.58, 0.0003, 8, 32]} />
          <meshBasicMaterial color="#c8a97e" />
        </mesh>
      )}

      {/* Drag Target */}
      {isDragTarget && bead.product.diameter !== undefined && (
        <mesh
          rotation={isCharm ? [0, Math.PI / 2, 0] : [Math.PI / 2, 0, 0]}
          position={isCharm ? [0, -bead.product.diameter * 0.4, 0] : [0, 0, 0]}
        >
          <torusGeometry args={[bead.product.diameter * 0.65, 0.0002, 8, 32]} />
          <meshBasicMaterial color="#93c5fd" />
        </mesh>
      )}

      {/* Hit Area */}
      <group rotation={finalInnerRotation} dispose={null}>
        {isCharm ? (
          <group rotation={[Math.PI / 2, 0, Math.PI / 1.8]}>
            <primitive object={cloned} />
          </group>
        ) : (
          <primitive object={cloned} />
        )}

        {/* Hit area — now in centered pre-rotation space, Y is predictable */}
        {bead.product.diameter !== undefined && (
          <mesh visible={true} position={isCharm ? [0, -bead.product.diameter * 0.1, 0] : [0, 0, 0]}>
            <sphereGeometry args={isCharm ? [bead.product.diameter * 0.65, 8, 8] : [bead.product.diameter * 0.55, 8, 8]} />
            <meshBasicMaterial color="#93c5fd" transparent={true} opacity={0.5} />
          </mesh>
        )}
      </group>
    </group>
  );
}