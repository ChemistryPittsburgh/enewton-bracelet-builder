import fs from "fs";
import path from "path";
import type { BeadProduct } from "@/types";

function getThumbnailPaths(): Record<string, string> {
  const dir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(dir)) return {};

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith("-thumbnail.png"))
    .reduce((acc, file) => {
      const id = file.replace("-thumbnail.png", "");
      acc[id] = `/images/${file}`;
      return acc;
    }, {} as Record<string, string>);
}

const thumbnails = getThumbnailPaths();

const BEADS_RAW: BeadProduct[] = [
  {
    id: "dignity-4mm",
    name: "Dignity 4mm",
    beadType: "Dignity",
    glbPath: "/models/beads/Dignity/Dignity_4mm.glb",
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
    glbPath: "/models/beads/Dignity/Dignity_5mm.glb",
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
    glbPath: "/models/beads/Dignity/Dignity_6mm.glb",
    diameter: 0.006,
    sku: "222233334444",
    beadCategory: "bead",
    material: "gold",
    sizeMm: 6,
  },
  {
    id: "admire-6mm",
    name: "Admire 6mm",
    glbPath: "/models/beads/Admire/Admire_6mm.glb",
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
    glbPath: "/models/beads/Admire/Admire_8mm.glb",
    beadType: "Admire",
    diameter: 0.008,
    sku: "30439039503",
    beadCategory: "bead",
    material: "gold",
    sizeMm: 8,
  },
  {
    id: "honesty-6mm",
    name: "Honesty 6mm",
    glbPath: "/models/beads/Honesty/Honesty_6mm.glb",
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
    glbPath: "/models/beads/Honesty/Honesty_10mm.glb",
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

  // ── Charms ──────────────────────────────────────────────────────────────────
  {
    id: "blessed-disc",
    name: "Blessed Disc",
    glbPath: "/models/charms/Blessed/Blessed_Disc.glb",
    beadType: "Blessed",
    diameter: 0.012,
    sku: "",
    beadCategory: "charm",
    material: "gold",
    sizeMm: 12,
  },
  {
    id: "blessed-disc-small",
    name: "Blessed Disc Small",
    glbPath: "/models/charms/Blessed/Blessed_Disc_Small.glb",
    beadType: "Blessed Small",
    diameter: 0.008,
    sku: "",
    beadCategory: "charm",
    material: "gold",
    sizeMm: 8,
  },
  {
    id: "classic-charm-10mm",
    name: "Classic Charm 10mm",
    glbPath: "/models/charms/Classic/Classic_Charm_10mm.glb",
    beadType: "Classic",
    diameter: 0.012,
    sku: "",
    beadCategory: "charm",
    material: "gold",
    sizeMm: 10,
  },
  {
    id: "classic-charm-8mm",
    name: "Classic 8mm",
    glbPath: "/models/charms/Classic/Classic_Charm_8mm.glb",
    beadType: "Classic Charm",
    diameter: 0.0082,
    sku: "",
    beadCategory: "charm",
    material: "gold",
    sizeMm: 8,
  },
  {
    id: "inspire-charm-large",
    name: "Inspire",
    glbPath: "/models/charms/Inspire/Inspire_Charm.glb",
    beadType: "Inspire Charm",
    diameter: 0.012,
    sku: "",
    beadCategory: "charm",
    material: "gold",
    sizeMm: 12,
  },
  {
    id: "inspire-charm-small",
    name: "Inspire Small",
    glbPath: "/models/charms/Inspire/Inspire_Charm_Small.glb",
    beadType: "Inspire Charm",
    diameter: 0.008,
    sku: "",
    beadCategory: "charm",
    material: "gold",
    sizeMm: 8,
  },
];

export const BEADS: BeadProduct[] = BEADS_RAW.map((b) => ({
  ...b,
  thumbnailPath: thumbnails[b.id.toLowerCase()],
}));