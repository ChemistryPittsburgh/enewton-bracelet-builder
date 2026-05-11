# eNewton Bracelet Builder — Beads Prototype

Single-bracelet bead builder with static cord. Click the corresponding bead button to add it to the bracelet.

Click the bead on the bracelet to open Info Panel to Learn More.



---

## Setup

```bash
npm install
npm run dev
# → http://localhost:3000
```

Bead models are located inside `/public/models/beads/`. 

***No env vars currently needed until Shopify hookup.***

---

## Deploying to Netlify Test Enviroment

1. On `main` branch, run `npm run build`
2. Fix any linting errors + recommit 
3. Once `main` npm build ran successfully, push to production

Netlify automatically pushes to test enviroment located here: `https://enewton-bracelet-builder-test.netlify.app/`

---

## How it works

```
app/page.tsx        ← Bead catalog (add new GLBs here)
     ↓
BuilderLayout       ← Layout of app 
     ├── Scene                     ← R3F Canvas, lighting, orbit controls
     │    ├── BraceletCord         ← Procedural cord/bracelet base ***TEMP***
     │    ├── AllBeads             ← One BeadOnBracelet per placed bead
     │    └── CameraController     ← Sets Camera zoom and angle, adjusted when bracelet is interacted with
     │
     ├── ui                       
     │    ├── Button               ← Button w/ variants: primary, secondary, ghost, danger, black
     │    └──  Panel               ← Panel w/ options for direction, 
     │
     ├── BeadPickerHeader     ← Header above picker w/ Bracelet name + tab for bead sorting drawer
     ├── BeadPicker           ← Button to add bead; tap bead to open BeadInfoPanel
     ├── BeadInfoPanel        ← Panel that contains bead meta info + remove bead button
     ├── BeadReorderPanel     ← Panel to reorder beads ***TEMP***
     ├── BraceletImporter     ← Imports JSON bracelet to replace current one
     └── BraceletPanel        ← Panel for all bracelet settings - name + export

```

**State** ***TEMP*** lives in `lib/store.ts` (persisted to localStorage).  
**Geometry** lives in `lib/bead-layout.ts` — all the position/rotation math.

---

## Adding a new bead / GLB

1. Drop the GLB into `/public/models/beads/`
3. Add an entry to the `BEADS` array in `app/page.tsx`:

```ts
{
  id: "my-new-bead",
  name: "New Bead Name",
  glbPath: "/models/bead/MyBead_v01.glb",
  diameter: 0.005, // measure from GLB bounding box X extent
  beadCategory: "gold", // category name, ex. Dignity 
  beadMaterial: "gold", // material/metal
  beadType: "bead", // charm or bead
  diameter: 0.005,
  sku: "44444444",
},
```

---

## Key files

| File | Purpose |
|---|---|
| `lib/bead-layout.ts` | All bracelet geometry — radius, spacing, bead position/rotation |
| `lib/store.ts` | localStorage **FOR NOW** add, remove, clear beads |
| `components/scene/BraceletCord.tsx` | Bracelet cord **(SWAP FOR GLB?)** |
| `components/scene/BeadOnBracelet.tsx` | Loads one bead GLB, positions + rotates it on the cord |
| `components/scene/AllBeads.tsx` | Maps the store's bead list into BeadOnBracelet instances |
| `app/page.tsx` | Bead catalog — the source of truth for available beads |

---

## Tuning the layout

All spacing constants are in `lib/bead-layout.ts`:

```ts
BRACELET_RADIUS = 0.029  // 29 mm — make larger for bigger bracelet
CORD_RADIUS     = 0.0008 // cord tube thickness
BEAD_DIAMETER  // pulled from page.tsx value
BEAD_SPACING        = -0.00035 // negative value pulls beads closer together
```

Adjust `BRACELET_RADIUS` first — it changes the circumference and therefore how many beads fit (`MAX_BEADS` is derived automatically).

---

## Bead orientation note

All GLB files should have the hole on the **Y axis**. `getBeadRotation()` in `bead-layout.ts` handles this with `[π/2, -θ, 0]`. 

If a future bead has its hole on a different axis, override the rotation in `BeadOnBracelet.tsx` for that specific GLB.
