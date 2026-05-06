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
    beadType: "Dignity",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb",
    diameter: 0.004,
    sku: "000888884444",
  },
  {
    id: "dignity-5mm",
    name: "Dignity 5mm",
    beadType: "Dignity",
    glbPath: "/models/beads/Dignity_5mm_Hole_v01.glb",
    diameter: 0.005,
    sku: "11112222233344",
  },
  {
    id: "dignity-6mm",
    name: "Dignity 6mm",
    beadType: "Dignity",
    glbPath: "/models/beads/Dignity_6mm_Hole_v01.glb",
    diameter: 0.006,
    sku: "222233334444"
  },
  {
    id: "test-gold",
    name: "Placeholder Gold Bead",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "00000",
  },
];

export default function HomePage() {
  return <BuilderLayout beads={BEADS} />;
}
