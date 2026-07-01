"use client";

import { useState, useMemo, useEffect } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import {
  buildEffectiveGroups,
  getGapFillAwareSpacingBonuses,
  getBeadAngles,
  selfHalf,
} from "@/lib/bead-layout";

const GAP_HOVER_COLOR  = "#5eb88a";
const GAP_ACTIVE_COLOR = "#2563eb";
const HIT_TUBE_RADIUS  = 0.004;
const VIS_TUBE_RADIUS  = 0.0008;

const TWO_PI = Math.PI * 2;

function GapMesh({
  gapIndex,
  angleStart,
  angleEnd,
  gapArcM,
  radius,
  isActive,
}: {
  gapIndex: number;
  angleStart: number;
  angleEnd: number;
  gapArcM: number;
  radius: number;
  isActive: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const setSelectedGapIndex = useStore((s) => s.setSelectedGapIndex);

  // Guard before geometry allocation so gaps too small to render never
  // allocate (and leak) TubeGeometry objects.
  const arcPoints = useMemo(() => {
    if (gapArcM <= 0.0005) return null;
    const segments = Math.max(8, Math.ceil(Math.abs(angleEnd - angleStart) * 20));
    const pts: Vector3[] = [];
    for (let j = 0; j <= segments; j++) {
      const a = angleStart + (j / segments) * (angleEnd - angleStart);
      pts.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return { pts, segments };
  }, [angleStart, angleEnd, radius, gapArcM]);

  // Imperatively-created geometries are not tracked by R3F's reconciler, so
  // they won't be auto-disposed. Dispose when deps change or on unmount.
  const geometries = useMemo(() => {
    if (!arcPoints) return null;
    const curve = new CatmullRomCurve3(arcPoints.pts);
    return {
      hit: new TubeGeometry(curve, arcPoints.segments, HIT_TUBE_RADIUS, 4, false),
      vis: new TubeGeometry(curve, arcPoints.segments, VIS_TUBE_RADIUS, 8, false),
    };
  }, [arcPoints]);

  useEffect(() => {
    return () => {
      geometries?.hit.dispose();
      geometries?.vis.dispose();
    };
  }, [geometries]);

  if (!geometries) return null;

  const showHighlight = hovered || isActive;
  const highlightColor = isActive ? GAP_ACTIVE_COLOR : GAP_HOVER_COLOR;

  return (
    <>
      <mesh
        visible={false}
        geometry={geometries.hit}
        onClick={(e) => { e.stopPropagation(); setSelectedGapIndex(gapIndex); }}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = ""; }}
      >
        <meshBasicMaterial />
      </mesh>

      {showHighlight && (
        <mesh geometry={geometries.vis}>
          <meshBasicMaterial color={highlightColor} transparent opacity={0.45} />
        </mesh>
      )}
    </>
  );
}

export function GapHitMeshes() {
  const {
    beads,
    braceletSize,
    viewMode,
    isEvenlySpaced,
    isEditMode,
    groups,
    editSelectedIds,
    selectedGapIndex,
    spacersHiddenForCapture,
  } = useStore(
    useShallow((s) => ({
      beads:                   s.beads,
      braceletSize:            s.braceletSize,
      viewMode:                s.viewMode,
      isEvenlySpaced:          s.isEvenlySpaced,
      isEditMode:              s.isEditMode,
      groups:                  s.groups,
      editSelectedIds:         s.editSelectedIds,
      selectedGapIndex:        s.selectedGapIndex,
      spacersHiddenForCapture: s.spacersHiddenForCapture,
    })),
  );

  const setSelectedGapIndex = useStore((s) => s.setSelectedGapIndex);

  const shouldShow = isEditMode && isEvenlySpaced && viewMode === "3D" && beads.length >= 2;

  // Clear stale gap selection when the gap UI is hidden — prevents addBead from
  // splicing at a stale index after e.g. the user toggles off evenly-spaced mode.
  // Keyed on shouldShow (not the capture flag below) so a thumbnail capture never
  // wipes out the user's actual gap selection.
  useEffect(() => {
    if (!shouldShow && selectedGapIndex !== null) {
      setSelectedGapIndex(null);
    }
  }, [shouldShow, selectedGapIndex, setSelectedGapIndex]);

  // Hidden during thumbnail capture (spacersHiddenForCapture) along with spacer
  // wireframes and the edit-mode Grid — none of these edit-only helpers should
  // ever be baked into a saved thumbnail.
  if (!shouldShow || spacersHiddenForCapture) return null;

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const effectiveGroups = buildEffectiveGroups(groups, editSelectedIds);
  const extraSpacingPerGap = getGapFillAwareSpacingBonuses(beads, effectiveGroups, radius);

  // O(n) single pass — avoids calling O(n) getBeadAngle n times
  const angles = getBeadAngles(beads, radius, extraSpacingPerGap);
  const n = beads.length;

  return (
    <>
      {beads.map((bead, i) => {
        const nextIdx = i < n - 1 ? i + 1 : 0;
        // Trim tube endpoints to bead surfaces so the hit volume doesn't
        // overlap bead geometry and intercept clicks intended for beads.
        const leftHalf  = selfHalf(bead) / radius;
        const rightHalf = selfHalf(beads[nextIdx]) / radius;
        const angleStart = angles[i] + leftHalf;
        const angleEnd   = (i < n - 1 ? angles[i + 1] : angles[0] + TWO_PI) - rightHalf;
        const gapArcM = Math.max(0, (angleEnd - angleStart) * radius);
        return (
          <GapMesh
            key={bead.instanceId + "-gap"}
            gapIndex={i}
            angleStart={angleStart}
            angleEnd={angleEnd}
            gapArcM={gapArcM}
            radius={radius}
            isActive={selectedGapIndex === i}
          />
        );
      })}
    </>
  );
}
