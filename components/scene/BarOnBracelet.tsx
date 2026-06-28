"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { BufferAttribute, BufferGeometry, ClampToEdgeWrapping, FrontSide, Mesh, MeshStandardMaterial, Texture } from "three";
import type { PlacedBead } from "@/types";
import { getBeadTransform, getBeadTransformLine, getEvenSpacingBonus } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import {
  BRACELET_SIZE_RADIUS,
  FINISH_PRESETS,
  DEFAULT_FINISH,
  EDIT_MODE_RING_HOVER,
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
      bead.product.finish ?? bead.product.material ?? DEFAULT_FINISH;
    const preset = finishKey ? FINISH_PRESETS[finishKey] : undefined;
    if (preset) {
      if (preset.metalness       !== undefined) rawMat.metalness       = preset.metalness;
      if (preset.roughness       !== undefined) rawMat.roughness       = preset.roughness;
      if (preset.envMapIntensity !== undefined) rawMat.envMapIntensity = preset.envMapIntensity;
    }

    // Bars are always solid — prevent any transparency baked into the GLB export from carrying through.
    rawMat.transparent = false;
    rawMat.opacity     = 1;
    rawMat.alphaTest   = 0;
    rawMat.side        = FrontSide;
    rawMat.depthWrite  = true;
    rawMat.needsUpdate = true;

    // Clamp V so the LINEAR filter never blends the atlas strip (V=0.846..1.0) with
    // the solid-black background outside it. Without this, the seam vertex at V=1.0
    // bleeds toward V=0.0 (black) via RepeatWrapping, producing the thin dark strip.
    // Clone each texture before mutating wrapT — MeshStandardMaterial.clone() is a
    // shallow copy, so rawMat.map etc. point to the same Texture instance cached by
    // useGLTF. Mutating wrapT in-place would affect all other consumers of that GLB.
    const clampT = (t: Texture | null) => {
      if (!t) return;
      const owned = t.clone();
      owned.wrapT    = ClampToEdgeWrapping;
      owned.needsUpdate = true;
      return owned;
    };
    rawMat.map          = clampT(rawMat.map)          ?? rawMat.map;
    rawMat.normalMap    = clampT(rawMat.normalMap)    ?? rawMat.normalMap;
    rawMat.metalnessMap = clampT(rawMat.metalnessMap) ?? rawMat.metalnessMap;
    rawMat.roughnessMap = clampT(rawMat.roughnessMap) ?? rawMat.roughnessMap;
    rawMat.aoMap        = clampT(rawMat.aoMap)        ?? rawMat.aoMap;
    rawMat.emissiveMap  = clampT(rawMat.emissiveMap)  ?? rawMat.emissiveMap;
    rawMat.needsUpdate  = true;

    return rawMat;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, bead.product.material, bead.product.finish]);

  // Read the actual UV bounds from the GLB:
  //   V range — texture atlas strip (e.g. 0.846..1.0 for BlissBar_Textured); outside
  //             that strip are solid-black pixels that decode as (-1,-1,-1) in tangent
  //             space, causing harsh normal-map artifacts.
  //   nativeArcM — the physical arc length the texture was authored for (computed by
  //             integrating the centerline of the pre-bent GLB geometry). Used to tile
  //             U at consistent physical density when the user changes bar length.
  const uvBounds = useMemo(() => {
    const meshes: Mesh[] = [];
    scene.traverse((c) => { if (c instanceof Mesh) meshes.push(c as Mesh); });
    const geo     = meshes[0]?.geometry;
    const uvAttr  = geo?.getAttribute("uv")       as BufferAttribute | undefined;
    const posAttr = geo?.getAttribute("position") as BufferAttribute | undefined;
    if (!uvAttr || !posAttr) return { vMin: 0, vMax: 1, nativeArcM: null as number | null };

    type Ring = { x: number; y: number; z: number; count: number };
    const ringMap = new Map<number, Ring>();
    let vMin = Infinity, vMax = -Infinity;

    for (let i = 0; i < uvAttr.count; i++) {
      const uKey = Math.round(uvAttr.getX(i) * 1e3) / 1e3;
      const v    = uvAttr.getY(i);
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
      const ring = ringMap.get(uKey) ?? { x: 0, y: 0, z: 0, count: 0 };
      ring.x += posAttr.getX(i);
      ring.y += posAttr.getY(i);
      ring.z += posAttr.getZ(i);
      ring.count++;
      ringMap.set(uKey, ring);
    }

    const rings = [...ringMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, r]) => ({ x: r.x / r.count, y: r.y / r.count, z: r.z / r.count }));

    let nativeArcM = 0;
    for (let i = 1; i < rings.length; i++) {
      const p = rings[i - 1], c = rings[i];
      const dx = c.x - p.x, dy = c.y - p.y, dz = c.z - p.z;
      nativeArcM += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    return { vMin, vMax, nativeArcM: nativeArcM > 0 ? nativeArcM : null };
  }, [scene]);

  const beads          = useStore((s) => s.beads);
  const braceletSize   = useStore((s) => s.braceletSize);
  const viewMode       = useStore((s) => s.viewMode);
  const isEvenlySpaced = useStore((s) => s.isEvenlySpaced);

  const { isSelected, highlightColor, handleClick, handlePointerDown, handlePointerEnter, handlePointerLeave, showHoverRing } =
    useSceneItemInteraction(bead, slotIndex, { isLocked, onDragStart });

  const braceletRadius = BRACELET_SIZE_RADIUS[braceletSize];
  const extraSpacingPerGap = (isEvenlySpaced && viewMode === '3D')
    ? getEvenSpacingBonus(beads, braceletRadius)
    : 0;
  const { position, outerRotation, innerRotation } = viewMode === "line"
    ? getBeadTransformLine(slotIndex, beads)
    : getBeadTransform(slotIndex, beads, braceletRadius, extraSpacingPerGap);

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
    // Tile U proportionally to physical length so bumps stay at native density
    // regardless of slider position. Falls back to 1 for smooth/silver bars.
    const uScale    = uvBounds.nativeArcM != null ? arcLen / uvBounds.nativeArcM : 1;

    const M = 32; // radial segments (cross-section); M+1 vertices per ring for clean UV seam
    const N = Math.max(64, Math.ceil((halfAngle * 2 * 180) / (Math.PI * 3)));

    const positions = new Float32Array(N * (M + 1) * 3);
    const uvs       = new Float32Array(N * (M + 1) * 2);
    const indexArr: number[] = [];

    for (let s = 0; s < N; s++) {
      const posZ = -halfLen + (s / (N - 1)) * 2 * halfLen;
      const phi  = (posZ / halfLen) * halfAngle;
      const u    = s / (N - 1);

      for (let r = 0; r <= M; r++) {          // inclusive: r=M duplicates r=0 position with V=vMax
        const theta = (r / M) * 2 * Math.PI;  // at r=M: theta=2π ≡ 0, same position as r=0
        const posX  = tubeR * Math.cos(theta);
        const posY  = tubeR * Math.sin(theta);

        const base = (s * (M + 1) + r) * 3;
        positions[base]     = (R + posX) * Math.cos(phi) - R;
        positions[base + 1] = posY;
        positions[base + 2] = (R + posX) * Math.sin(phi);

        const uvBase = (s * (M + 1) + r) * 2;
        uvs[uvBase]     = u * uScale;
        uvs[uvBase + 1] = uvBounds.vMin + (r / M) * (uvBounds.vMax - uvBounds.vMin);
      }
    }

    // CCW winding — no modulo needed: r+1 always valid because we have M+1 vertices per ring
    for (let s = 0; s < N - 1; s++) {
      for (let r = 0; r < M; r++) {
        const r1 = r + 1;
        const a  = s * (M + 1) + r,      b = s * (M + 1) + r1;
        const c  = (s + 1) * (M + 1) + r, d = (s + 1) * (M + 1) + r1;
        indexArr.push(a, d, c);
        indexArr.push(a, b, d);
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("uv",       new BufferAttribute(uvs, 2));
    geo.setIndex(indexArr);
    geo.computeVertexNormals();
    geo.computeTangents();
    return geo;
  }, [bead.product.size_mm, bead.product.diameter, braceletRadius, uvBounds]);

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

        {/* Invisible hit area — capsule laid ALONG the bar's arc (local Z) so the
            whole length is hoverable/clickable, not just a vertical sliver at the
            centre. capsuleGeometry's axis is Y by default, hence the X rotation. */}
        <mesh visible={false} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[vizRadius * 0.5, vizRadius * 1.8, 4, 8]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.5} />
        </mesh>

        {/* Selection ring — vertical (XY plane, perpendicular to bar's tangent),
            radius matches bead convention: cross-section diameter / 2 */}
        {isSelected && ringRadius > 0 && (
          <mesh>
            <torusGeometry args={[ringRadius * 1.8, 0.0002, 8, 32]} />
            <meshBasicMaterial color={highlightColor} transparent opacity={0.8} />
          </mesh>
        )}

        {/* Hover ring — flat, edit-mode rollover hint */}
        {showHoverRing && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[ringRadius * 1.8, 0.00018, 8, 40]} />
            <meshBasicMaterial color={EDIT_MODE_RING_HOVER} transparent opacity={0.55} />
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