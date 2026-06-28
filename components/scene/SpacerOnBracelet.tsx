"use client";

import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine, getEvenSpacingBonus } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, EDIT_MODE_RING_HOVER, DRAG_LIFT, DRAG_TARGET_RING_COLOR, DRAG_TARGET_RING_TUBE } from "@/lib/constants";
import { useSceneItemInteraction } from "@/hooks/useSceneItemInteraction";

/** Fixed cross-section radius for all spacers (metres). ~3mm radius = 6mm visual height. */
const SPACER_CROSS_SECTION = 0.003;

interface SpacerOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
  isDragged?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (index: number) => void;
  /** When false, the spacer still occupies arc space but renders no visible mesh. */
  visible?: boolean;
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
  isDragged = false,
  isDragTarget = false,
  onDragStart,
  visible = true,
}: SpacerOnBraceletProps) {
  const beads          = useStore((s) => s.beads);
  const braceletSize   = useStore((s) => s.braceletSize);
  const viewMode       = useStore((s) => s.viewMode);
  const isEvenlySpaced = useStore((s) => s.isEvenlySpaced);

  const {
    isSelected,
    highlightColor,
    handleClick,
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    showHoverRing,
    isEditMode,
  } = useSceneItemInteraction(bead, slotIndex, { onDragStart });

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const extraSpacingPerGap = (isEvenlySpaced && viewMode === '3D')
    ? getEvenSpacingBonus(beads, radius)
    : 0;
  const { position, outerRotation, innerRotation } = viewMode === "line"
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, radius, extraSpacingPerGap);

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
        {visible && isSelected && cylRadius > 0 && (
          <mesh rotation={isEditMode ? [Math.PI / 2, 0, 0] : [Math.PI, 0, 0]}>
            <torusGeometry args={[cylRadius * 1.15, 0.0002, 8, 32]} />
            <meshBasicMaterial color={highlightColor} />
          </mesh>
        )}

        {/* Hover ring — flat, edit-mode rollover hint */}
        {visible && showHoverRing && cylRadius > 0 && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[cylRadius * 1.3, 0.00018, 8, 40]} />
            <meshBasicMaterial color={EDIT_MODE_RING_HOVER} transparent opacity={0.55} />
          </mesh>
        )}

        {/* Drag target indicator */}
        {visible && isDragTarget && cylRadius > 0 && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[cylRadius * 1.6, DRAG_TARGET_RING_TUBE, 10, 40]} />
            <meshBasicMaterial color={DRAG_TARGET_RING_COLOR} />
          </mesh>
        )}
      </group>
    </group>
  );
}