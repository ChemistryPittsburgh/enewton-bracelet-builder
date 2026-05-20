"use client";

import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { PlacedBead } from "@/types";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { getBeadAngle, getBeadPosition } from "@/lib/bead-layout";
import type { ThreeEvent } from "@react-three/fiber";

interface FallbackProps {
  bead: PlacedBead;
  slotIndex: number;
}

function BeadFallback({ bead, slotIndex }: FallbackProps) {
  const { removeBead, addBeadLoadError, beads, braceletSize } = useStore((s) => ({
    removeBead: s.removeBead,
    addBeadLoadError: s.addBeadLoadError,
    beads: s.beads,
    braceletSize: s.braceletSize,
  }));

  const filename = bead.product.glb_path?.split("/").pop() ?? bead.product.glb_path ?? bead.product.name;

  useEffect(() => {
    addBeadLoadError(bead.instanceId, bead.product.name, filename);
  }, [bead.instanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const angle = getBeadAngle(slotIndex, beads, radius);
  const position = getBeadPosition(angle, radius);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    removeBead(bead.instanceId);
  }

  return (
    <group position={position} onClick={handleClick}>
      <mesh>
        <sphereGeometry args={[bead.product.diameter * 0.5, 8, 8]} />
        <meshBasicMaterial color="#f97316" wireframe />
      </mesh>
    </group>
  );
}

interface Props {
  bead: PlacedBead;
  slotIndex: number;
  children: React.ReactNode;
}

export function BeadErrorBoundary({ bead, slotIndex, children }: Props) {
  return (
    <ErrorBoundary FallbackComponent={() => <BeadFallback bead={bead} slotIndex={slotIndex} />}>
      {children}
    </ErrorBoundary>
  );
}
