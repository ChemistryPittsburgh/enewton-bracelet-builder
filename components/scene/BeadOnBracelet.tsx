"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import type { PlacedBead } from "@/types";
import { getBeadTransform } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { cloneShared } from "@/lib/measure-bead";

interface BeadOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
}

export function BeadOnBracelet({ bead, slotIndex }: BeadOnBraceletProps) {
  const { scene } = useGLTF(bead.product.glbPath);
  const cloned = useMemo(() => cloneShared(scene), [scene]);
  const { selectBead, selectedBead, beads, braceletSize } = useStore((s) => ({
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
    beads: s.beads,
    braceletSize: s.braceletSize,
  }));

  const isSelected = selectedBead?.instanceId === bead.instanceId;
  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const { position, outerRotation, innerRotation } = getBeadTransform(slotIndex, beads, radius);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    selectBead(bead);
  }

  return (
    /*
     * TWO nested groups for correct bead orientation.
     * See bead-layout.ts getBeadOuterRotationY for the full explanation.
     */
    <group position={position} rotation={outerRotation} onClick={handleClick}>
      <group rotation={innerRotation} dispose={null}>
        <primitive object={cloned} />
        {/* Invisible slightly-larger hit area so small beads are easy to tap */}
        <mesh visible={false}>
          <sphereGeometry args={[bead.product.diameter * 0.9, 8, 8]} />
        </mesh>
        {/* Selection highlight ring */}
        {isSelected && (
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[bead.product.diameter * 0.65, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#c8a97e" />
          </mesh>
        )}
      </group>
    </group>
  );
}