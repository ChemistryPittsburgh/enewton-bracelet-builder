# eNewton Bracelet Builder

An internal design tool for building, saving, reviewing, and publishing eNewton bracelet designs. Designers compose bracelets from a bead/charm catalog in an interactive 3D scene, then save and route designs through a review → approve → publish workflow.

---

## Setup

```bash
npm install
npm run dev
# → http://localhost:3000
```

Copy `.env.example` to `.env` and fill in all required values before running.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of the backend API (e.g. `https://api.example.com`) |
| `ENEWTON_AWS_ACCESS_KEY_ID` | Yes | AWS credentials for thumbnail S3 uploads |
| `ENEWTON_AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials for thumbnail S3 uploads |
| `ENEWTON_AWS_REGION` | Yes | AWS region for the S3 bucket |
| `S3_BUCKET_NAME` | Yes | S3 bucket name where thumbnails are stored |
| `S3_PUBLIC_URL` | No | CloudFront or custom CDN base URL (falls back to direct S3 URL) |

---

## Authentication

The app uses token-based auth. On first visit, users are redirected to `/login` and prompted for an API access token. The token is validated against `GET /me` and stored in `localStorage` (`enewton-token`). All API requests include it as a `Bearer` header.

---

## Deploying to Netlify Test Environment

1. On `main` branch, run `npm run build`
2. Fix any linting errors and recommit
3. Once the build succeeds, push to `main`

Netlify automatically deploys to: `https://enewton-bracelet-builder-test.netlify.app/`

---

## How It Works

```
app/(protected)/page.tsx  ← Entry point (auth-gated)
     ↓
BuilderLayout             ← Root layout: header, panels, scene, dialogs
     │
     ├── Scene                      ← R3F Canvas, lighting, camera controls
     │    ├── BraceletCord          ← Procedural torus cord mesh (wire / cord / elastic)
     │    ├── AllBeads              ← Maps store bead list → BeadOnBracelet instances
     │    │    └── BeadOnBracelet   ← Loads one GLB, positions + rotates on the cord
     │    ├── CameraController      ← Zoom to selected bead; zoom out on deselect
     │    └── CameraOffset          ← Shifts camera FOV when side panels are open
     │
     ├── BeadSelectorPanel          ← Slide-in left panel; bead catalog with search + filters
     ├── BeadInfoDialog             ← Floating dialog on bead tap: info, duplicate, remove, select-all
     ├── BandSelector               ← Wire / Cord / Elastic + bracelet size toggles
     ├── CanvasToolbar              ← Top toolbar: 3D ↔ Line view toggle + Edit mode button
     ├── CanvasWorkflowBar          ← Status badge + Submit / Approve / Reject / Publish actions
     ├── CanvasStatsBar             ← Arc used / remaining / bead count readout
     ├── EditModeToolbar            ← Floating toolbar in edit mode: move, duplicate, reverse, delete, camera
     │
     ├── SavedDesignsPanel          ← Full-screen slide-in: browse, filter, sort, load saved designs
     ├── BraceletDetailsDialog      ← Per-design metadata sheet (name, description, config summary)
     ├── ConfirmReplaceDialog       ← "Replace current bracelet?" confirmation gate
     ├── UserPanel                  ← User profile + permission-filtered design queues
     │
     ├── BraceletImporter           ← Import bracelet from local JSON file
     └── BraceletExporter           ← Save (POST) or Update (PUT) bracelet; JSON download fallback
```

---

## State Management

Global state lives in `lib/store.ts` (Zustand, persisted to `localStorage` as `enewton-beads` v2).

**Persisted across page reloads:** placed beads, bracelet name, description, band material, bracelet size.

**Ephemeral (session only):** selected bead, edit mode, view mode, drag state, active design ID, pending design, canvas element reference, bead load errors.

Server data (bead catalog, saved designs, current user) is managed by **TanStack React Query** with shared cache entries — multiple components can subscribe to the same data without extra network requests.

---

## Design Workflow (Status Lifecycle)

Designs move through the following states:

```
draft → in_review → approved → published
  ↑          |
  └──── rejected (back to draft)
```

Additional statuses: `design_concept`, `discontinued`.

| Status | Who can advance it |
|---|---|
| `draft` → `in_review` | `is_bracelet_editor` (Submit for Review) |
| `in_review` → `approved` | `is_reviewer` (Approve) |
| `in_review` → `draft` | `is_reviewer` (Reject) |
| `approved` → `published` | `is_publisher` (Publish — requires Shopify SKU) |

---

## Canvas Views

| View | Description |
|---|---|
| **3D** | Default circular bracelet layout on a torus in the XZ plane |
| **Line** | Beads laid out linearly along the X axis — useful for bead ordering |

**Edit Mode** (pencil icon): enables drag-to-reorder beads directly on the canvas. Double-click a bead to select it for toolbar operations (move, duplicate, delete). A blue canvas background indicates edit mode is active.

---

## Thumbnail Generation

When a design is saved or updated, a thumbnail is captured automatically:

1. The R3F canvas (`preserveDrawingBuffer: true`) is scanned pixel-by-pixel to find the bracelet's bounding box.
2. The content is cropped, padded, and scaled into a `600 × 600` PNG.
3. The PNG is uploaded to S3 via `POST /api/thumbnail` (Next.js route → AWS SDK).
4. The returned S3 URL is stored in the design record as `preview_image_url`.

Thumbnails are only re-generated when the visual content actually changes (different beads, size, or material). Name/description-only edits reuse the existing thumbnail.

---

## Key Files

| File | Purpose |
|---|---|
| `lib/bead-layout.ts` | All bracelet geometry — radius, spacing, bead position/rotation, arc maths |
| `lib/store.ts` | Zustand store — placed beads, UI state, all bead actions |
| `lib/constants.ts` | Scene, camera, cord material, bracelet size, and charm constants |
| `lib/build-bracelet-config.ts` | Derives `BraceletConfiguration` from store state for API payloads |
| `lib/import-bracelet.ts` | Parses exported bracelet JSON files back into `PlacedBead[]` |
| `lib/auth.ts` | Token read/write helpers (`localStorage`) |
| `lib/api.ts` | Authenticated `apiFetch` wrapper; throws `ApiError` on failure |
| `components/scene/BeadOnBracelet.tsx` | Loads one bead/charm GLB, positions on cord, handles selection + drag |
| `components/scene/Scene.tsx` | R3F Canvas setup, lighting, camera config |
| `components/builder/BuilderLayout.tsx` | Root layout orchestrator |
| `components/builder/SavedDesignsPanel.tsx` | Saved designs browser (filter, sort, load) |
| `components/builder/UserPanel.tsx` | User profile + permission-aware design queues |
| `hooks/useBeads.ts` | Fetches + normalises bead catalog from API |
| `hooks/useDesigns.ts` | Fetches all designs; client-side filter + sort via React Query `select` |
| `hooks/useSaveBracelet.ts` | Thumbnail capture → S3 upload → POST /designs |
| `hooks/useUpdateBracelet.ts` | Smart update — skips thumbnail re-upload if bracelet unchanged |
| `hooks/useGenerateThumbnail.ts` | Pixel-scan crop + fixed 600×600 PNG capture |
| `types/index.ts` | All shared TypeScript types |

---

## Adding a New Bead or Charm

1. Drop the GLB into `/public/models/beads/` (beads) or `/public/models/charms/<Name>/` (charms).
2. Add the product via the API / backend — it will appear in the bead catalog automatically.
3. For **charms**, the following fields on `BeadProduct` control placement:
   - `bail_width_mm` — wire diameter of the bail (used to thread the cord correctly)
   - `body_width_mm` — width of the charm body (used for arc spacing between adjacent charms)
   - `depth_offset` — Z offset to push the charm forward from the cord (default `-0.0005`)

---

## GLB Conventions

**Beads:** hole on the **Y axis**. `getBeadRotation()` in `bead-layout.ts` handles orientation with `[π/2, -θ, 0]`.

**Charms:** pivot/origin at the **bail top**, Y-up, face toward +Z. The `CHARM_ROTATION` constant in `lib/constants.ts` (`[π/2, 0, π/1.8]`) orients the charm hanging from the cord. `autoHangOffset` is computed at runtime from the post-rotation bounding box so the cord threads through the bail opening correctly.

If a future GLB has its hole or bail on a non-standard axis, add a per-product rotation override in `BeadOnBracelet.tsx`.

---

## Bracelet Sizing

Sizes are derived from wrist circumference in inches:

| Size | Circumference | Cord radius |
|---|---|---|
| x-small | 5.5" | ≈ 22.2 mm |
| small | 6.25" | ≈ 25.3 mm |
| large | 7.25" | ≈ 29.3 mm |

All sizing constants live in `lib/constants.ts` (`BRACELET_SIZE_RADIUS`). Arc capacity is derived automatically from the radius.

---

## Tuning the Layout

All spacing constants live in `lib/bead-layout.ts`:

```ts
BRACELET_RADIUS = 0.029   // 29 mm — default large size cord radius
CORD_RADIUS     = 0.0008  // cord tube radius (affects bail threading)
BEAD_SPACING    = -0.00035 // negative = beads closer together; 0 = just touching
```

Adjust `BRACELET_SIZE_RADIUS` in `lib/constants.ts` for per-size tuning. Arc capacity (`MAX_BEADS`) is derived automatically.