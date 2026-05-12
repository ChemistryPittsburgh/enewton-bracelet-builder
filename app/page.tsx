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
    glbPath: "/models/beads/Dignity_4mm.glb",
    diameter: 0.004,
    sku: "000888884444",
    beadCategory: "bead",
    material: "gold",
    sizeMm: 4,
  },
  {
    id: "dignity-5mm",
    name: "Dignity 5mm",
    beadType: "Dignity",
    glbPath: "/models/beads/Dignity_5mm.glb",
    diameter: 0.005,
    sku: "11112222233344",
    beadCategory: "bead",
    material: "gold",
    sizeMm: 5,
  },
  {
    id: "dignity-6mm",
    name: "Dignity 6mm",
    beadType: "Dignity",
    glbPath: "/models/beads/Dignity_6mm.glb",
    diameter: 0.006,
    sku: "222233334444",
    beadCategory: "bead",
    material: "gold",
    sizeMm: 6,
  },
  {
    id: "test",
    name: "Test",
    glbPath: "/models/beads/Dignity_4mm.glb", 
    beadType: "Test",
    diameter: 0.004,
    sku: "00000",
    beadCategory: "bead",
    material: "silver",
    sizeMm: 4,
  },
  {
    id: "admire-6mm",
    name: "Admire 6mm",
    glbPath: "/models/beads/Admire_6mm.glb", 
    beadType: "Admire",
    diameter: 0.006,
    sku: "00000",
    beadCategory: "bead",
    material: "gold",
    sizeMm: 6,
  },
  {
    id: "admire-8mm",
    name: "Admire 8mm",
    glbPath: "/models/beads/Admire_8mm.glb", 
    beadType: "Admire",
    beadMaterial: "metal",
    diameter: 0.08,
    sku: "30439039503",
    beadCategory: "bead",
    material: "gold",
    sizeMm: 8,
  },
  {
    id: "honesty-6mm",
    name: "Honesty 6mm",
    glbPath: "/models/beads/Honesty_6mm.glb", 
    beadType: "Honesty",
    diameter: 0.006,
    sku: "30439039503",
    beadCategory: "bead",
    material: "gold",
    sizeMm: 6,
  },
  {
    id: "honesty-10mm",
    name: "Honesty 10mm",
    glbPath: "/models/beads/Honesty_10mm.glb", 
    beadType: "Honesty",
    diameter: 0.010,
    sku: "4080838287",
    beadCategory: "bead",
    material: "metal",
    sizeMm: 10,
  },
  {
    id: "harmony",
    name: "Harmony",
    glbPath: "/models/beads/Harmony.glb", 
    beadType: "Harmony",
    diameter: 0.005,
    sku: "4080838287",
    beadCategory: "tube",
    material: "gold",
    sizeMm: 5,
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
