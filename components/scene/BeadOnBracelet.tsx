"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { ThreeEvent } from "@react-three/fiber";
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine, CORD_RADIUS } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, CHARM_ROTATION, FINISH_PRESETS, DEFAULT_FINISH, EDIT_MODE_HIGHLIGHT_SELECT_COLOR, HIGHLIGHT_SELECT_COLOR } from "@/lib/constants";
import { cloneShared } from "@/lib/measure-bead";

interface BeadOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
  isDragged?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (index: number) => void;
  isLocked?: boolean;
  /** Radial depth offset (metres) to layer nearby charms. 0 = no offset. */
  layerOffset?: number;
  /** Bail-pivot swing angle (radians) to fan nearby charm bodies apart. 0 = no swing. */
  swingAngle?: number;
  /** When true, renders an orange warning ring on this charm. */
  isColliding?: boolean;
}

export function BeadOnBracelet({
  bead,
  slotIndex,
  isDragged = false,
  isDragTarget = false,
  onDragStart,
  isLocked = false,
  layerOffset = 0,
  swingAngle = 0,
  isColliding = false,
}: BeadOnBraceletProps) {
  const { scene } = useGLTF(bead.product.glb_path);

  const { cloned, autoHangOffset, charmBodyCenterY } = useMemo(() => {
    const clone = cloneShared(scene);

    // Centre the clone so its bounding-box midpoint sits at the wrapper origin;
    // CHARM_ROTATION then rotates about that centre for autoHangOffset measurement.
    const rawBox = new Box3().setFromObject(clone);
    const center = new Vector3();
    rawBox.getCenter(center);
    clone.position.sub(center);

    // ── Apply material finish preset ────────────────────────────────────────
    // Lookup chain: product.finish → product.material → DEFAULT_FINISH.
    // If the resolved key exists in FINISH_PRESETS (gold, silver, rose_gold),
    // apply it. If it doesn't (e.g. "metal", "enamel"), the preset lookup
    // returns undefined and the GLB's original material is preserved — keeping
    // vibrant colors on painted/colored beads like crosses and gems.
    const finishKey: string | null = (bead.product as any).finish ?? bead.product.material ?? DEFAULT_FINISH;
    const preset = finishKey ? FINISH_PRESETS[finishKey] : undefined;
    if (preset) {
      clone.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const srcMat = child.material;
        if (srcMat.metalness < 0.5) return;

        const mat = srcMat.clone();

        if (preset.color           !== undefined) mat.color.set(preset.color);
        if (preset.metalness       !== undefined) mat.metalness       = preset.metalness;
        if (preset.roughness       !== undefined) mat.roughness       = preset.roughness;
        mat.roughness = Math.max(mat.roughness, 0.22);
        if (preset.envMapIntensity !== undefined) mat.envMapIntensity = preset.envMapIntensity;

        child.material = mat;
      });
    } else {
      // No matching finish preset — this is a colored/painted item (cross,
      // gem, crystal, etc.). The GLB may have been modelled with metallic
      // material, which makes colors look dull and washed out. Force
      // dielectric rendering so the base colour comes through vibrantly.
      clone.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const srcMat = child.material;
        if (!(srcMat instanceof MeshStandardMaterial)) return;
        if (srcMat.metalness <= 0.3) return; // already non-metallic

        const mat = srcMat.clone();
        mat.metalness = 0;
        mat.roughness = Math.max(mat.roughness, 0.55);
        mat.envMapIntensity = Math.min(mat.envMapIntensity ?? 1, 0.4);
        child.material = mat;
      });
    }

    let autoHangOffset = 0;
    // How far below the cord the charm body's centre sits, in the outer group's
    // local space. Used to position the hit sphere and selection ring on the
    // body rather than at bail/cord level.
    let charmBodyCenterY = 0;

    if (bead.product.bead_category === "charm") {
      const wrapper = new Group();
      wrapper.add(clone);
      wrapper.rotation.set(...CHARM_ROTATION);
      wrapper.updateMatrixWorld(true);

      const rotBox = new Box3().setFromObject(wrapper);
      const bailWireRadius = (bead.product.bail_width_mm ?? 0.8) / 1000;

      // Raise the bounding-box top by one cord radius so the cord centre
      // threads through the bail opening rather than pressing on the bail edge.
      autoHangOffset = -rotBox.max.y + CORD_RADIUS + bailWireRadius;

      // rotBox.min.y is the bottom of the charm in the wrapper's local space.
      // After hangOffset shifts the outer group down, cord level is at Y=0
      // in the outer group. The charm body's centre is halfway between the
      // cord (0) and the bottom of the charm (rotBox.min.y).
      charmBodyCenterY = rotBox.min.y / 2;

      wrapper.remove(clone);
    }

    return { cloned: clone, autoHangOffset, charmBodyCenterY };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, bead.product.bead_category, CHARM_ROTATION[0], CHARM_ROTATION[1], CHARM_ROTATION[2]]);

  const { gl } = useThree();
  const { selectBead, selectedBead, editSelectedIds, toggleEditBead, clearSelectedBead, clearEditSelection, beads, braceletSize, isEditMode, viewMode, selectAllActive } = useStore((s) => ({
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
    editSelectedIds: s.editSelectedIds,
    toggleEditBead: s.toggleEditBead,
    clearSelectedBead: s.clearSelectedBead,
    clearEditSelection: s.clearEditSelection,
    beads: s.beads,
    braceletSize: s.braceletSize,
    isEditMode: s.isEditMode,
    selectAllActive: s.selectAllActive,
    viewMode: s.viewMode,
  }));

  const isCharm = bead.product.bead_category === "charm";

  const vizRadius = isCharm
    ? (bead.product.body_width_mm ?? bead.product.diameter * 1000) / 2 / 1000
    : bead.product.diameter / 2;

  const hangOffset = isCharm ? autoHangOffset : 0;
  const depthOffset = isCharm ? (bead.product.depth_offset ?? -0.0005) : 0;

  const isSelected = isEditMode
    ? editSelectedIds.includes(bead.instanceId)
    : selectedBead?.instanceId === bead.instanceId
    || (selectAllActive && selectedBead?.product.id === bead.product.id);

const highlightColor = isEditMode ? EDIT_MODE_HIGHLIGHT_SELECT_COLOR : HIGHLIGHT_SELECT_COLOR;

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const { position, outerRotation, innerRotation } = viewMode === 'line'
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, radius);

  // Apply radial layer offset for nearby charms — shifts position outward
  // or inward along the radial direction so charms stack visually.
  const layeredPosition: [number, number, number] = layerOffset !== 0
    ? (() => {
        const mag = Math.sqrt(position[0] ** 2 + position[2] ** 2);
        if (mag === 0) return position;
        return [
          position[0] + (position[0] / mag) * layerOffset,
          position[1],
          position[2] + (position[2] / mag) * layerOffset,
        ] as [number, number, number];
      })()
    : position;

  const liftedPosition: [number, number, number] = [
    layeredPosition[0],
    layeredPosition[1] + hangOffset + (isDragged ? 0.003 : 0),
    layeredPosition[2] + depthOffset,
  ];

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (isLocked) return;
    if (isEditMode) {
      const ne = e.nativeEvent;
      if (ne && (ne.metaKey || ne.ctrlKey)) {
        // Cmd/Ctrl+click opens the info panel for this bead
        selectBead(bead);
        toggleEditBead(bead.instanceId);
      } else {
        // Plain click toggles edit selection; close info panel if open
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

  return (
    <group
      position={liftedPosition}
      rotation={outerRotation}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <group rotation={innerRotation} dispose={null}>
        {isCharm ? (
          swingAngle !== 0 ? (
            /* Bail-pivot swing: translate so bail sits at the group origin,
               apply the swing rotation, then translate back. The bail stays
               on the cord while the hanging body fans to one side. */
            <group position={[0, -hangOffset, 0]}>
              <group rotation={[0, 0, swingAngle]}>
                <group position={[0, hangOffset, 0]}>
                  <group rotation={CHARM_ROTATION}>
                    <primitive object={cloned} />
                  </group>
                </group>
              </group>
            </group>
          ) : (
            <group rotation={CHARM_ROTATION}>
              <primitive object={cloned} />
            </group>
          )
        ) : (
          <primitive object={cloned} />
        )}

        {/* Hit area — invisible but catches pointer events */}
        <mesh visible={false} position={[0, 0, 0]}>
          <sphereGeometry args={isCharm ? [vizRadius * 1.3, 8, 8] : [vizRadius * 1.1, 8, 8]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.5} />
        </mesh>

        {/* Selection highlight ring — sits at cord level for charms (bail attachment point) */}
        {isSelected && vizRadius > 0 && (
          <mesh rotation={isCharm ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
            <torusGeometry args={[vizRadius * 1.15, 0.0003, 8, 32]} />
            <meshBasicMaterial color={highlightColor} transparent opacity={0.8} />
          </mesh>
        )}

        {/* Drag target indicator ring — edit mode only */}
        {isDragTarget && vizRadius > 0 && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[vizRadius * 1.3, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        )}

        {/* Charm collision highlight ring — shown when user clicks the overlap warning */}
        {isColliding && vizRadius > 0 && (
          <mesh
            position={isCharm ? [0, charmBodyCenterY, 0] : [0, 0, 0]}
            rotation={isCharm ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
          >
            <torusGeometry args={[vizRadius * 1.25, 0.00025, 8, 32]} />
            <meshBasicMaterial color="#be123c" transparent opacity={0.4} />
          </mesh>
        )}
      </group>
    </group>
  );
}