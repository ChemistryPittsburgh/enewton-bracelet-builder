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
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of the backend API (e.g. `https://enewtonbuilder.chemistry.digital`) |
| `NEXT_PUBLIC_TOKEN_KEY` | Yes | localStorage key name for auth tokens (e.g. `enewton-token`) |
| `ENEWTON_AWS_ACCESS_KEY_ID` | Yes | AWS credentials for S3 uploads (models + thumbnails) |
| `ENEWTON_AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials for S3 uploads |
| `ENEWTON_AWS_REGION` | Yes | AWS region for the S3 bucket |
| `S3_BUCKET_NAME` | Yes | S3 bucket name where GLB models and thumbnails are stored |
| `S3_PUBLIC_URL` | No | CloudFront or custom CDN base URL (falls back to direct S3 URL) |

---

## Authentication

The app uses an **email OTP (one-time password)** flow:

1. User enters their email on `/login`.
2. The app calls `POST /auth/login` with the email; the backend sends a 6-digit code.
3. User enters the code; the app calls `POST /auth/verify` with `{ email, code, remember }`.
4. On success, the returned JWT token is stored in `localStorage` (key configured via `NEXT_PUBLIC_TOKEN_KEY`).
5. All subsequent API requests include the token as a `Bearer` header via `apiFetch`.
6. The `(protected)` route group checks for a valid token on mount and redirects to `/login` if absent.

---

## Deploying to Netlify Test Environment

1. On `main` branch, run `npm run build`
2. Fix any linting errors and recommit
3. Once the build succeeds, push to `main`

Netlify automatically deploys to: `https://enewton-bracelet-builder-test.netlify.app/`

**Netlify-specific notes:**
- AWS reserved env variable names (`AWS_ACCESS_KEY_ID`, etc.) conflict with Netlify; use the `ENEWTON_AWS_*` prefix.
- Netlify "secret" variables are runtime-only and cannot be read during Next.js build; use "Sensitive" for build-time variables.

---

## How It Works

```
app/(protected)/page.tsx  ← Entry point (auth-gated)
     ↓
BuilderLayout             ← Root layout: header, panels, scene, dialogs
     │
     ├── Scene                          ← R3F Canvas, lighting, camera controls
     │    ├── BraceletCord              ← Procedural torus/cylinder cord mesh (wire / cord / elastic)
     │    ├── AllBeads                  ← Maps store bead list → BeadOnBracelet + SpacerOnBracelet instances
     │    │    ├── BeadOnBracelet       ← Loads one GLB, positions + rotates on the cord, material finish presets
     │    │    └── SpacerOnBracelet     ← Procedural translucent cylinder, no GLB, visible only in draft/rejected
     │    ├── CameraController          ← Zoom to selected bead; zoom out on deselect; edit/line mode positioning
     │    └── CameraOffset              ← Shifts camera FOV when side panels are open
     │
     ├── canvas/
     │    ├── BandSelector              ← Wire / Cord / Elastic + bracelet size toggles (FloatingDialog)
     │    ├── CanvasToolbar             ← Top bar: workflow actions (left), 3D ↔ Line toggle (centre), Edit + Comments (right)
     │    ├── CanvasWorkflowBar         ← Compact status badge on the canvas overlay
     │    ├── CanvasStatsBar            ← Arc used / remaining / bead + charm count readout
     │    ├── EditModeToolbar           ← Floating toolbar: move, duplicate, reverse, delete, camera toggle
     │    └── BraceletExporter          ← Save (POST) or Update (PUT) bracelet with inline name popover
     │
     ├── panels/
     │    ├── BeadSelectorPanel         ← Slide-in left panel; bead catalog with search + category filters
     │    └── CommentsPanel             ← Slide-in right panel; per-design comment thread (add/edit/delete)
     │
     ├── dialogs/
     │    ├── BraceletDetailsDialog     ← Full metadata sheet: name, description, config, bead list, history timeline
     │    ├── BeadInfoDialog            ← Floating dialog on bead tap: info, select all, remove
     │    ├── ConfirmReplaceDialog      ← "Replace current bracelet?" confirmation with save-and-load flow
     │    ├── DeleteBraceletDialog      ← Hard-delete confirmation (admin only, uses StandardConfirmDialog)
     │    ├── DiscontinueBraceletDialog ← Discontinue confirmation (admin only, uses StandardConfirmDialog)
     │    ├── RejectBraceletDialog      ← Rejection with reason textarea
     │    ├── ManageBeadsDialog         ← Admin CRUD for bead/charm catalog with R3F preview + GLB upload
     │    ├── ManageTagsDialog          ← Admin CRUD for tags (name + color)
     │    └── ManageCollectionsDialog   ← Admin CRUD for collections
     │
     ├── sections/
     │    ├── WorkflowSection           ← Status pipeline stepper, SKU input, all action buttons
     │    └── AssignmentSection         ← Reusable many-to-many chip manager for tags and collections
     │
     ├── saved-designs/
     │    ├── SavedDesignsScreen        ← Full-screen slide-in: browse, filter, sort, load saved designs
     │    ├── DesignCard                ← Individual design card with status badge, thumbnail, three-dot menu
     │    └── Pickers.tsx               ← TagPicker + CollectionPicker (shared useDropdown)
     │
     └── users/
          ├── UserScreen                ← User profile + permission-filtered design queues (review/publish)
          ├── UsersAdminScreen          ← Admin: list, create (token + OTP), edit, and deactivate users
          ├── CreateUserDialog          ← Token-based user creation (returns one-time plaintext token)
          ├── CreateOtpUserDialog       ← OTP user creation (sends welcome email with login link)
          └── PermissionsDropdown       ← Multi-select permissions editor for admin screens
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **3D Rendering** | React Three Fiber, `@react-three/drei`, `camera-controls` |
| **State** | Zustand (persisted to localStorage), TanStack React Query |
| **Styling** | Tailwind CSS v4, custom design tokens |
| **Language** | TypeScript (strict mode) |
| **Backend** | PHP / MySQL REST API |
| **Infrastructure** | AWS S3 (GLB models + thumbnails), Netlify (frontend) |
| **Dev Tools** | TablePlus, phpMyAdmin, MAMP (local PHP/MySQL) |

---

## State Management

Global state lives in `lib/store.ts` (Zustand, persisted to `localStorage` as `enewton-beads` v3).

**Persisted across page reloads:** placed beads, bracelet name, description, band material, bracelet size, active design ID.

**Ephemeral (session only):** selected bead, edit mode, edit view mode, view mode, drag state, pending design, canvas element reference, camera controls reference, bead load errors, spacers-hidden-for-capture flag.

**`isDirty` flag:** set by every content mutation (add bead, rename, reorder, etc.) and cleared on load or save. Used to gate confirmation dialogs when the user tries to load a different design over unsaved work. The `useIsDirty` hook provides a more accurate computed dirty check by comparing store state against the React Query cache for the active design.

**`pendingDesign`:** when the user confirms replacing the canvas, the incoming design is stored here and loaded after the confirmation dialog resolves, triggering the originating panel to close via `pendingDesignOnLoad`.

Server data (bead catalog, saved designs, tags, collections, current user) is managed by **TanStack React Query** with shared cache entries — multiple components can subscribe to the same data without extra network requests.

---

## Design Workflow (Status Lifecycle)

Designs move through the following states:

```
draft → in_review → approved → published
  ↑          |
  └──── rejected (back to draft)
```

Additional status: `discontinued` (derived UI state — `is_discontinued === 1`; the DB status column remains `published`).

| Status | Who can advance it |
|---|---|
| `draft` → `in_review` | `is_bracelet_editor` (Submit for Review — auto-saves first) |
| `in_review` → `approved` | `is_reviewer` (Approve) |
| `in_review` → `rejected` | `is_reviewer` (Reject — with optional reason) |
| `in_review` → `draft` | `is_bracelet_editor` (Return to Drafts) |
| `approved` → `published` | `is_publisher` (Publish — requires Shopify SKU) |
| `approved` → `draft` | `is_bracelet_editor` (Edit Bracelet — reverts approval) |
| `published` → unpublished | `is_publisher` (Unpublish) |
| `published` → `discontinued` | `is_admin` (Discontinue) |
| `discontinued` → `published` | `is_admin` (Reactivate) |

**Rejected designs** appear alongside drafts in the "In-progress" tab with a visual flag (rose border and badge). They can be edited and resubmitted. Editing a rejected design automatically resets its status to `draft`.

Permission logic is centralised in `hooks/usePermissions.ts`. Workflow action buttons are gated through `PermissionGate` or the `can*` booleans from that hook.

---

## Canvas Views

| View | Description |
|---|---|
| **3D** | Default circular bracelet layout on a torus in the XZ plane |
| **Line** | Beads laid out linearly along the X axis — useful for bead ordering |

**Edit Mode** (pencil icon): enables drag-to-reorder beads directly on the canvas. Double-click a bead to select it for toolbar operations (move, duplicate, delete). A blue canvas background indicates edit mode is active. Edit mode supports both top-down and side camera views, toggled via the camera button.

---

## Spacer Beads

Spacers are invisible gap beads with no GLB model — they only consume arc space on the cord. They appear as translucent cylinders in the 3D scene but only in draft/rejected states. During thumbnail capture and in approved/published states, spacers are hidden but still occupy layout space.

Spacer sizes are defined in `SPACER_SIZES_MM` in `lib/constants.ts`. The `createSpacerProduct` function generates a fake `BeadProduct` with a deterministic negative ID so the same size always maps to the same "product".

---

## Tags & Collections

Both use a many-to-many relationship to bracelet designs.

**Tags** are freeform labels with an optional colour. They are created and managed via `ManageTagsDialog` (accessible from `TagPicker` if the user has `is_component_admin` or `is_admin`). Applied to a design via `AssignmentSection` inside `BraceletDetailsDialog`.

**Collections** group related designs. Same management pattern — `ManageCollectionsDialog`, `CollectionPicker`, `AssignmentSection`.

Assignment UI uses **optimistic updates** via `useOptimisticAssignment`: chips appear or disappear immediately, a spinner marks in-flight items, and the UI rolls back automatically on API error.

Filter chips in `SavedDesignsScreen` are colour-coded by category using `CATEGORY_STYLES` from `lib/category-colors.ts`. Tailwind class strings must appear in full in that file — do not construct them dynamically.

---

## Bead Administration

The `ManageBeadsDialog` (accessible from `UserScreen` for component admins) provides full CRUD for the bead/charm catalog:

- **Upload**: Drag-and-drop GLB files with client-side validation (extension, size, magic bytes) and server-side validation via `POST /api/upload-bead`. Files are stored in S3 under `models/beads/`.
- **Preview**: Live R3F preview of the uploaded GLB with orbit controls.
- **Metadata**: Name, slug (auto-generated), category, material, diameter, and charm-specific fields (bail_width_mm, body_width_mm).
- **Thumbnail**: Capture from the preview canvas and upload to S3 under `images/`.
- **Activate/Deactivate**: Soft-delete via `PUT /beads/:slug/status`. Inactive beads are hidden from the selector panel but visible in the admin list.

---

## UI Standardization & Reusable Components

### Button Component

Supports variants (`primary`, `secondary`, `ghost`, `danger`, `softDanger`, `positive`, `dashed`), sizes (`xs`, `sm`, `md`, `lg`, `icon`), and a `loading` prop for built-in spinner. Components like `StandardConfirmDialog` prefer manual `Loader2` spinners for explicit control over timing.

### StandardConfirmDialog

Reusable confirmation dialog for destructive actions. Used by `DeleteBraceletDialog` and `DiscontinueBraceletDialog`. Props: `title`, `message` (ReactNode), `icon`, `iconBgClass`, `iconColorClass`, `confirmLabel`, `confirmVariant`, `cancelLabel`, `isLoading`, `onConfirm`, `onCancel`.

### ErrorAlert

Standardized error display with `AlertCircle` icon and consistent styling (`bg-error/10`, `text-error`). Used throughout the app for validation errors, network failures, and workflow action failures.

### Other UI Primitives

- `FloatingDialog` — collapsible floating panel (e.g. BandSelector, BeadInfoDialog)
- `FullScreenDialog` — modal overlay with header, close button, and optional `headerExtra` slot
- `Panel` — slide-in side panel with fixed (overlay) and push (inline) variants
- `PermissionGate` — conditionally renders children based on permission booleans (`hide` or `disable` mode)
- `ConfirmationPanel` — inline confirmation strip for less-severe actions
- `Avatar` — circular initials badge with colour-coded current-user treatment
- `BeadThumbnail` — bead/charm image with gold-gradient fallback
- `InfoRow` — label/value pair (vertical or horizontal layout)
- `SectionHeading` — uppercase tracking heading

---

## Styling Conventions

### Color Tokens

| Token | Usage |
|---|---|
| `text-color-base` | Primary text |
| `text-color-base/70` | Secondary/muted text |
| `text-error` | Errors and warnings |
| `bg-navy` | Primary interactive |
| `bg-gold` | Approved status |
| `bg-mint` | Secondary interactive, current-user avatar |
| `bg-blush` | Soft danger (reject actions) |
| `bg-light-mint` | Positive actions |
| `bg-shell` | Collection chips, reviewer badges |
| `bg-light-blue` | Tag chips, publisher badges |
| `bg-stone` | Draft status, muted elements |

**Key Principle:** Never use dynamic Tailwind class names (e.g. `` `bg-${color}-500` ``). All color classes must be fully specified in the source code. Tailwind v4 purges unused classes at build time. Use inline `style` props with shared numeric constants for computed layout values.

---

## Thumbnail Generation

When a design is saved or updated, a thumbnail is captured automatically:

1. Spacer wireframes are temporarily hidden via `spacersHiddenForCapture`.
2. The camera is moved to the default position (if controls are available).
3. The R3F canvas (`preserveDrawingBuffer: true`) is scanned pixel-by-pixel to find the bracelet's bounding box.
4. The content is cropped, padded, and scaled into a `600 × 600` PNG.
5. The PNG is uploaded to S3 via `POST /api/thumbnail` (Next.js route → AWS SDK).
6. The returned S3 URL is stored in the design record as `preview_image_url`.

Thumbnails are only re-generated when the visual content actually changes (different beads, size, or material). Name-only or description-only edits reuse the existing thumbnail, skipping the pixel-scan and S3 upload entirely.

---

## Key Files

| File | Purpose |
|---|---|
| `lib/bead-layout.ts` | All bracelet geometry — radius, spacing, bead position/rotation, arc maths |
| `lib/store.ts` | Zustand store — placed beads, UI state, all bead actions |
| `lib/constants.ts` | Scene, camera, cord material, bracelet size, charm, and spacer constants |
| `lib/category-colors.ts` | Single source of truth for status badge styles and filter chip category colours |
| `lib/build-bracelet-config.ts` | Derives `BraceletConfiguration` from store state for API payloads |
| `lib/measure-bead.ts` | GLB bounding-box measurement, charm measurement, structural cloning |
| `lib/auth.ts` | Token read/write helpers (`localStorage`) |
| `lib/api.ts` | Authenticated `apiFetch` wrapper; throws `ApiError` on failure |
| `lib/sanitize.ts` | HTML-stripping comment sanitizer with max length |
| `lib/utils.ts` | `cn` (Tailwind merge), `slugify`, `capitalize`, `getInitials`, `formatTimestamp`, `formatDateTime` |
| `components/scene/BeadOnBracelet.tsx` | Loads one bead/charm GLB, positions on cord, handles selection + drag |
| `components/scene/SpacerOnBracelet.tsx` | Procedural spacer cylinder, hidden in non-draft states |
| `components/scene/Scene.tsx` | R3F Canvas setup, lighting, environment, camera config |
| `components/builder/BuilderLayout.tsx` | Root layout orchestrator |
| `components/builder/canvas/BraceletExporter.tsx` | Save / update bracelet; inline name popover |
| `components/builder/canvas/CanvasToolbar.tsx` | Workflow actions, view toggle, edit mode |
| `components/builder/saved-designs/SavedDesignsScreen.tsx` | Saved designs browser (filter, sort, load) |
| `components/builder/saved-designs/Pickers.tsx` | `TagPicker` + `CollectionPicker` with shared `useDropdown` |
| `components/builder/sections/WorkflowSection.tsx` | Status pipeline UI + all action buttons |
| `components/builder/sections/AssignmentSection.tsx` | Reusable optimistic chip manager for tags / collections |
| `components/builder/dialogs/ManageBeadsDialog.tsx` | Bead admin: GLB upload, preview, CRUD, thumbnail capture |
| `components/builder/users/UserScreen.tsx` | User profile + permission-aware design queues |
| `components/builder/users/UsersAdminScreen.tsx` | Admin user management |
| `hooks/Tags.ts` | `useTags`, `useCreateTag`, `useUpdateTag`, `useDeleteTag`, `useApplyTag`, `useRemoveTag` |
| `hooks/Collections.ts` | `useCollections`, `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection`, `useApplyCollection`, `useRemoveCollection` |
| `hooks/useBeadAdmin.ts` | `useAllBeads`, `useCreateBead`, `useUpdateBead`, `useToggleBeadActive`, `uploadBeadGlb`, `uploadBeadThumbnail` |
| `hooks/useOptimisticAssignment.ts` | Shared optimistic many-to-many hook (tags, collections) |
| `hooks/usePermissions.ts` | `canEdit`, `canReview`, `canPublish`, `canManageComponents`, `isAdmin`, etc. |
| `hooks/useLoadDesign.ts` | Maps a saved `Bracelet` record onto the canvas via the bead catalog cache |
| `hooks/useBeads.ts` | Fetches + normalises bead catalog from API (active beads only) |
| `hooks/useDesigns.ts` | Fetches all designs; client-side filter + sort via React Query `select` |
| `hooks/useSaveBracelet.ts` | Thumbnail capture → S3 upload → POST /designs |
| `hooks/useUpdateBracelet.ts` | Smart update — skips thumbnail re-upload if bracelet visually unchanged |
| `hooks/useIsDirty.ts` | Computed dirty check comparing store state against React Query cache |
| `hooks/useGenerateThumbnail.ts` | Pixel-scan crop + fixed 600×600 PNG capture |
| `hooks/useDrag.ts` | Edit-mode canvas reorder drag + panel-to-canvas drop |
| `app/api/upload-bead/route.ts` | Next.js API route: GLB validation + S3 upload |
| `app/api/thumbnail/route.ts` | Next.js API route: base64 PNG → S3 upload |
| `types/index.ts` | All shared TypeScript types |

---

## Adding a New Bead or Charm

1. Upload the GLB via the **Manage Beads** dialog (UserScreen → "Manage Beads") or drop it into S3 manually under `models/beads/`.
2. Add the product via the API / backend — it will appear in the bead catalog automatically.
3. For **charms**, the following fields on `BeadProduct` control placement:
   - `bail_width_mm` — wire diameter of the bail (used to thread the cord correctly)
   - `body_width_mm` — width of the charm body (used for arc spacing between adjacent charms)
   - `depth_offset` — Z offset to push the charm forward from the cord (default `-0.0005`)

---

## GLB Conventions

**Beads:** hole on the **Y axis**. `getBeadTransform()` in `bead-layout.ts` handles orientation so the hole aligns with the torus cord.

**Charms:** pivot/origin at the **bail top**, Y-up, face toward +Z. The `CHARM_ROTATION` constant in `lib/constants.ts` (`[Math.PI / 2, 0, Math.PI * 1.5]`) orients the charm hanging from the cord. `autoHangOffset` is computed at runtime from the post-rotation bounding box so the cord threads through the bail opening correctly.

**Material finish presets:** `FINISH_PRESETS` in `constants.ts` override metallic surfaces on GLBs. Only meshes with `metalness >= 0.5` are affected. The `DEFAULT_FINISH` is `"gold"`. Available presets: `gold`, `silver`, `rose_gold`.

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

## Spacing Rules

All spacing constants live in `lib/bead-layout.ts`:

```ts
CORD_RADIUS     = 0.0008   // cord tube radius (affects bail threading)
BEAD_SPACING    = -0.00035  // negative = beads closer together; 0 = just touching
```

- **Bead–bead pairs:** minimum gap = `BEAD_SPACING` (can be negative/zero — beads on a cord touch each other naturally).
- **Charm–charm pairs:** charms contribute `body_width_mm / 2` (not `diameter / 2`) to the cord arc when adjacent to another charm. A zero minimum gap is valid — they swing freely on the wire.
- **Bead–charm pairs:** standard `diameter / 2` contribution applies.

---

## S3 & Asset Proxying

GLB models and bead thumbnail images are stored in S3. The Next.js `rewrites` in `next.config.mjs` proxy `/models/*` and `/images/*` requests to S3, avoiding cross-origin issues without changing S3 CORS config. This keeps `glb_path` values consistent whether the bead model lives in `/public` or in S3.

---

## Notes for Developers

- **Dynamic Tailwind classes won't work.** Tailwind v4 purges unused classes at build time. Computed class names (e.g. `` `bg-${color}-500` ``) are stripped. Use full class strings in `lib/category-colors.ts` and switch on them. Use inline `style` props with shared numeric constants for computed layout values.
- **React hooks must appear unconditionally** before any return statement. Conditional `return null` guards mid-component cause "rendered more hooks than previous render" errors.
- **PHP APIs may return empty strings or MySQL zero-dates** instead of null for unset datetime fields; frontend code must guard against this.
- **`apiFetch` handles non-JSON responses gracefully** by catching `res.json()` failures and throwing an `ApiError` with the HTTP status. 204 No Content returns `undefined`.
- **AWS reserved env variable names** conflict with Netlify. Use the `ENEWTON_AWS_*` prefix.
- **Camera constraint timing:** `minPolarAngle`/`maxPolarAngle` enforcement in edit mode uses a `rest` event listener on `CameraControls` to avoid interfering with `setLookAt` transition animations. `setTarget` (not `setLookAt`) avoids orbit pivot snapping on deselect.
- **React Query cache key consistency** is critical — mismatches (e.g. `"design"` vs `"designs"`) cause stale data bugs across hooks.
- **Feature flags** (e.g. `REJECT_ENDPOINT_READY`) are a useful pattern for stubbing frontend behavior while waiting for backend endpoints.
- **PHP FastCGI strips `HTTP_AUTHORIZATION`.** The backend's `Auth.php` falls back to `REDIRECT_HTTP_AUTHORIZATION`. MAMP MySQL runs on a non-standard port — configure `DB_PORT` explicitly.

---

## Known Issues

- **`CHARM_ROTATION` correction:** The X rotation may need to be negated (`-Math.PI / 2` instead of `Math.PI / 2`) to ensure charm faces orient outward consistently across all GLB models. Test with real charm assets before changing.
- **`BeadInfoDialog` spacer category check** uses `'Spacer'` (capital S) but `createSpacerProduct` sets `bead_category: "spacer"` (lowercase), so spacers incorrectly show the Material row.
- **`BraceletExporter` dirty check** doesn't sort `cfg.beads` by position before comparing, unlike `useIsDirty` which does — can produce false positive "Update" button visibility.
- **`useReopenDesign` hook** exists but is not used by any component. Consider removing or wiring up if the `POST /designs/:id/reopen` endpoint becomes available.

---

## Code Cleanup Opportunities

- **Duplicate `slugify`** — `lib/utils.ts` and `hooks/useBeadAdmin.ts` each export their own version with slightly different implementations. Consolidate to one.
- **Duplicate `parseDecimal` / `ApiBeadProduct`** — identical definitions in `hooks/useBeads.ts` and `hooks/useBeadAdmin.ts`. Extract into a shared `lib/bead-helpers.ts`.
- **`createSpacerProduct` missing fields** — lacks `sku`, `color`, and `active` which are required on `BeadProduct`. Adding them with sensible defaults (`null`, `null`, `1`) prevents potential runtime issues.
- **Commented-out code in `Avatar.tsx`** — the original Avatar component implementation is commented out at the bottom of the file.
- **`clearcoat` on standard materials** — `BeadOnBracelet.tsx` sets `mat.clearcoat` which only works on `MeshPhysicalMaterial`. If the GLB uses `MeshStandardMaterial`, the property is silently ignored.
- **`ControlsRegistrar` dependency** — uses `controlsRef.current` in the `useEffect` deps array; ref mutations don't trigger re-renders, so the effect may not fire reliably.

---

## Performance (Not Yet Implemented)

Discussed but not yet built:

- GLB preloading and Draco compression
- Lazy-loading the 3D bundle via `next/dynamic`
- React Query `staleTime` tuning across hooks
- Environment HDR preloading
- 3D modeler standardisation (charm pivot at bail top, Y-up, face toward +Z) to eliminate bounding-box workarounds