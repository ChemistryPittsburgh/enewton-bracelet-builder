"use client";

import { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import type { PlacedBead } from "@/types";
import {
  getBeadAngle,
  getBeadPosition,
  getBeadOuterRotationY,
  BEAD_INNER_TILT_X,
} from "@/lib/bead-layout";
import { useStore } from "@/lib/store";

interface BeadOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
}

export function BeadOnBracelet({ bead, slotIndex }: BeadOnBraceletProps) {
  const { scene } = useGLTF(bead.product.glbPath);
  const cloned = useRef(scene.clone(true)).current;
  const { selectBead, selectedBead } = useStore((s) => ({
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
  }));

  const isSelected = selectedBead?.instanceId === bead.instanceId;
  const angle = getBeadAngle(slotIndex);
  const position = getBeadPosition(angle);
  const outerRotY = getBeadOuterRotationY(angle);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    selectBead(bead);
  }

  return (
    /*
     * TWO nested groups for correct bead orientation.
     * See bead-layout.ts getBeadOuterRotationY for the full explanation.
     */
    <group position={position} rotation={[0, outerRotY, 0]} onClick={handleClick}>
      <group rotation={[BEAD_INNER_TILT_X, 0, 0]} dispose={null}>
        <primitive object={cloned} />
        {/* Invisible slightly-larger hit area so small beads are easy to tap */}
        <mesh visible={false}>
          <sphereGeometry args={[bead.product.diameter * 0.9, 8, 8]} />
        </mesh>
        {/* Selection highlight ring */}
        {isSelected && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[bead.product.diameter * 0.65, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#c8a97e" />
          </mesh>
        )}
      </group>
    </group>
  );
}