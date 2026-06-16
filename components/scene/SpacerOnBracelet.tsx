"use client";

import { useThree } from "@react-three/fiber";
import { ThreeEvent } from "@react-three/fiber";
import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, HIGHLIGHT_SELECT_COLOR, EDIT_MODE_HIGHLIGHT_SELECT_COLOR } from "@/lib/constants";

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
    selectBead:          s.selectBead,
    selectedBead:        s.selectedBead,
    editSelectedIds:     s.editSelectedIds,
    toggleEditBead:      s.toggleEditBead,
    clearSelectedBead:   s.clearSelectedBead,
    clearEditSelection:  s.clearEditSelection,
    beads:               s.beads,
    braceletSize:        s.braceletSize,
    isEditMode:          s.isEditMode,
    viewMode:            s.viewMode,
  }));

  const isSelected = isEditMode
    ? editSelectedIds.includes(bead.instanceId)
    : selectedBead?.instanceId === bead.instanceId;

  const highlightColor = isEditMode ? EDIT_MODE_HIGHLIGHT_SELECT_COLOR : HIGHLIGHT_SELECT_COLOR;

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const { position, outerRotation, innerRotation } = viewMode === "line"
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, radius);

  const liftedPosition: [number, number, number] = [
    position[0],
    position[1] + (isDragged ? 0.003 : 0),
    position[2],
  ];

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (isEditMode) {
      const ne = e.nativeEvent;
      if (ne && (ne.metaKey || ne.ctrlKey)) {
        selectBead(bead);
      } else {
        clearSelectedBead();
        toggleEditBead(bead.instanceId);
      }
    } else {
      selectBead(bead);
    }
  }

  /** Pixels of pointer movement before a drag initiates (prevents jump on click). */
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

    function onUp() {
      cleanup();
    }

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
          <mesh rotation={[Math.PI, 0, 0]}>
            <torusGeometry args={[cylRadius * 1.15, 0.0003, 8, 32]} />
            <meshBasicMaterial color={highlightColor} />
          </mesh>
        )}

        {/* Drag target indicator */}
        {visible && isDragTarget && cylRadius > 0 && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[cylRadius * 1.3, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        )}
      </group>
    </group>
  );
}