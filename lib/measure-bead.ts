/**
 * measure-bead.ts
 *
 * Loads a GLB file and returns its measurements by computing the bounding box
 * of all meshes in the scene. Runs entirely in the browser via Three.js —
 * no server involvement.
 *
 * Results are cached in a module-level Map so each GLB is only parsed once
 * per session, even if multiple beads share the same file.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface CharmMeasurement {
  /** X/Y cross-section — used for arc spacing on the cord */
  diameter: number;
  /** Y offset to hang body below cord (negative = below) */
  hangOffset: number;
}

const diameterCache = new Map<string, number>();
const charmCache    = new Map<string, CharmMeasurement>();
const loader        = new GLTFLoader();

// ─── Beads ────────────────────────────────────────────────────────────────────

/**
 * Returns the bead diameter in metres, derived from the GLB bounding box.
 * Diameter = max of X and Y extents (hole runs along Z for new bead convention).
 * Resolves immediately from cache on subsequent calls for the same path.
 */
export function measureBeadDiameter(glbPath: string): Promise<number> {
  if (diameterCache.has(glbPath)) {
    return Promise.resolve(diameterCache.get(glbPath)!);
  }

  return new Promise((resolve, reject) => {
    loader.load(
      glbPath,
      (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Hole runs along Z — diameter is the max of X and Y
        const diameter = Math.max(size.x, size.y);
        diameterCache.set(glbPath, diameter);
        resolve(diameter);
      },
      undefined,
      reject
    );
  });
}

/**
 * Preloads and measures a list of bead GLB paths in parallel.
 * Returns a map of glbPath → diameter for easy lookup.
 */
export async function measureAllBeads(
  glbPaths: string[]
): Promise<Map<string, number>> {
  await Promise.all(glbPaths.map(measureBeadDiameter));
  return diameterCache;
}

// ─── Charms ───────────────────────────────────────────────────────────────────

/**
 * Returns charm measurements from its GLB bounding box:
 *   - diameter: X/Y cross-section width, used for arc spacing
 *   - hangOffset: how far the body hangs below the cord (half the Z extent)
 *
 * Charms mount via a bail at the top — the Z axis is the longest dimension,
 * running from the bail down to the bottom of the hanging body.
 */
export function measureCharm(glbPath: string): Promise<CharmMeasurement> {
  if (charmCache.has(glbPath)) {
    return Promise.resolve(charmCache.get(glbPath)!);
  }

  return new Promise((resolve, reject) => {
    loader.load(
      glbPath,
      (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        const measurement: CharmMeasurement = {
          diameter:   Math.max(size.x, size.y),
          hangOffset: -(size.z / 2),
        };

        charmCache.set(glbPath, measurement);
        resolve(measurement);
      },
      undefined,
      reject
    );
  });
}

/**
 * Preloads and measures a list of charm GLB paths in parallel.
 * Returns a map of glbPath → CharmMeasurement for easy lookup.
 */
export async function measureAllCharms(
  glbPaths: string[]
): Promise<Map<string, CharmMeasurement>> {
  await Promise.all(glbPaths.map(measureCharm));
  return charmCache;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

/**
 * Structural clone: new Object3D nodes per instance (required for independent
 * transforms) but meshes share the source's geometry and material objects.
 * Use instead of scene.clone(true) when the same GLB appears multiple times —
 * geometry/material JS wrappers are deduplicated while GPU memory stays shared.
 */
export function cloneShared(source: THREE.Object3D): THREE.Object3D {
  const clone = source.clone(false);
  if (source instanceof THREE.Mesh) {
    (clone as THREE.Mesh).geometry = source.geometry;
    (clone as THREE.Mesh).material = source.material;
  }
  source.children.forEach((child) => {
    clone.add(cloneShared(child));
  });
  return clone;
}