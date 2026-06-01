"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { ThreeEvent } from "@react-three/fiber";
import { Box3, Group, Vector3 } from "three";
import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine, CORD_RADIUS } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, CHARM_ROTATION } from "@/lib/constants";
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
  const { scene } = useGLTF(bead.product.glb_path);

  const { cloned, autoHangOffset } = useMemo(() => {
    const clone = cloneShared(scene);

    // Center the clone so its bounding-box midpoint sits at the wrapper origin;
    // CHARM_ROTATION then rotates about that centre for autoHangOffset measurement.
    const rawBox = new Box3().setFromObject(clone);
    const center = new Vector3();
    rawBox.getCenter(center);
    clone.position.sub(center);

    let autoHangOffset = 0;
    if (bead.product.bead_category === "charm") {
      const wrapper = new Group();
      wrapper.add(clone);
      wrapper.rotation.set(...CHARM_ROTATION);
      wrapper.updateMatrixWorld(true);
      // Raise the bounding-box top by one cord radius so the cord centre
      // threads through the bail opening rather than pressing on the bail edge.
      const rotBox = new Box3().setFromObject(wrapper);
      const bailWireRadius = (bead.product.bail_width_mm ?? 0.8) / 1000;
      autoHangOffset = -rotBox.max.y + CORD_RADIUS + bailWireRadius;
      wrapper.remove(clone);
    }

    return { cloned: clone, autoHangOffset };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, bead.product.bead_category, CHARM_ROTATION[0], CHARM_ROTATION[1], CHARM_ROTATION[2]]);

  const { gl } = useThree();
  const { selectBead, selectedBead, editSelectedBead, setEditSelectedBead, beads, braceletSize, isEditMode, viewMode, selectAllActive } = useStore((s) => ({
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
    editSelectedBead: s.editSelectedBead,
    setEditSelectedBead: s.setEditSelectedBead,
    beads: s.beads,
    braceletSize: s.braceletSize,
    isEditMode: s.isEditMode,
    selectAllActive: s.selectAllActive,
    viewMode: s.viewMode,
  }));

  const isCharm = bead.product.bead_category === "charm";

  const vizRadius = isCharm
    ? (bead.product.body_width_mm ?? bead.product.diameter * 1000) / 2 / 1000
    : bead.product.diameter / 2;

  const hangOffset = isCharm ? autoHangOffset : 0;
  const depthOffset = isCharm ? (bead.product.depth_offset ?? -0.0005) : 0;

  const isSelected = isEditMode
    ? editSelectedBead?.instanceId === bead.instanceId
    : selectedBead?.instanceId === bead.instanceId
    || (selectAllActive && selectedBead?.product.id === bead.product.id);

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const { position, outerRotation, innerRotation } = viewMode === 'line'
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, radius);

  const liftedPosition: [number, number, number] = [
    position[0],
    position[1] + hangOffset + (isDragged ? 0.003 : 0),
    position[2] + depthOffset,
  ];

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
        {isCharm ? (
          <group rotation={CHARM_ROTATION}>
            <primitive object={cloned} />
          </group>
        ) : (
          <primitive object={cloned} />
        )}

        {/* Hit area — invisible but catches pointer events */}
        <mesh visible={false} position={isCharm ? [0, -vizRadius, 0] : [0, 0, 0]}>
          <sphereGeometry args={[vizRadius * 1.1, 8, 8]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.5} />
        </mesh>

        {/* Selection highlight ring */}
        {isSelected && vizRadius > 0 && (
          <mesh rotation={isCharm ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
            <torusGeometry args={[vizRadius * 1.15, 0.0003, 8, 32]} />
            <meshBasicMaterial color="#c8a97e" />
          </mesh>
        )}

        {/* Drag target indicator ring — edit mode only */}
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
