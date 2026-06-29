"use client";

import { useEffect } from "react";
import { Color, MeshStandardMaterial, type Material, type Mesh, type Object3D } from "three";

/**
 * useEmissiveHighlight — glow every mesh under `root` while `color` is set,
 * restoring the originals when it clears. Used to tint a charm while it's
 * hovered, in place of the old hover ring.
 *
 * Each glowed material is a fresh clone, so shared GLB materials are never
 * mutated in place — hovering one charm can't tint every other charm that
 * happens to share a material. This is the path for objects whose materials are
 * NOT managed by React Three Fiber via JSX (i.e. <primitive> GLTF scenes).
 */
export function useEmissiveHighlight(root: Object3D | null, color: string | null, intensity: number) {
  useEffect(() => {
    if (!root || !color) return;

    const glowColor = new Color(color);
    const restores: Array<() => void> = [];

    const glowOne = (m: Material): Material => {
      if (!(m instanceof MeshStandardMaterial)) return m;
      const g = m.clone();
      g.emissive = glowColor;
      g.emissiveIntensity = intensity;
      return g;
    };

    root.traverse((o) => {
      const mesh = o as Mesh;
      if (!(mesh as { isMesh?: boolean }).isMesh) return;
      const original = mesh.material as Material | Material[];

      if (Array.isArray(original)) {
        const glowed = original.map(glowOne);
        mesh.material = glowed;
        restores.push(() => {
          glowed.forEach((g, i) => { if (g !== original[i]) g.dispose(); });
          mesh.material = original;
        });
      } else {
        const glowed = glowOne(original);
        if (glowed !== original) {
          mesh.material = glowed;
          restores.push(() => { (mesh.material as Material).dispose(); mesh.material = original; });
        }
      }
    });

    return () => restores.forEach((r) => r());
  }, [root, color, intensity]);
}