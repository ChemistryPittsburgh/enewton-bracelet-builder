"use client";

import {
  EDIT_MODE_RING_HOVER,
  DRAG_TARGET_RING_COLOR,
  DRAG_TARGET_RING_TUBE,
  COLLISION_RING_COLOR,
} from "@/lib/constants";

/**
 * ItemRings — the torus highlight rings shared by every on-cord scene item
 * (BeadOnBracelet, BarOnBracelet, SpacerOnBracelet, SeedSegmentOnBracelet).
 *
 * Each item used to carry its own near-identical <mesh><torusGeometry/> blocks,
 * which let the tube thickness / opacity / segment counts drift apart over time.
 * These wrappers own that styling in one place; callers pass only the major
 * `radius` (already multiplied for their geometry) plus an optional rotation /
 * scale / position to suit each shape.
 */

type Vec3 = [number, number, number];

/** Flat orientation — ring lies in the cord plane. Default for most rings. */
const FLAT: Vec3 = [Math.PI / 2, 0, 0];

interface RingProps {
  /** Major (torus) radius in metres — already includes any per-item multiplier. */
  radius: number;
  rotation?: Vec3;
  scale?: Vec3 | number;
  position?: Vec3;
}

interface BaseRingProps extends RingProps {
  tube: number;
  color: string;
  /** Omit for a fully opaque ring (e.g. the drag-target indicator). */
  opacity?: number;
  radialSegments?: number;
  tubularSegments?: number;
}

/** Low-level shared torus. The semantic wrappers below bake in each ring's look. */
function Ring({
  radius,
  tube,
  color,
  opacity,
  radialSegments = 8,
  tubularSegments = 32,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  position = [0, 0, 0],
}: BaseRingProps) {
  return (
    <mesh rotation={rotation} scale={scale} position={position}>
      <torusGeometry args={[radius, tube, radialSegments, tubularSegments]} />
      <meshBasicMaterial color={color} transparent={opacity !== undefined} opacity={opacity ?? 1} />
    </mesh>
  );
}

/** Solid highlight — selected items, and the item currently being dragged. */
export function SelectionRing({ radius, color, rotation, scale, position }: RingProps & { color: string }) {
  return (
    <Ring radius={radius} tube={0.0002} color={color} opacity={0.8} rotation={rotation} scale={scale} position={position} />
  );
}

/** Faint edit-mode rollover hint. */
export function HoverRing({ radius, rotation = FLAT, scale, position }: RingProps) {
  return (
    <Ring radius={radius} tube={0.00018} color={EDIT_MODE_RING_HOVER} opacity={0.7} tubularSegments={40} rotation={rotation} scale={scale} position={position} />
  );
}

/** Bold drop-target / insertion ring shown during a reorder or panel drag. */
export function DragTargetRing({ radius, rotation = FLAT, scale, position }: RingProps) {
  return (
    <Ring radius={radius} tube={DRAG_TARGET_RING_TUBE} color={DRAG_TARGET_RING_COLOR} radialSegments={10} tubularSegments={40} rotation={rotation} scale={scale} position={position} />
  );
}

/** Overlap-warning ring shown when the user taps the charm-collision badge. */
export function CollisionRing({ radius, rotation = FLAT, scale, position }: RingProps) {
  return (
    <Ring radius={radius} tube={0.00025} color={COLLISION_RING_COLOR} opacity={0.4} rotation={rotation} scale={scale} position={position} />
  );
}