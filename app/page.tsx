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
    name: "TEST Bead 1",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "00000",
  },
  {
    id: "test-gold2",
    name: "TEST Bead 2",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "111111",
  },
  {
    id: "test-gold3",
    name: "TEST Bead 3",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "2222222",
  },
  {
    id: "test-gold4",
    name: "TEST Bead 4",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "3333333",
  },
  {
    id: "test-gold5",
    name: "TEST Bead 5",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "44444444",
  },
  {
    id: "test-gold6",
    name: "TEST Bead 6",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "star",
    diameter: 0.005,
    sku: "5555555",
  },
  {
    id: "test-gold7",
    name: "TEST Bead 7",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "star",
    diameter: 0.005,
    sku: "66666666",
  },
  {
    id: "test-gold8",
    name: "TEST Bead 8",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "star",
    diameter: 0.005,
    sku: "77777777",
  },
  {
    id: "test-gold9",
    name: "TEST Bead 9",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "star",
    diameter: 0.005,
    sku: "88888",
  },
  {
    id: "test-gold10",
    name: "TEST Bead 10",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "999999",
  },
  {
    id: "test-gold11",
    name: "TEST Bead 11",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "1010101010",
  },
  {
    id: "test-gold12",
    name: "TEST Bead 12",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "11111",
  },
  {
    id: "test-gold13",
    name: "TEST Bead 13",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "121212121",
  },
  {
    id: "test-gold14",
    name: "TEST Bead 14",
    glbPath: "/models/beads/Dignity_4mm_Hole_v01.glb", 
    beadType: "gold",
    diameter: 0.005,
    sku: "13131313",
  },
];

export default function HomePage() {
  return <BuilderLayout beads={BEADS} />;
}
