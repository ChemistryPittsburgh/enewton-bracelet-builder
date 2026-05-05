# eNewton Bracelet Builder — Beads Prototype

Single-bracelet bead builder. A static cord sits in the scene; selecting a bead adds it to the next available slot around the cord. Click a bead in the 3D view to remove it.

---

## Setup

```bash
npm install
npm run dev
# → http://localhost:3000
```

The two Dignity 4mm GLBs are already in `/public/models/`. No env vars needed.

---

## Deploying to Netlify Test Enviroment

Checkout production branch
Run:
```bash
npm run build
```
Push production branch

Netlify automatically pushes to test enviroment located here: `https://enewton-bracelet-builder-test.netlify.app/`

---

## How it works

```
app/page.tsx        ← Bead catalog (add new GLBs here)
     ↓
BuilderLayout       ← Header + 3D scene + BeadPicker
     ├── Scene      ← R3F Canvas, lighting, orbit controls
     │    ├── BraceletCord   ← Procedural torus (the cord)
     │    └── AllBeads       ← One BeadOnBracelet per placed bead
     └── BeadPicker          ← Tap to add; tap in scene to remove
```

**State** lives in `lib/store.ts` (Zustand, persisted to localStorage).  
**Geometry** lives in `lib/bead-layout.ts` — all the position/rotation math.

---

## Adding a new bead / GLB

1. Drop the GLB into `/public/models/`
2. Add a `useGLTF.preload()` call in `BeadOnBracelet.tsx`
3. Add an entry to the `BEADS` array in `app/page.tsx`:

```ts
{
  id: "my-new-bead",
  name: "New Bead Name",
  glbPath: "/models/MyBead_v01.glb",
  diameter: 0.00421, // measure from GLB bounding box X extent
},
```

---

## Key files

| File | Purpose |
|---|---|
| `lib/bead-layout.ts` | All bracelet geometry — radius, spacing, bead position/rotation |
| `lib/store.ts` | Zustand store — add, remove, clear beads |
| `components/scene/BraceletCord.tsx` | Procedural torus cord (swap for real GLB later) |
| `components/scene/BeadOnBracelet.tsx` | Loads one bead GLB, positions + rotates it on the cord |
| `components/scene/AllBeads.tsx` | Maps the store's bead list into BeadOnBracelet instances |
| `app/page.tsx` | Bead catalog — the source of truth for available beads |

---

## Tuning the layout

All spacing constants are in `lib/bead-layout.ts`:

```ts
BRACELET_RADIUS = 0.029  // 29 mm — make larger for bigger bracelet
CORD_RADIUS     = 0.0008 // cord tube thickness
BEAD_DIAMETER   = 0.00421
BEAD_GAP        = 0.00015 // gap between beads
```

Adjust `BRACELET_RADIUS` first — it changes the circumference and therefore how many beads fit (`MAX_BEADS` is derived automatically).

---

## Bead orientation note

The Dignity GLBs have their hole along the local **Y axis** (confirmed: Y extent = 3.72 mm vs. XZ = 4.21 mm). `getBeadRotation()` in `bead-layout.ts` handles this with `[π/2, -θ, 0]`. If a future bead has its hole on a different axis, override the rotation in `BeadOnBracelet.tsx` for that specific GLB.
