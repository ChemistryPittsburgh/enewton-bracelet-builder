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
    beadType: "bead",
    beadCategory: "Dignity",
    beadMaterial: "gold",
    glbPath: "/models/beads/Dignity_4mm.glb",
    diameter: 0.004,
    sku: "000888884444",
  },
  {
    id: "dignity-5mm",
    name: "Dignity 5mm",
    beadType: "bead",
    beadCategory: "Dignity",
    beadMaterial: "gold",
    glbPath: "/models/beads/Dignity_5mm.glb",
    diameter: 0.005,
    sku: "11112222233344",
  },
  {
    id: "dignity-6mm",
    name: "Dignity 6mm",
    beadType: "bead",
    beadCategory: "Dignity",
    beadMaterial: "gold",
    glbPath: "/models/beads/Dignity_6mm.glb",
    diameter: 0.006,
    sku: "222233334444"
  },
  {
    id: "test",
    name: "Test",
    glbPath: "/models/beads/Dignity_4mm.glb", 
    beadType: "bead",
    beadCategory: "Test",
    beadMaterial: "silver",
    diameter: 0.005,
    sku: "00000",
  },
  {
    id: "admire-6mm",
    name: "Admire 6mm",
    glbPath: "/models/beads/Admire_6mm.glb", 
    beadType: "bead",
    beadCategory: "Admire",
    beadMaterial: "metal",
    diameter: 0.006,
    sku: "00000",
  },
  {
    id: "admire-8mm",
    name: "Admire 8mm",
    glbPath: "/models/beads/Admire_8mm.glb", 
    beadType: "bead",
    beadCategory: "Admire",
    beadMaterial: "metal",
    diameter: 0.010,
    sku: "30439039503",
  },
  {
    id: "honesty-6mm",
    name: "Honesty 6mm",
    glbPath: "/models/beads/Honesty_6mm.glb", 
    beadType: "bead",
    beadCategory: "Honesty",
    beadMaterial: "metal",
    diameter: 0.006,
    sku: "30439039503",
  },
  {
    id: "honesty-10mm",
    name: "Honesty 10mm",
    glbPath: "/models/beads/Honesty_10mm.glb", 
    beadType: "bead",
    beadCategory: "Honesty",
    beadMaterial: "metal",
    diameter: 0.010,
    sku: "4080838287",
  },
  {
    id: "harmony",
    name: "Harmony",
    glbPath: "/models/beads/Harmony.glb", 
    beadType: "bead",
    beadCategory: "Harmony",
    beadMaterial: "metal",
    diameter: 0.004,
    sku: "4080838287",
  },
  // {
  //   id: "blessed-disc",
  //   name: "Blessed Disc",
  //   glbPath: "/models/beads/Blessed_Disc.glb", 
  //   beadType: "charm",
  //   beadCategory: "Blessed",
  //   beadMaterial: "silver",
  //   diameter: 0.005,
  //   sku: "00000",
  // },
];

export default function HomePage() {
  return <BuilderLayout beads={BEADS} />;
}
