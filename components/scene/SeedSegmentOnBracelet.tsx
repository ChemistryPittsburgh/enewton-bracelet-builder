"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ThreeEvent } from "@react-three/fiber";
import type { PlacedBead } from "@/types";
import {
  getBeadAngle,
  getBeadPosition,
  getBeadTransformLine,
} from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import {
  BRACELET_SIZE_RADIUS,
  HIGHLIGHT_SELECT_COLOR,
  EDIT_MODE_HIGHLIGHT_SELECT_COLOR,
} from "@/lib/constants";
import {
  generateSeedBeads,
} from "@/lib/seed-bead-utils";

/** Hex colours that should render with metallic material properties. */
const METALLIC_HEXES = new Set([
  "#D4AF37", "#FFD700", "#C5A44E", "#B8860B", // golds
  "#C0C0C0", "#A8A9AD", "#808080",             // silvers
]);

/** Rotation to orient the cylinder axis along the cord tangent (local Z). */
const SEED_BEAD_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0];

interface SeedSegmentOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
  isDragged?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (index: number) => void;
  isLocked?: boolean;
}

/**
 * Renders a seed bead segment as a run of tiny procedural spheres.
 * No GLB is loaded — all geometry is generated from the SeedSegmentConfig.
 *
 * The segment occupies one slot in the bead layout (like a spacer), but
 * visually renders many small beads spread along its arc allocation.
 */
export function SeedSegmentOnBracelet({
  bead,
  slotIndex,
  isDragged = false,
  isDragTarget = false,
  onDragStart,
  isLocked = false,
}: SeedSegmentOnBraceletProps) {
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
  } = useStore((s) => ({
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
    editSelectedIds: s.editSelectedIds,
    toggleEditBead: s.toggleEditBead,
    clearSelectedBead: s.clearSelectedBead,
    clearEditSelection: s.clearEditSelection,
    beads: s.beads,
    braceletSize: s.braceletSize,
    isEditMode: s.isEditMode,
    viewMode: s.viewMode,
  }));

  const isSelected = isEditMode
    ? editSelectedIds.includes(bead.instanceId)
    : selectedBead?.instanceId === bead.instanceId;

  const highlightColor = isEditMode
    ? EDIT_MODE_HIGHLIGHT_SELECT_COLOR
    : HIGHLIGHT_SELECT_COLOR;

  const radius = BRACELET_SIZE_RADIUS[braceletSize];

  // Generate the individual tiny beads from the segment config
  const config = bead.seedConfig;
  const generatedBeads = useMemo(() => {
    if (!config) return [];
    return generateSeedBeads(config);
  }, [config]);

  // ── 3D view: calculate per-bead positions along the arc ──────────────────
  const seedBead3DData = useMemo(() => {
    if (!config || generatedBeads.length === 0) return [];

    if (viewMode === "line") {
      // In line view, spread beads along the X axis
      const lineTransform = getBeadTransformLine(slotIndex, beads);
      const segDiameter = bead.product.diameter;
      const halfSeg = segDiameter / 2;

      return generatedBeads.map((sb) => {
        const localX = sb.arcOffset - halfSeg;
        return {
          position: [
            lineTransform.position[0] + localX,
            lineTransform.position[1],
            lineTransform.position[2],
          ] as [number, number, number],
          outerRotation: lineTransform.outerRotation,
          diameter: sb.diameter,
          color: sb.color,
        };
      });
    }

    // 3D circular view: place each tiny bead at its own angle on the arc
    const centerAngle = getBeadAngle(slotIndex, beads, radius);
    const segArcM = bead.product.diameter; // total arc in metres
    const halfArcRad = segArcM / 2 / radius;
    const startAngle = centerAngle - halfArcRad;

    return generatedBeads.map((sb) => {
      const beadAngle = startAngle + sb.arcOffset / radius;
      const pos = getBeadPosition(beadAngle, radius);
      const outerRotY = -beadAngle;
      return {
        position: pos,
        outerRotation: [0, outerRotY, 0] as [number, number, number],
        diameter: sb.diameter,
        color: sb.color,
      };
    });
  }, [config, generatedBeads, slotIndex, beads, radius, viewMode, bead.product.diameter]);

  // ── Interaction handlers ─────────────────────────────────────────────────

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

    function onMove(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
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

  if (!config || seedBead3DData.length === 0) return null;

  // Cross-section radius for hit area and selection — matches the visual
  // height of the tiny seed beads (~3mm, same as spacer cross-section).
  const crossSection = 0.003;
  // Total arc consumed by this segment (metres)
  const segArcM = bead.product.diameter;

  // Rotate cylinder from default Y-axis to lie along the cord tangent
  const cylRotation: [number, number, number] = [Math.PI / 2, 0, 0];

  // ── Hit area chunks — many small cylinders that follow the arc ──────────
  // One chunk every ~8mm so they approximate the curve even on long segments.
  const HIT_CHUNK_MM = 8;
  const hitChunks = useMemo(() => {
    if (viewMode === "line") {
      // Line view: one straight cylinder is fine — no curvature
      const t = getBeadTransformLine(slotIndex, beads);
      return [{
        position: t.position,
        outerRotation: t.outerRotation,
        innerRotation: t.innerRotation,
        length: segArcM,
      }];
    }

    const centerAngle = getBeadAngle(slotIndex, beads, radius);
    const halfArcRad = segArcM / 2 / radius;
    const startAngle = centerAngle - halfArcRad;
    const endAngle = centerAngle + halfArcRad;

    const chunkCount = Math.max(1, Math.ceil((segArcM * 1000) / HIT_CHUNK_MM));
    const chunkArcM = segArcM / chunkCount;
    const chunkAngleSpan = (endAngle - startAngle) / chunkCount;

    const chunks: {
      position: [number, number, number];
      outerRotation: [number, number, number];
      innerRotation: [number, number, number];
      length: number;
    }[] = [];

    for (let i = 0; i < chunkCount; i++) {
      const chunkCenterAngle = startAngle + (i + 0.5) * chunkAngleSpan;
      chunks.push({
        position: getBeadPosition(chunkCenterAngle, radius),
        outerRotation: [0, -chunkCenterAngle, 0],
        innerRotation: [0, 0, 0],
        length: chunkArcM,
      });
    }
    return chunks;
  }, [viewMode, slotIndex, beads, radius, segArcM]);

  // Center transform for selection ring (stays at midpoint)
  const centerTransform =
    viewMode === "line"
      ? getBeadTransformLine(slotIndex, beads)
      : (() => {
          const a = getBeadAngle(slotIndex, beads, radius);
          return {
            position: getBeadPosition(a, radius),
            outerRotation: [0, -a, 0] as [number, number, number],
            innerRotation: [0, 0, 0] as [number, number, number],
          };
        })();

  return (
    <group
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Individual seed bead cylinders */}
      {seedBead3DData.map((sb, i) => {
        const r = sb.diameter / 2;
        const isMetallic = METALLIC_HEXES.has(sb.color);

        return (
          <group
            key={i}
            position={[
              sb.position[0],
              sb.position[1] + (isDragged ? 0.003 : 0),
              sb.position[2],
            ]}
            rotation={sb.outerRotation}
          >
            <mesh rotation={SEED_BEAD_ROTATION}>
              <cylinderGeometry args={[r, r, sb.diameter, 16]} />
              {isMetallic ? (
                <meshStandardMaterial
                  color={sb.color}
                  metalness={1}
                  roughness={0.12}
                  envMapIntensity={0.3}
                />
              ) : (
                <meshStandardMaterial
                  color={sb.color}
                  metalness={0.05}
                  roughness={0.45}
                  envMapIntensity={0.2}
                />
              )}
            </mesh>
          </group>
        );
      })}

      {/* Hit area — arc-following cylinders, one every ~8mm */}
      {hitChunks.map((chunk, i) => (
        <group
          key={`hit-${i}`}
          position={[
            chunk.position[0],
            chunk.position[1] + (isDragged ? 0.003 : 0),
            chunk.position[2],
          ]}
          rotation={chunk.outerRotation}
        >
          <group rotation={chunk.innerRotation}>
            <mesh visible={false} rotation={cylRotation}>
              <cylinderGeometry args={[crossSection, crossSection, chunk.length, 8]} />
              <meshBasicMaterial />
            </mesh>
          </group>
        </group>
      ))}

      {/* Selection ring — at segment midpoint */}
      {isSelected && (
        <group
          position={[
            centerTransform.position[0],
            centerTransform.position[1] + (isDragged ? 0.003 : 0),
            centerTransform.position[2],
          ]}
          rotation={centerTransform.outerRotation}
        >
          <mesh>
            <torusGeometry args={[crossSection * 1.15, 0.0002, 8, 32]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Drag target ring — at segment midpoint */}
      {isDragTarget && (
        <group
          position={centerTransform.position}
          rotation={centerTransform.outerRotation}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[crossSection * 1.3, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        </group>
      )}
    </group>
  );
}