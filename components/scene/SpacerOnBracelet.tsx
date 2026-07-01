"use client";

import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine, getGapFillAwareSpacingBonuses, buildEffectiveGroups } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, DRAG_LIFT, EDIT_MODE_RING_HOVER, HOVER_EMISSIVE_INTENSITY } from "@/lib/constants";
import { useSceneItemInteraction } from "@/hooks/useSceneItemInteraction";
import { SelectionRing, DragTargetRing } from "./ItemRings";

/** Fixed cross-section radius for all spacers (meters) */
const SPACER_CROSS_SECTION = 0.0012;

interface SpacerOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
  /** Live-preview ordering + this item's index within it during an edit-mode
   *  reorder drag. Absent when idle → layout falls back to the store order. */
  layoutBeads?: PlacedBead[];
  layoutIndex?: number;
  isDragged?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (index: number) => void;
  /** When false, the spacer still occupies arc space but renders no visible mesh. */
  visible?: boolean;
  isLocked?: boolean;
}

/**
 * Renders a spacer bead as a translucent wireframe cylinder.
 * No GLB is loaded — this is entirely procedural.
 * All spacers share the same visual height; only their width along the
 * cord varies with the chosen spacer size.
 * When `visible` is false (non-draft states, thumbnail capture) the spacer
 * still takes up layout space but renders nothing on screen.
 */
export function SpacerOnBracelet({
  bead,
  slotIndex,
  layoutBeads,
  layoutIndex,
  isDragged = false,
  isDragTarget = false,
  onDragStart,
  visible = true,
  isLocked = false,
}: SpacerOnBraceletProps) {
  const storeBeads     = useStore((s) => s.beads);
  const beads          = layoutBeads ?? storeBeads;
  const layoutIdx      = layoutIndex ?? slotIndex;
  const braceletSize   = useStore((s) => s.braceletSize);
  const viewMode       = useStore((s) => s.viewMode);
  const isEvenlySpaced      = useStore((s) => s.isEvenlySpaced);
  const groups              = useStore((s) => s.groups);
  const editSelectedIds     = useStore((s) => s.editSelectedIds);

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
  const effectiveGroups = buildEffectiveGroups(groups, editSelectedIds);
  const extraSpacingPerGap = (isEvenlySpaced && viewMode === '3D')
    ? getGapFillAwareSpacingBonuses(beads, effectiveGroups, radius)
    : 0;
  const { position, outerRotation, innerRotation } = viewMode === "line"
    ? getBeadTransformLine(layoutIdx, beads)
    : getBeadTransform(layoutIdx, beads, radius, extraSpacingPerGap);

  const liftedPosition: [number, number, number] = [
    position[0],
    position[1] + (isDragged ? DRAG_LIFT : 0),
    position[2],
  ];

  // Fixed cross-section for all spacers; only length (along the cord) varies.
  // Cylinder default axis is Y; rotate π/2 on X to lie along local Z (cord tangent).
  const cylRadius = SPACER_CROSS_SECTION;
  const cylLength = bead.product.diameter;
  const cylRotation: [number, number, number] = [Math.PI / 2, 0, 0];

  return (
    <group
      position={liftedPosition}
      rotation={outerRotation}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <group rotation={innerRotation}>
        {visible && (
          <>
            {/* Translucent fill */}
            <mesh rotation={cylRotation} visible={true}>
              <cylinderGeometry args={[cylRadius, cylRadius, cylLength, 16]} />
              <meshStandardMaterial
                color="#dfe8ef"
                transparent
                opacity={0.8}
                depthWrite={false}
                emissive={showHoverRing ? EDIT_MODE_RING_HOVER : "#000000"}
                emissiveIntensity={showHoverRing ? HOVER_EMISSIVE_INTENSITY : 0}
              />
            </mesh>

            {/* Wireframe edges */}
            {/*<mesh rotation={cylRotation}>
              <cylinderGeometry args={[cylRadius, cylRadius, cylLength, 16]} />
              <meshBasicMaterial
                color="#c8a97e"
                wireframe
                transparent
                opacity={0.25}
              />
            </mesh>*/}
          </>
        )}

        {/* Hit area — always present so spacer stays interactive */}
        <mesh visible={false}>
          <sphereGeometry args={[Math.max(cylRadius, cylLength / 2) * 1.1, 8, 8]} />
          <meshBasicMaterial />
        </mesh>

        {/* Selection ring */}
        {visible && (isSelected || isDragged) && cylRadius > 0 && (
          <SelectionRing
            radius={cylRadius * 1.6}
            color={highlightColor}
            rotation={[Math.PI, 0, 0]}
          />
        )}

        {/* Hover ring — flat, edit-mode rollover hint */}
        {/* Drag target indicator */}
        {visible && isDragTarget && cylRadius > 0 && (
          <DragTargetRing radius={cylRadius * 1.6} />
        )}
      </group>
    </group>
  );
}