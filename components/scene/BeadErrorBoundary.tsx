"use client";

import { useEffect, useMemo } from "react";
import { ErrorBoundary, type FallbackProps as EBFallbackProps } from "react-error-boundary";
import type { PlacedBead } from "@/types";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { getBeadAngle, getBeadPosition, getEvenSpacingBonus } from "@/lib/bead-layout";
import type { ThreeEvent } from "@react-three/fiber";

interface FallbackProps {
  bead: PlacedBead;
  slotIndex: number;
}

function BeadFallback({ bead, slotIndex }: FallbackProps) {
  const { removeBead, addBeadLoadError, beads, braceletSize, viewMode, isEvenlySpaced } = useStore(useShallow((s) => ({
    removeBead: s.removeBead,
    addBeadLoadError: s.addBeadLoadError,
    beads: s.beads,
    braceletSize: s.braceletSize,
    viewMode: s.viewMode,
    isEvenlySpaced: s.isEvenlySpaced,
  })));

  const filename = bead.product.glb_path?.split("/").pop() ?? bead.product.glb_path ?? bead.product.name;

  useEffect(() => {
    addBeadLoadError(bead.instanceId, bead.product.name, filename);
  }, [bead.instanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const extraSpacingPerGap = isEvenlySpaced && viewMode === '3D'
    ? getEvenSpacingBonus(beads, radius)
    : 0;
  const angle = getBeadAngle(slotIndex, beads, radius, extraSpacingPerGap);
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
  // Stable component reference — avoids unmount/remount on every parent render.
  // ErrorBoundary compares FallbackComponent by reference; an inline arrow
  // creates a new type each render, forcing React to destroy and recreate the
  // fallback even when nothing changed.
  const Fallback = useMemo(
    () =>
      function BeadFallbackWrapper(_props: EBFallbackProps) {
        return <BeadFallback bead={bead} slotIndex={slotIndex} />;
      },
    [bead, slotIndex],
  );

  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      {children}
    </ErrorBoundary>
  );
}