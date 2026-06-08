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
     ├── Scene                          ← R3F Canvas, lighting, camera controls
     │    ├── BraceletCord              ← Procedural torus cord mesh (wire / cord / elastic)
     │    ├── AllBeads                  ← Maps store bead list → BeadOnBracelet instances
     │    │    └── BeadOnBracelet       ← Loads one GLB, positions + rotates on the cord
     │    ├── CameraController          ← Zoom to selected bead; zoom out on deselect
     │    └── CameraOffset              ← Shifts camera FOV when side panels are open
     │
     ├── canvas/
     │    ├── BandSelector              ← Wire / Cord / Elastic + bracelet size toggles
     │    ├── CanvasToolbar             ← Top toolbar: 3D ↔ Line view toggle + Edit mode button
     │    ├── CanvasWorkflowBar         ← Status badge + Submit / Approve / Reject / Publish actions
     │    ├── CanvasStatsBar            ← Arc used / remaining / bead count readout
     │    ├── EditModeToolbar           ← Floating toolbar in edit mode: move, duplicate, reverse, delete, camera
     │    └── BraceletExporter          ← Save (POST) or Update (PUT) bracelet; JSON download fallback
     │
     ├── panels/
     │    ├── BeadSelectorPanel         ← Slide-in left panel; bead catalog with search + filters
     │    └── CommentsPanel             ← Slide-in right panel; per-design comment thread
     │
     ├── dialogs/
     │    ├── BraceletDetailsDialog     ← Per-design metadata sheet (name, description, config summary)
     │    ├── BeadInfoDialog            ← Floating dialog on bead tap: info, duplicate, remove, select-all
     │    ├── ConfirmReplaceDialog      ← "Replace current bracelet?" confirmation gate
     │    ├── DeleteBraceletDialog      ← Hard-delete confirmation (admin only)
     │    ├── DiscontinueBraceletDialog ← Discontinue confirmation; greys out card in UI
     │    ├── ManageTagsDialog          ← Admin CRUD for tags (name + color)
     │    └── ManageCollectionsDialog   ← Admin CRUD for collections
     │
     ├── sections/
     │    ├── WorkflowSection           ← Status pipeline, SKU input, and action buttons (extracted from BraceletDetailsDialog)
     │    └── AssignmentSection         ← Reusable many-to-many chip manager for tags and collections
     │
     ├── saved-designs/
     │    ├── SavedDesignsScreen        ← Full-screen slide-in: browse, filter, sort, load saved designs
     │    ├── DesignCard                ← Individual design card with status badge, thumbnail, quick actions
     │    └── Pickers.tsx               ← TagPicker + CollectionPicker (shared useDropdown)
     │
     └── users/
          ├── UserScreen                ← User profile + permission-filtered design queues
          └── UsersAdminScreen          ← Admin: list, create, edit, and deactivate users
```

---

## State Management

Global state lives in `lib/store.ts` (Zustand, persisted to `localStorage` as `enewton-beads` v2).

**Persisted across page reloads:** placed beads, bracelet name, description, band material, bracelet size, active design ID.

**Ephemeral (session only):** selected bead, edit mode, view mode, drag state, pending design, canvas element reference, bead load errors.

**`isDirty` flag:** set by every content mutation (add bead, rename, reorder, etc.) and cleared on load or save. Used to gate confirmation dialogs when the user tries to load a different design over unsaved work.

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

Additional statuses: `design_concept`, `discontinued` (derived UI state — `is_discontinued === 1`; the DB status column remains `published`).

| Status | Who can advance it |
|---|---|
| `draft` → `in_review` | `is_bracelet_editor` (Submit for Review) |
| `in_review` → `approved` | `is_reviewer` (Approve) |
| `in_review` → `draft` | `is_reviewer` (Reject — requires a rejection reason) |
| `approved` → `published` | `is_publisher` (Publish — requires Shopify SKU) |
| `published` → unpublished | `is_publisher` (Unpublish — reverts to `approved`) |
| Any → `discontinued` | `is_admin` (Discontinue — reversible) |

Permission logic is centralised in `hooks/usePermissions.ts`. Workflow action buttons are gated through `PermissionGate` or the `can*` booleans from that hook.

---

## Canvas Views

| View | Description |
|---|---|
| **3D** | Default circular bracelet layout on a torus in the XZ plane |
| **Line** | Beads laid out linearly along the X axis — useful for bead ordering |

**Edit Mode** (pencil icon): enables drag-to-reorder beads directly on the canvas. Double-click a bead to select it for toolbar operations (move, duplicate, delete). A blue canvas background indicates edit mode is active.

---

## Tags & Collections

Both use a many-to-many relationship to bracelet designs.

**Tags** are freeform labels with an optional colour. They are created and managed via `ManageTagsDialog` (accessible from `TagPicker` if the user has `is_admin`). Applied to a design via `AssignmentSection` inside `BraceletDetailsDialog`.

**Collections** group related designs (and eventually products). Same management pattern — `ManageCollectionsDialog`, `CollectionPicker`, `AssignmentSection`.

Assignment UI uses **optimistic updates** via `useOptimisticAssignment`: chips appear or disappear immediately, a spinner marks in-flight items, and the UI rolls back automatically on API error.

Filter chips in `SavedDesignsScreen` are colour-coded by category using `CATEGORY_STYLES` from `lib/category-colors.ts`. Tailwind class strings must appear in full in that file — do not construct them dynamically.

---

## UI Standardization & Reusable Components
 
The app uses several standardized UI components to maintain consistency and reduce code duplication across dialogs and error displays.
 
### StandardConfirmDialog
 
A reusable confirmation dialog for destructive actions, used in delete and discontinue workflows.
 
```tsx
import { StandardConfirmDialog } from "@/components/ui/StandardConfirmDialog";
 
<StandardConfirmDialog
  title="Delete bracelet"
  message={
    <>
      <span className="font-semibold">"{designName}"</span> will be permanently removed from the library. This cannot be undone.
    </>
  }
  icon={<AlertTriangle size={16} />}
  iconBgClass="bg-error/50"
  iconColorClass="text-error/80"
  confirmLabel="Delete bracelet"
  confirmVariant="danger"
  isLoading={isDeleting}
  onConfirm={onConfirm}
  onCancel={onCancel}
/>
```
 
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `title` | string | Dialog title |
| `message` | ReactNode | Main warning message (can include JSX) |
| `icon` | ReactNode | Icon element (optional) |
| `iconBgClass` | string | Icon background color class (e.g., "bg-error/50") |
| `iconColorClass` | string | Icon text color class (e.g., "text-error/80") |
| `confirmLabel` | string | Confirm button label (default: "Confirm") |
| `confirmVariant` | ButtonVariant | Button variant (primary \| secondary \| danger \| softDanger \| positive \| ghost) |
| `cancelLabel` | string | Cancel button label (default: "Cancel") |
| `isLoading` | boolean | Shows spinner during async action (default: false) |
| `onConfirm` | () => void | Confirm button callback |
| `onCancel` | () => void | Cancel button callback |
 
**Used in:**
- `DeleteBraceletDialog` — Removes designs permanently
- `DiscontinueBraceletDialog` — Marks designs as discontinued (reversible)


**Design Pattern:**
- Customizable icon, colors, and labels for different severity levels
- Manual `Loader2` spinner via `isLoading` prop (not Button's internal loading state)
- Consistent layout: icon + message + action buttons
- Reduces duplication across multiple confirmation dialogs


### ErrorAlert
 
A standardized error display component with icon and consistent styling. Used throughout the app for validation errors, network failures, and other user-facing errors.
 
```tsx
import { ErrorAlert } from "@/components/ui/ErrorAlert";
 
{error && <ErrorAlert message={error} />}
```
 
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `message` | string | Error message to display |
| `className` | string | Optional additional CSS classes |
 
**Visual Style:**
- Icon: `AlertCircle` from lucide-react
- Background: `bg-error/50` (muted error red)
- Text: `text-error` (prominent error red)
- Padding: `px-3 py-2` with `gap-2` between icon and message
- Border radius: `rounded-lg`


**Used in:**
- `BeadSelectorPanel` — Bead add failures
- `UsersAdminScreen` (CreateUserDialog) — User creation failures
- `WorkflowSection` — Publish and workflow action failures
- `ConfirmReplaceDialog` — Save failures during design replacement
- `app/login/page.tsx` — Authentication token validation errors


**Design Pattern:**
- Replaces all custom `<p className="text-xs text-error">` error displays
- Provides visual hierarchy with icon
- Consistent spacing and styling across all error scenarios
- Single source of truth for error appearance
---
 
## Styling Conventions
 
### Color Tokens
 
The app uses a curated set of color tokens for UI consistency:
 
| Token | Usage | Examples |
|-------|-------|----------|
| `text-color-base` | Primary text | Metadata, descriptions, input labels |
| `text-color-base/70` | Secondary text | Muted labels, hints, disabled states |
| `text-error` | Errors and warnings | ErrorAlert component, rejection reasons |
| `bg-error/50` | Error backgrounds | ErrorAlert background |
| `border-error` | Error borders | Error field outlines (when needed) |
| `bg-blush` / `border-blush` | Soft danger (reject) | Reject confirmation panel, softDanger button variant |
| `bg-navy` | Primary interactive | Primary button background |
| `bg-gold` | Secondary interactive | Secondary button background |
| `bg-light-mint` | Positive action | Positive button variant, confirm states |
| `bg-light-grey/80` | Muted backgrounds | Alternate row backgrounds, editor panels |
 
**Key Principle:** Never use dynamic Tailwind class names (e.g., `` `bg-${color}-500` ``). All color classes must be fully specified in the source code. Tailwind v4 purges unused classes at build time.
 
### Button Component
 
The `Button` component supports manual loading state:
 
```tsx
<Button variant="danger" size="sm" disabled={isLoading}>
  {isLoading && <Loader2 size={13} className="animate-spin" />}
  Confirm Delete
</Button>
```
 
Components like `StandardConfirmDialog` prefer manual `Loader2` spinners for explicit control over timing and animation sizes, rather than Button's built-in `loading` prop.
 
---
 
## Component Architecture
 
### Dialog Hierarchy
 
- **StandardConfirmDialog** — Base reusable component for all confirmation dialogs
  - DeleteBraceletDialog (extends with "danger" styling)
  - DiscontinueBraceletDialog (extends with "softDanger" styling)
- **FullScreenDialog** — Base modal component (custom modals extend this)
- **FloatingDialog** — Non-modal floating panel (e.g., bead info)


### Error Display Hierarchy
 
- **ErrorAlert** — Standard error message component (used everywhere)
  - Always paired with `{error && <ErrorAlert ... />}`
  - Includes icon, padding, and consistent styling
  - Replaces all custom error `<p>` tags

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
| `lib/category-colors.ts` | Single source of truth for status badge styles and filter chip category colours |
| `lib/build-bracelet-config.ts` | Derives `BraceletConfiguration` from store state for API payloads |
| `lib/import-bracelet.ts` | Parses exported bracelet JSON files back into `PlacedBead[]` |
| `lib/auth.ts` | Token read/write helpers (`localStorage`) |
| `lib/api.ts` | Authenticated `apiFetch` wrapper; throws `ApiError` on failure |
| `components/scene/BeadOnBracelet.tsx` | Loads one bead/charm GLB, positions on cord, handles selection + drag |
| `components/scene/Scene.tsx` | R3F Canvas setup, lighting, camera config |
| `components/builder/BuilderLayout.tsx` | Root layout orchestrator |
| `components/builder/canvas/BraceletExporter.tsx` | Save / update bracelet; thumbnail capture; JSON download |
| `components/builder/canvas/CanvasWorkflowBar.tsx` | Inline status + workflow action bar on the canvas |
| `components/builder/saved-designs/SavedDesignsScreen.tsx` | Saved designs browser (filter, sort, load) |
| `components/builder/saved-designs/Pickers.tsx` | `TagPicker` + `CollectionPicker` with shared `useDropdown` |
| `components/builder/sections/WorkflowSection.tsx` | Status pipeline UI + all action buttons |
| `components/builder/sections/AssignmentSection.tsx` | Reusable optimistic chip manager for tags / collections |
| `components/builder/users/UserScreen.tsx` | User profile + permission-aware design queues |
| `components/builder/users/UsersAdminScreen.tsx` | Admin user management |
| `hooks/Tags.ts` | `useTags`, `useCreateTag`, `useUpdateTag`, `useDeleteTag`, `useApplyTag`, `useRemoveTag` |
| `hooks/Collections.ts` | `useCollections`, `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection`, `useApplyCollection`, `useRemoveCollection` |
| `hooks/useOptimisticAssignment.ts` | Shared optimistic many-to-many hook (tags, collections) |
| `hooks/usePermissions.ts` | `canEdit`, `canReview`, `canPublish`, `canAdmin`, etc. derived from current user |
| `hooks/useLoadDesign.ts` | Maps a saved `Bracelet` record onto the canvas via the bead catalog cache |
| `hooks/useBeads.ts` | Fetches + normalises bead catalog from API |
| `hooks/useDesigns.ts` | Fetches all designs; client-side filter + sort via React Query `select` |
| `hooks/useSaveBracelet.ts` | Thumbnail capture → S3 upload → POST /designs |
| `hooks/useUpdateBracelet.ts` | Smart update — skips thumbnail re-upload if bracelet unchanged |
| `hooks/useGenerateThumbnail.ts` | Pixel-scan crop + fixed 600×600 PNG capture |
| `hooks/useDiscontinueDesign.ts` | Sets `is_discontinued = 1` via dedicated API endpoint |
| `hooks/useUndiscontinueDesign.ts` | Reverses discontinuation |
| `hooks/useRejectDesign.ts` | Rejects a design in review with a required reason string |
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

---

## Spacing Rules

- **Bead–bead pairs:** minimum gap = `BEAD_SPACING` (can be negative/zero — beads on a cord touch each other naturally).
- **Charm–charm or charm–bead pairs:** charms contribute `bail_width_mm / 2` (not `body_width_mm / 2`) to the cord arc, because only the bail threads the cord. A zero minimum gap is valid between charms — they swing freely on the wire.
- **Bead–charm pairs:** minimum gap floor applies when at least one item is a bead.

---

## Notes for Developers

- **Dynamic Tailwind classes won't work.** Tailwind v4 purges unused classes at build time. Computed class names (e.g. `` `bg-${color}-500` ``) are stripped. Use full class strings in `lib/category-colors.ts` and switch on them — never interpolate.
- **CSS exit animations and conditional unmounting.** If a component needs an exit animation, don't `return null` early — delay unmount via an `isVisible` state toggled by `onAnimationEnd`. All hooks must appear unconditionally before any early return.
- **Camera constraint timing.** Horizontal-only enforcement listeners must be attached after the `rest` event fires on `CameraControls`, not immediately, to avoid interfering with `setLookAt` transition animations.
- **PHP API auth headers.** FastCGI strips `HTTP_AUTHORIZATION`. `Auth.php` falls back to `REDIRECT_HTTP_AUTHORIZATION`. MAMP MySQL runs on a non-standard port — configure `DB_PORT` explicitly.