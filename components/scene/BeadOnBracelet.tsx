"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine, getEvenSpacingBonus, CORD_RADIUS } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import { 
  BRACELET_SIZE_RADIUS, 
  CHARM_ROTATION, 
  FLOAT_CHARM_ROTATION, 
  FLOAT_CHARM_DEPTH_OFFSET, 
  CRYSTAL_CHARM_DEPTH_OFFSET, 
  FINISH_PRESETS, 
  DEFAULT_FINISH, 
  EDIT_MODE_RING_HOVER
} from "@/lib/constants";
import { useSceneItemInteraction } from "@/hooks/useSceneItemInteraction";
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
  /** Overrides the edit-mode selection ring color (e.g. replace-group color). */
  selectionColor?: string;
  /** True during thumbnail capture — suppresses all selection rings. */
  isCapturing?: boolean;
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
  selectionColor,
  isCapturing = false,
}: BeadOnBraceletProps) {
  const { scene } = useGLTF(bead.product.glb_path);

  const { cloned, autoHangOffset, charmBodyCenterY } = useMemo(() => {
    const clone = cloneShared(scene);

    // Centre the clone so its bounding-box midpoint sits at the wrapper origin;
    // CHARM_ROTATION then rotates about that centre for autoHangOffset measurement.
    const rawBox = new Box3().setFromObject(clone);
    const center = new Vector3();
    rawBox.getCenter(center);
    // Move children (not the scene root) so geometry is centered at the root's origin.
    // Moving the root itself causes its position to be rotated by outerRotation,
    // displacing beads whose GLB node has a non-zero translation offset.
    clone.children.forEach((child) => child.position.sub(center));

    // ── Apply material finish preset ────────────────────────────────────────
    // Lookup chain: product.finish → product.material → DEFAULT_FINISH.
    // If the resolved key exists in FINISH_PRESETS (gold, silver, rose_gold),
    // apply it. If it doesn't (e.g. "metal", "enamel"), the preset lookup
    // returns undefined and the GLB's original material is preserved — keeping
    // vibrant colors on painted/colored beads like crosses and gems.
    const finishKey: string | null = bead.product.finish ?? bead.product.material ?? DEFAULT_FINISH;
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
      // dielectric rendering so the base color comes through vibrantly.
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

    if (bead.product.bead_category === "charm" || bead.product.bead_category === "letter_charm" || bead.product.bead_category === "float_charm") {
      const rotation = bead.product.bead_category === "float_charm"
        ? FLOAT_CHARM_ROTATION
        : CHARM_ROTATION;

      const wrapper = new Group();
      wrapper.add(clone);
      wrapper.rotation.set(...rotation);
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

  const beads          = useStore((s) => s.beads);
  const braceletSize   = useStore((s) => s.braceletSize);
  const viewMode       = useStore((s) => s.viewMode);
  const isEvenlySpaced = useStore((s) => s.isEvenlySpaced);

  const {
    isSelected,
    highlightColor,
    showHoverRing,
    handleClick,
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    isEditMode,
  } = useSceneItemInteraction(bead, slotIndex, { isLocked, onDragStart, selectAllOfType: true, selectionColor });

  const isFloatCharm = bead.product.bead_category === "float_charm";
  const isCharm = bead.product.bead_category === "charm" || isFloatCharm || bead.product.bead_category === "letter_charm";
  const isCharmOnly = bead.product.bead_category === "charm" || bead.product.bead_category === "letter_charm";
  const isCrystalCharm = isCharmOnly && bead.product.material === "crystal";
  const activeCharmRotation = isFloatCharm ? FLOAT_CHARM_ROTATION : CHARM_ROTATION;

  const vizRadius = isCharm
    ? (bead.product.body_width_mm ?? bead.product.diameter * 1000) / 2.7 / 1000
    : bead.product.diameter / 2;

  const hangOffset = isCharm ? autoHangOffset : 0;
  // Per-charm depth setback (incl. a small default). Applied radially below —
  // NOT as a world-Z shift — so it points "into the band" at every position
  // around the bracelet instead of only at the front.
  const charmDepthOffset = (isCharm && !isFloatCharm) ? (bead.product.depth_offset ?? -0.0005) : 0;

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const extraSpacingPerGap = (isEvenlySpaced && viewMode === '3D')
    ? getEvenSpacingBonus(beads, radius)
    : 0;
  const { position, outerRotation, innerRotation } = viewMode === 'line'
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, radius, extraSpacingPerGap);

  // Radial offset: collision layer stacking + float charm forward push +
  // crystal-charm setback + per-charm depth setback. All shift along the radial
  // direction so the charm stays centred on the cord at every position around
  // the bracelet (a world-Z shift would drift it off-band as it rotates around).
  const totalRadialOffset =
    layerOffset +
    (isFloatCharm ? FLOAT_CHARM_DEPTH_OFFSET : 0) +
    (isCrystalCharm ? CRYSTAL_CHARM_DEPTH_OFFSET : 0) +
    charmDepthOffset;

  const layeredPosition: [number, number, number] = totalRadialOffset !== 0
    ? (() => {
        const mag = Math.sqrt(position[0] ** 2 + position[2] ** 2);
        if (mag === 0) return position;
        return [
          position[0] + (position[0] / mag) * totalRadialOffset,
          position[1],
          position[2] + (position[2] / mag) * totalRadialOffset,
        ] as [number, number, number];
      })()
    : position;

  const liftedPosition: [number, number, number] = [
    layeredPosition[0],
    layeredPosition[1] + hangOffset + (isDragged ? 0.003 : 0),
    layeredPosition[2],
  ];

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
                  <group rotation={activeCharmRotation}>
                    <primitive object={cloned} />
                  </group>
                </group>
              </group>
            </group>
          ) : (
            <group rotation={activeCharmRotation}>
              <primitive object={cloned} />
            </group>
          )
        ) : (
          <primitive object={cloned} />
        )}

        {/* Hit area — invisible but catches pointer events.
             Float charms are thin/flat, so the sphere is squashed along Z
             to form a disc-shaped hit zone that fits the model better. */}
        <mesh visible={true} position={[0, 0, 0]} scale={isFloatCharm ? [1, 1, 0.35] : [1, 1, 1]}>
          <sphereGeometry args={isCharm ? [vizRadius * 1.3, 8, 8] : [vizRadius * 1.2, 8, 8]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.5} />
        </mesh>

        {/* Selection Ring */}
        {isSelected && vizRadius > 0 && !isCapturing && (
          <mesh
            rotation={isEditMode || isCharmOnly ? [Math.PI / 2, 0, 0] : isFloatCharm ? activeCharmRotation : [0, 0, 0]}
            scale={!isEditMode && isFloatCharm ? [1, 0.4, 1] : [1, 1, 1]}
          >
            <torusGeometry args={[vizRadius * 1.4, 0.0002, 8, 32]} />
            <meshBasicMaterial color={highlightColor} transparent opacity={0.8} />
          </mesh>
        )}

        {/* Hover ring — flat, edit-mode rollover hint */}
        {showHoverRing && vizRadius > 0 && !isCapturing && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[vizRadius * 1.5, 0.00016, 8, 40]} />
            <meshBasicMaterial color={EDIT_MODE_RING_HOVER} transparent opacity={0.7} />
          </mesh>
        )}

        {/* Drag target indicator ring — edit mode only */}
        {isDragTarget && vizRadius > 0 && !isCapturing && (
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={isFloatCharm ? [1, 0.35, 1] : [1, 1, 1]}>
            <torusGeometry args={[vizRadius * 1.4, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        )}

        {/* Charm collision highlight ring — shown when user clicks the overlap warning */}
        {isColliding && vizRadius > 0 && !isCapturing && (
          <mesh
            position={isCharm ? [0, charmBodyCenterY, 0] : [0, 0, 0]}
            rotation={isCharmOnly ? [Math.PI / 2, 0, 0] : isFloatCharm ? activeCharmRotation : [0, 0, 0]}
            scale={isFloatCharm ? [1, 0.35, 1] : [1, 1, 1]}
          >
            <torusGeometry args={[vizRadius * 1.4, 0.00025, 8, 32]} />
            <meshBasicMaterial color="#be123c" transparent opacity={0.4} />
          </mesh>
        )}
      </group>
    </group>
  );
}