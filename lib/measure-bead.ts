/**
 * measure-bead.ts
 *
 * Loads a GLB file and returns its diameter by computing the bounding box
 * of all meshes in the scene. Runs entirely in the browser via Three.js —
 * no server involvement.
 *
 * Diameter is defined as the largest extent across X and Z (the two axes
 * perpendicular to the bead's hole, which runs along local Y).
 *
 * Results are cached in a module-level Map so each GLB is only parsed once
 * per session, even if multiple beads share the same file.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const cache = new Map<string, number>();
const loader = new GLTFLoader();

/**
 * Returns the bead diameter in metres, derived from the GLB bounding box.
 * Resolves immediately from cache on subsequent calls for the same path.
 */
export function measureBeadDiameter(glbPath: string): Promise<number> {
  if (cache.has(glbPath)) {
    return Promise.resolve(cache.get(glbPath)!);
  }

  return new Promise((resolve, reject) => {
    loader.load(
      glbPath,
      (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Diameter = max of X and Z extents (hole runs along Y)
        const diameter = Math.max(size.x, size.z);
        cache.set(glbPath, diameter);
        resolve(diameter);
      },
      undefined,
      reject
    );
  });
}

/**
 * Preloads and measures a list of GLB paths in parallel.
 * Call this once at app startup with your full bead catalog.
 * Returns a map of glbPath → diameter for easy lookup.
 */
export async function measureAllBeads(
  glbPaths: string[]
): Promise<Map<string, number>> {
  await Promise.all(glbPaths.map(measureBeadDiameter));
  return cache;
}
