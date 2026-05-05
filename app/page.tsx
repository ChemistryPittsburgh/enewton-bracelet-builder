import { BuilderLayout } from "@/components/builder/BuilderLayout";
import { useGLTF } from "@react-three/drei";
import type { BeadProduct } from "@/types";


/**
 * Bead catalog. Add new entries here as the freelancer delivers more GLBs.
 * diameter is in metres — measured from the GLB bounding box.
 */
const BEADS: BeadProduct[] = [
  {
    id: "dignity-4mm",
    name: "Dignity 4mm",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb",
    diameter: 0.004,
  },
  {
    id: "dignity-5mm",
    name: "Dignity 5mm",
    glbPath: "/models/beads/Dignity_5mm_Hole_v01.glb",
    diameter: 0.005,
  },
  {
    id: "dignity-6mm",
    name: "Dignity 6mm",
    glbPath: "/models/beads/Dignity_6mm_Hole_v01.glb",
    diameter: 0.006,
  },
];

export default function HomePage() {
  return <BuilderLayout beads={BEADS} />;
}
