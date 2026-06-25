"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedBead } from "@/types";
import {
  getBeadAngle,
  getBeadPosition,
  getBeadTransformLine,
} from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import {
  BRACELET_SIZE_RADIUS,
  ROUND_SEED_BEAD_MODEL,
  SEED_BEAD_NATIVE_DIAMETER,
  FINISH_PRESETS,
  DEFAULT_FINISH,
  EDIT_MODE_RING_HOVER,
} from "@/lib/constants";
import { useSceneItemInteraction } from "@/hooks/useSceneItemInteraction";
import {
  generateSeedBeads,
} from "@/lib/seed-bead-utils";

/** Path to the seed bead GLB model. */
const SEED_BEAD_MODEL = "/models/seed-bead.glb";

// Preload both models so they're ready before first render
useGLTF.preload(SEED_BEAD_MODEL);
useGLTF.preload(ROUND_SEED_BEAD_MODEL);

interface SeedSegmentOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
  isDragged?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (index: number) => void;
  isLocked?: boolean;
  /** Extra arc (metres) added between each bead pair for even spacing. */
  extraSpacingPerGap?: number;
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
  extraSpacingPerGap = 0,
}: SeedSegmentOnBraceletProps) {
  const beads        = useStore((s) => s.beads);
  const braceletSize = useStore((s) => s.braceletSize);
  const viewMode     = useStore((s) => s.viewMode);

  const {
    isSelected,
    highlightColor,
    handleClick,
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    showHoverRing,
    isEditMode,
  } = useSceneItemInteraction(bead, slotIndex, { isLocked, onDragStart });

  const radius = BRACELET_SIZE_RADIUS[braceletSize];

  // Load both GLB models — hooks must be called unconditionally
  const { scene: seedGlbScene } = useGLTF(SEED_BEAD_MODEL);
  const { scene: roundGlbScene } = useGLTF(ROUND_SEED_BEAD_MODEL);

  const isRound = bead.seedConfig?.seed_shape === "round";
  const activeGlbScene = isRound ? roundGlbScene : seedGlbScene;

  const { seedGeometry, nativeDiameter, roundMaterial } = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.MeshStandardMaterial | null = null;
    activeGlbScene.traverse((child) => {
      if (!geo && child instanceof THREE.Mesh && child.geometry) {
        geo = child.geometry;
        // Grab the material from the round GLB for native gold appearance
        if (child.material instanceof THREE.MeshStandardMaterial) {
          mat = child.material;
        }
      }
    });
    if (!geo) return { seedGeometry: null, nativeDiameter: SEED_BEAD_NATIVE_DIAMETER, roundMaterial: null };

    const geometry = geo as THREE.BufferGeometry;
    const extractedMat = mat as THREE.MeshStandardMaterial | null;

    // Compute actual diameter from the geometry's own bounding box
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const extentX = bb.max.x - bb.min.x;
    const extentY = bb.max.y - bb.min.y;
    const diam = Math.max(extentX, extentY, bb.max.z - bb.min.z);

    // For round beads: clone the GLB material and apply the appropriate finish
    // preset (gold or silver) — same approach as BeadOnBracelet.
    // Silver needs a color override since both share the gold-toned GLB.
    let finishedMat: THREE.MeshStandardMaterial | null = null;
    if (extractedMat) {
      finishedMat = extractedMat.clone();
      const finishKey = bead.product.material ?? DEFAULT_FINISH ?? "gold";
      // The round GLB is gold-toned. For any non-gold finish, tint the cloned
      // material to the selected colorway colour (e.g. silver #C0C0C0) so it
      // doesn't render as gold. Gold keeps the GLB's native appearance.
      const tintHex = bead.seedConfig?.colorway?.[0]?.hex;
      if (finishKey !== "gold" && tintHex) finishedMat.color.set(tintHex);
      const preset = FINISH_PRESETS[finishKey];
      if (preset) {
        if (preset.metalness !== undefined) finishedMat.metalness = preset.metalness;
        if (preset.roughness !== undefined) finishedMat.roughness = preset.roughness;
        if (preset.envMapIntensity !== undefined) finishedMat.envMapIntensity = preset.envMapIntensity;
        finishedMat.roughness = Math.max(finishedMat.roughness, 0.22);
      }
    }

    return {
      seedGeometry: geometry,
      nativeDiameter: diam || SEED_BEAD_NATIVE_DIAMETER,
      roundMaterial: finishedMat,
    };
  }, [activeGlbScene, bead.product.material, bead.seedConfig?.colorway?.[0]?.hex]);

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
          isMetallic: sb.isMetallic,
          finishKey: sb.finishKey,
        };
      });
    }

    // 3D circular view: place each tiny bead at its own angle on the arc
    const centerAngle = getBeadAngle(slotIndex, beads, radius, extraSpacingPerGap);
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
        isMetallic: sb.isMetallic,
        finishKey: sb.finishKey,
      };
    });
  }, [config, generatedBeads, slotIndex, beads, radius, viewMode, bead.product.diameter]);

  // Total arc consumed by this segment (metres). Declared here (before any
  // early return) because the hitChunks memo below depends on it.
  const segArcM = bead.product.diameter;

  // ── Hit area chunks — many small cylinders that follow the arc ──────────
  // One chunk every ~8mm so they approximate the curve even on long segments.
  // NOTE: this memo MUST stay above the early return so the hook order is
  // identical on every render (Rules of Hooks).
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

    const centerAngle = getBeadAngle(slotIndex, beads, radius, extraSpacingPerGap);
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

  if (!config || seedBead3DData.length === 0 || !seedGeometry) return null;

  // Cross-section radius for hit area and selection — matches the visual
  // height of the tiny seed beads (~3mm, same as spacer cross-section).
  const crossSection = 0.003;

  // Rotate cylinder from default Y-axis to lie along the cord tangent
  const cylRotation: [number, number, number] = [Math.PI / 2, 0, 0];

  // Center transform for selection ring (stays at midpoint)
  const centerTransform =
    viewMode === "line"
      ? getBeadTransformLine(slotIndex, beads)
      : (() => {
          const a = getBeadAngle(slotIndex, beads, radius, extraSpacingPerGap);
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
      {/* Individual seed beads — GLB model with per-bead color and scale */}
      {seedBead3DData.map((sb, i) => {
        const scale = sb.diameter / nativeDiameter;
        // Seed beads: tip disc flat faces along cord (rotate 90° around X)
        // Round beads: align hole with cord tangent (rotate 90° around Z)
        const innerRotation: [number, number, number] = isRound
          ? [0, 0, Math.PI / 2]
          : [Math.PI / 2, 0, 0];

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
            {isRound && roundMaterial ? (
              <mesh
                geometry={seedGeometry}
                material={roundMaterial}
                rotation={innerRotation}
                scale={[scale, scale, scale]}
              />
            ) : (
              <mesh
                geometry={seedGeometry}
                rotation={innerRotation}
                scale={[scale, scale, scale]}
              >
                {sb.isMetallic ? (
                  <meshStandardMaterial
                    color={sb.color}
                    metalness={FINISH_PRESETS[sb.finishKey]?.metalness ?? 1}
                    roughness={Math.max(FINISH_PRESETS[sb.finishKey]?.roughness ?? 0.1, 0.22)}
                    envMapIntensity={FINISH_PRESETS[sb.finishKey]?.envMapIntensity ?? 0.3}
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
            )}
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
          <mesh rotation={isEditMode ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
            <torusGeometry args={[crossSection * 1.15, 0.0002, 8, 32]} />
            <meshBasicMaterial
              color={highlightColor}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Hover ring — flat, edit-mode rollover hint */}
      {showHoverRing && (
        <group position={centerTransform.position} rotation={centerTransform.outerRotation}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[crossSection * 1.3, 0.00016, 8, 40]} />
            <meshBasicMaterial color={EDIT_MODE_RING_HOVER} transparent opacity={0.55} />
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