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
import { CHARM_ROTATION } from "@/lib/constants";

const cache = new Map<string, number>();
const loader = new GLTFLoader();

export interface CharmMeasurement {
  diameter: number;
  hangOffset: number;
  hangLength: number;
}

const charmCache = new Map<string, CharmMeasurement>();

export function measureCharm(glbPath: string): Promise<CharmMeasurement> {
  const key = `${glbPath}::${CHARM_ROTATION.join(",")}`;
  if (charmCache.has(key)) return Promise.resolve(charmCache.get(key)!);

  return new Promise((resolve, reject) => {
    loader.load(glbPath, (gltf) => {
      const rawBox = new THREE.Box3().setFromObject(gltf.scene);
      const center = rawBox.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.add(gltf.scene);
      wrapper.rotation.set(...CHARM_ROTATION);
      wrapper.updateMatrixWorld(true);

      const rotBox = new THREE.Box3().setFromObject(wrapper);
      const rotSize = rotBox.getSize(new THREE.Vector3());
      const result: CharmMeasurement = {
        diameter:   Math.max(rotSize.x, rotSize.z),
        hangOffset: -rotBox.max.y,
        hangLength: Math.abs(rotBox.min.y),
      };
      charmCache.set(key, result);
      resolve(result);
    }, undefined, reject);
  });
}

export async function measureAllCharms(
  glbPaths: string[]
): Promise<Map<string, CharmMeasurement>> {
  await Promise.all(glbPaths.map(measureCharm));
  const out = new Map<string, CharmMeasurement>();
  for (const p of glbPaths) {
    const m = await measureCharm(p);
    out.set(p, m);
  }
  return out;
}

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
