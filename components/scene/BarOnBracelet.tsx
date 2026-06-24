"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial } from "three";
import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import {
  BRACELET_SIZE_RADIUS,
  FINISH_PRESETS,
  DEFAULT_FINISH,
} from "@/lib/constants";
import { useSceneItemInteraction } from "@/hooks/useSceneItemInteraction";

interface BarOnBraceletProps {
  bead: PlacedBead;
  slotIndex: number;
  isDragged?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (index: number) => void;
  isLocked?: boolean;
}

export function BarOnBracelet({
  bead,
  slotIndex,
  isDragged = false,
  isDragTarget = false,
  onDragStart,
  isLocked = false,
}: BarOnBraceletProps) {
  const { scene } = useGLTF(bead.product.glb_path);

  // Clone GLB material so finish/PBR settings from the modeler carry through.
  const mat = useMemo(() => {
    const meshes: Mesh[] = [];
    scene.traverse((c) => { if (c instanceof Mesh) meshes.push(c as Mesh); });
    const firstMesh = meshes[0] as Mesh | undefined;

    const rawMat = firstMesh
      ? (firstMesh.material as MeshStandardMaterial).clone()
      : new MeshStandardMaterial({ color: "#D4A843", metalness: 1, roughness: 0.18 });

    const finishKey: string | null =
      (bead.product as any).finish ?? bead.product.material ?? DEFAULT_FINISH;
    const preset = finishKey ? FINISH_PRESETS[finishKey] : undefined;
    if (preset) {
      if (preset.metalness       !== undefined) rawMat.metalness       = preset.metalness;
      if (preset.roughness       !== undefined) rawMat.roughness       = preset.roughness;
      if (preset.envMapIntensity !== undefined) rawMat.envMapIntensity = preset.envMapIntensity;
    }
    return rawMat;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, bead.product.material]);

  const beads        = useStore((s) => s.beads);
  const braceletSize = useStore((s) => s.braceletSize);
  const viewMode     = useStore((s) => s.viewMode);

  const { isSelected, highlightColor, handleClick, handlePointerDown, handlePointerEnter, handlePointerLeave } =
    useSceneItemInteraction(bead, slotIndex, { isLocked, onDragStart });

  const braceletRadius = BRACELET_SIZE_RADIUS[braceletSize];
  const { position, outerRotation, innerRotation } = viewMode === "line"
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, braceletRadius);

  // vizRadius drives the hit capsule (sized to arc length for easy clicking)
  const vizRadius  = (bead.product.size_mm ?? 10) / 2 / 1000;
  // ringRadius drives the visual selection ring (sized to cross-section, same as beads)
  const ringRadius = bead.product.diameter / 2;

  // Sweep a circular cross-section along the bracelet arc with enough longitudinal
  // rings for perfectly smooth bending (1 ring per 3°, minimum 64).
  //
  // Geometry is built in Z-length / X-radial / Y-up space — the same axis
  // convention as the original vertex-bending formula — so the Jacobian of the
  // transform is positive and triangle winding (CCW from outside) is preserved.
  //
  //   phi   = posZ / halfLen * halfAngle
  //   x_out = (R + posX) * cos(phi) - R   [radial direction]
  //   y_out = posY                          [world Y unchanged]
  //   z_out = (R + posX) * sin(phi)        [tangential]
  const bentGeometry = useMemo(() => {
    const arcLen    = (bead.product.size_mm ?? 10) / 1000;
    const halfAngle = arcLen / (2 * braceletRadius);
    const tubeR     = bead.product.diameter / 2;
    const halfLen   = arcLen / 2;
    const R         = braceletRadius;

    const M = 32; // radial segments (cross-section)
    const N = Math.max(64, Math.ceil((halfAngle * 2 * 180) / (Math.PI * 3)));

    const positions = new Float32Array(N * M * 3);
    const indexArr: number[] = [];

    for (let s = 0; s < N; s++) {
      const posZ = N === 1 ? 0 : -halfLen + (s / (N - 1)) * 2 * halfLen;
      const phi  = (posZ / halfLen) * halfAngle;

      for (let r = 0; r < M; r++) {
        const theta = (r / M) * 2 * Math.PI;
        const posX  = tubeR * Math.cos(theta); // X = radial
        const posY  = tubeR * Math.sin(theta); // Y = up

        const base = (s * M + r) * 3;
        positions[base]     = (R + posX) * Math.cos(phi) - R;
        positions[base + 1] = posY;
        positions[base + 2] = (R + posX) * Math.sin(phi);
      }
    }

    // CCW winding for Z-axis convention (outward normals)
    for (let s = 0; s < N - 1; s++) {
      for (let r = 0; r < M; r++) {
        const r1 = (r + 1) % M;
        const a  = s * M + r,    b = s * M + r1;
        const c  = (s + 1)*M + r, d = (s + 1)*M + r1;
        indexArr.push(a, d, c);
        indexArr.push(a, b, d);
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setIndex(indexArr);
    geo.computeVertexNormals();
    return geo;
  }, [bead.product.size_mm, bead.product.diameter, braceletRadius]);

  const liftedPosition: [number, number, number] = [
    position[0],
    position[1] + (isDragged ? 0.003 : 0),
    position[2],
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
        {/* Single continuously bent mesh — no segment joints */}
        {bentGeometry && <mesh geometry={bentGeometry} material={mat} />}

        {/* Invisible hit area */}
        <mesh visible={false}>
          <capsuleGeometry args={[vizRadius * 0.15, vizRadius * 1.8, 4, 8]} />
          <meshBasicMaterial />
        </mesh>

        {/* Selection ring — vertical (XY plane, perpendicular to bar's tangent),
            radius matches bead convention: cross-section diameter / 2 */}
        {isSelected && ringRadius > 0 && (
          <mesh>
            <torusGeometry args={[ringRadius * 1.4, 0.0002, 8, 32]} />
            <meshBasicMaterial color={highlightColor} transparent opacity={0.8} />
          </mesh>
        )}

        {/* Drag-target ring */}
        {isDragTarget && ringRadius > 0 && (
          <mesh>
            <torusGeometry args={[ringRadius * 1.4, 0.0002, 8, 32]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        )}
      </group>
    </group>
  );
}
