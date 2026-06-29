import { Color, MeshStandardMaterial, type Material } from "three";

/**
 * withEmissive — return a clone of `mat` with an emissive glow applied, used to
 * tint an item while it's hovered. Falls back to the original material if it
 * isn't a standard material. Cloning keeps shared base materials from being
 * mutated across instances (hovering one item can't tint another).
 */
export function withEmissive(mat: Material, color: string, intensity: number): Material {
  if (!(mat instanceof MeshStandardMaterial)) return mat;
  const m = mat.clone();
  m.emissive = new Color(color);
  m.emissiveIntensity = intensity;
  return m;
}