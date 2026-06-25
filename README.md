# eNewton Bracelet Builder

Internal bracelet design tool for composing, saving, reviewing, and publishing bracelet configurations. Designers place 3D bead/charm models onto a virtual bracelet, manage designs through a multi-stage approval workflow, and publish finalized designs with Shopify SKUs.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| 3D Rendering | React Three Fiber + drei |
| State Management | Zustand (persisted to localStorage) |
| Server State | TanStack React Query v5 |
| Styling | Tailwind CSS v4 with custom design tokens |
| Real-time | Pusher (private channels per design) |
| Backend API | PHP / MySQL |
| Storage | AWS S3 (GLB models, thumbnails) |
| Auth | Email OTP (passwordless) |
| Deployment | Netlify (frontend), Apache/PHP (API) |

## Project Structure

```
app/
├── (protected)/           # Auth-gated layout + main page
│   ├── layout.tsx         # Redirects to /login if no token
│   └── page.tsx           # Renders BuilderLayout
├── api/
│   ├── thumbnail/route.ts # PNG upload to S3 (bracelet + bead thumbnails)
│   └── upload-bead/route.ts # GLB upload to S3 with magic-byte validation
├── login/page.tsx         # Email OTP login flow
├── globals.css            # Design tokens, base styles, Tailwind @theme
└── layout.tsx             # Root layout (fonts, QueryProvider, DesktopOnly gate)

components/
├── builder/
│   ├── canvas/            # Canvas overlays: info overlay, stats bar, band selector,
│   │                        edit mode toolbar + help, workflow bar, Pusher status
│   ├── dialogs/           # Modal dialogs: bead info, bracelet details, confirm
│   │                        replace, edit-replace groups, create pattern, delete,
│   │                        discontinue, reject, session takeover, design lock
│   │   └── manage/        # Admin manage dialogs: beads, tags, collections, seed colors
│   ├── header/            # Top-bar pieces: HeaderToolbar (undo/redo, view, edit,
│   │                        comments + workflow actions), BraceletExporter, NewBraceletMenu
│   ├── panels/            # Slide-out panels: bead selector (+ seed/spacer/bar pickers),
│   │                        comments, user panel
│   ├── saved-designs/     # Saved designs screen, design + pattern cards, filter pickers
│   ├── sections/          # Workflow + assignment sections (inside details dialog)
│   ├── users/             # User admin: CRUD, OTP creation, permissions, avatar
│   └── BuilderLayout.tsx  # Root component — orchestrates panels, dialogs, and
│                            notifications; delegates lock + realtime to useDesignLock
├── scene/
│   ├── AllBeads.tsx        # Maps placed beads → BeadOnBracelet / SeedSegmentOnBracelet / SpacerOnBracelet / BarOnBracelet
│   ├── BeadOnBracelet.tsx  # GLB loader, material finish, charm hanging, selection
│   ├── SeedSegmentOnBracelet.tsx # Procedurally placed seed/round beads along an arc segment
│   ├── SpacerOnBracelet.tsx# Procedural wireframe cylinder for virtual spacers
│   ├── BarOnBracelet.tsx   # Elongated "bar" catalog items (arc footprint = size_mm length)
│   ├── BraceletCord.tsx    # Torus (3D) or cylinder (line) cord mesh
│   ├── CameraController.tsx# Camera transitions for select, edit, line views
│   ├── CameraOffset.tsx    # View offset for panel-aware centering
│   ├── Scene.tsx           # Canvas setup, lighting, environment, shadows
│   ├── BeadErrorBoundary.tsx # Fallback wireframe sphere for broken GLBs
│   └── BeadErrorToast.tsx  # Toast notifications for failed model loads
└── ui/                    # Design system primitives: Button, Panel, Tooltip,
                             Avatar, ErrorAlert, StandardConfirmDialog, ScrollableRow,
                             DesktopOnly (mobile gate), etc.

hooks/
├── useAuth.ts             # Login flow: request OTP code + verify code
├── useBeadAdmin.ts        # Full bead CRUD, GLB upload, thumbnail upload
├── useBeads.ts            # Active bead catalog query (filtered, normalised)
├── useCollections.ts      # CRUD + design↔collection assignment mutations
├── useComments.ts         # Query + add + edit + delete comment mutations
├── useCreateBracelet.ts   # POST /designs with derived config
├── useCreatePattern.ts    # POST /designs with is_pattern:true (from canvas)
├── useCurrentUser.ts      # GET /me — current session user
├── useDeleteDesign.ts     # DELETE /designs/:id
├── useDeletePattern.ts    # DELETE /patterns/:id
├── useDesign.ts           # Single design query by ID
├── useDesignHeartbeat.ts  # 30s interval lock keepalive
├── useDesignLock.ts       # Lock acquire/confirm, heartbeat kicks, Pusher sync, status-lock detection
├── useDesigns.ts          # All designs query with client-side filter/sort
├── useDrag.ts             # Canvas drag-to-reorder + panel-to-canvas drop
├── useGenerateThumbnail.ts# WebGL render target capture + content-aware crop
├── useIsDirty.ts          # Compares store state to cached saved design
├── useLoadDesign.ts       # Hydrate store from saved design + acquire lock
├── useLoadPattern.ts      # Hydrate store from a pattern (load fresh, or edit-in-place)
├── useLockDesign.ts       # POST /designs/:id/lock (edit lock acquisition)
├── useNotificationCounts.ts # Lightweight counts-only endpoint query
├── useNotifications.ts    # Badge counts via Pusher + counts endpoint
├── useOptimisticAssignment.ts # Generic optimistic toggle for tags/collections
├── usePatterns.ts         # Pattern catalog query (GET /patterns)
├── usePermissions.ts      # Role-based permission booleans
├── usePusherConnectionStatus.ts # Pusher WebSocket connection state
├── usePusherDesign.ts     # Per-design Pusher channel subscriptions
├── useReleaseLock.ts      # DELETE /designs/:id/lock (fire-and-forget)
├── useSaveBracelet.ts     # Shared save flow: capture → upload → create
├── useSaveDesignAsPattern.ts # Clone an existing saved design into a new pattern
├── useSavePattern.ts      # PUT /patterns/:id — save canvas back to active pattern
├── useSceneItemInteraction.ts # Shared click/drag/selection logic for on-cord items
├── useSeedColors.ts       # Seed color catalog: query + CRUD + status toggle
├── useSeedPresets.ts      # Seed colorway presets: query + CRUD + status toggle
├── useTags.ts             # CRUD + design↔tag assignment mutations
├── useUpdateBracelet.ts   # PUT /designs/:id with conditional thumbnail regen
├── useUpdateDesign.ts     # Raw PUT /designs/:id mutation
├── useUploadThumbnail.ts  # Thumbnail PNG upload to S3
├── useUsers.ts            # Query + create (token + OTP) + update + delete
└── useWorkflow.ts         # All workflow transitions: submit, approve, reject,
                             publish, unpublish, send-to-draft, reopen,
                             discontinue, undiscontinue, set SKU

lib/
├── api.ts                 # apiFetch wrapper with auth header, error handling
├── auth.ts                # Token get/set/clear (localStorage)
├── store.ts               # Zustand store: beads, selection, camera refs, etc.
├── bead-layout.ts         # Arc geometry: circular + line transforms, per-category spacing,
│                            charm min-footprint + seed fill-arc helpers
├── bead-helpers.ts        # API→frontend bead normalisation (string→number)
├── build-bracelet-config.ts # Derives BraceletConfiguration from store state
├── charm-collision.ts     # Layer-offset + bail-swing adjustments for close charms
├── measure-bead.ts        # GLB bounding box measurement + structural clone
├── seed-bead-utils.ts     # Deterministic seed-bead placement, sizing, colors
├── constants.ts           # Scene, camera, cord, finish presets, spacer + seed sizes
├── category-colors.ts     # Status badges, category chips, avatar colors
├── sanitize.ts            # HTML-strip + length-limit for comment text
├── pusher.ts              # Pusher singleton with lazy Bearer auth
├── query-client.ts        # QueryClient with 401 → logout handler
└── utils.ts               # cn, slugify, formatMm, formatTimestamp, beadMatchesSearch, etc.

types/
└── index.ts               # All shared TypeScript interfaces and types
```

## Hook Organisation

Hooks are grouped by domain — related query + mutation hooks live in one file rather than scattered across many small files. This follows the same pattern used by TanStack Query's documentation and keeps the hooks directory navigable.

| File | Contents |
|------|----------|
| `useAuth.ts` | `useRequestCode`, `useVerifyCode` |
| `useCollections.ts` | `useCollections`, `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection`, `useApplyCollection`, `useRemoveCollection` |
| `useComments.ts` | `useComments`, `useAddComment`, `useEditComment`, `useDeleteComment` |
| `useSeedColors.ts` | `useSeedColors`, `useCreateSeedColor`, `useUpdateSeedColor`, `useToggleSeedColorStatus`, `useDeleteSeedColor` |
| `useSeedPresets.ts` | `useSeedPresets`, `useCreateSeedPreset`, `useUpdateSeedPreset`, `useToggleSeedPresetStatus`, `useDeleteSeedPreset` |
| `useTags.ts` | `useTags`, `useCreateTag`, `useUpdateTag`, `useDeleteTag`, `useApplyTag`, `useRemoveTag` |
| `useUsers.ts` | `useUsers`, `useCreateUser`, `useCreateOtpUser`, `useUpdateUser`, `useDeleteUser` |
| `useWorkflow.ts` | `useSubmitDesign`, `useApproveDesign`, `useRejectDesign`, `usePublishDesign`, `useUnPublishDesign`, `useSendToDraft`, `useReopenDesign`, `useDiscontinueDesign`, `useUndiscontinueDesign`, `useSetDesignSku` |

Hooks that carry enough standalone logic to justify their own file remain separate (e.g. `useLoadDesign`, `useDesignLock`, `useDrag`, `useGenerateThumbnail`, `usePusherDesign`). The pattern hooks (`usePatterns`, `useCreatePattern`, `useSavePattern`, `useSaveDesignAsPattern`, `useDeletePattern`, `useLoadPattern`) are likewise kept as individual files — each maps to a distinct endpoint or load path and shares no state with the others.

## Design Workflow

Designs move through a multi-stage approval pipeline:

```
draft → in_review → approved → published
  ↑        │            │
  └────────┘            │
  (rejected)            │
                        ↓
                   discontinued
                        ↓
                   (undiscontinued → published)
```

Each transition requires specific permissions and uses a dedicated API endpoint. All workflow mutations are consolidated in `useWorkflow.ts`. The `usePermissions` hook centralises all role checks. Rejected designs include a `rejection_reason` displayed on the canvas and in the details dialog. Editing a rejected design auto-resets its status to draft on the server.

## Patterns

Patterns are reusable bracelet templates — a saved arrangement of beads/seed segments/spacers that a designer can drop onto the canvas as the starting point for a new design. They live outside the approval workflow: a pattern has no status, lock, SKU, or assignment, and never appears in the Saved Designs grid.

**Storage model.** A pattern is a `Bracelet` row flagged with `is_pattern` (a `0/1` int on the model, sent as a boolean on create). Creation reuses the existing `POST /designs` path with `is_pattern: true`, so a pattern stores the same `configuration` blob as a design (beads, seed configs, size, band material, hairtie color, preview thumbnail). Reads, updates, and deletes go through dedicated endpoints:

| Action | Endpoint | Hook |
|--------|----------|------|
| List | `GET /patterns` | `usePatterns` |
| Create from canvas | `POST /designs` (`is_pattern:true`) | `useCreatePattern` |
| Create from a saved design | `POST /designs` (`is_pattern:true`) | `useSaveDesignAsPattern` |
| Update in place | `PUT /patterns/:id` | `useSavePattern` |
| Delete | `DELETE /patterns/:id` | `useDeletePattern` |

> **Backend contract:** because patterns are created via `POST /designs`, `GET /designs` **must** exclude `is_pattern = 1` rows server-side — the frontend `useDesigns` query does not filter them out. If patterns ever start appearing in the Saved Designs grid, that exclusion is the thing to check (or add a defensive `is_pattern` guard to `useDesigns`).

**Entry point.** Patterns surface in the **SavedDesignsScreen → PatternsGrid** tab — a full-screen view alongside Designs, with search + sort. It's reached from the Saved Designs panel, the **New Bracelet → From pattern** menu item, and the **Manage Patterns** admin action. While *editing* a pattern, the New Bracelet menu swaps its "Copy bracelet" item for **From current pattern** (`newBraceletFromPattern`), which forks the current canvas into a fresh, unsaved bracelet (detached from the pattern) and opens the replace flow.

Each card offers two actions: **create bracelet** (load the pattern as a fresh, unsaved bracelet) and, for managers, **edit pattern** (load it in edit-in-place mode). Creating a bracelet from a pattern drops the user straight into **Edit Mode with the replace box open** (`enterEditReplaceMode`) so they can immediately swap beads to make it their own.

**Loading (`useLoadPattern`).** Exposes `loadPattern`, `editPattern`, and `applyPattern`. The mapping from `configuration.beads` to `PlacedBead[]` mirrors `useLoadDesign` exactly — seed segments are rebuilt from `seed_config` via `createSeedSegmentProduct`, and catalog beads are resolved by `product_id` (silently skipped if the product was removed). The difference is intent:

- `loadPattern` / `editPattern` first check whether the canvas already has beads. If so they call `setPendingPattern()` and let the global `ConfirmReplaceDialog` (its `PatternConfirmDialog` branch) prompt before discarding work.
- `applyPattern` does the actual mapping. Passing a pattern id sets `activePatternId` (edit-in-place); passing `null` loads a detached copy under the default bracelet name.

**Edit-in-place.** When `activePatternId` is set, the canvas is bound to that pattern: the header swaps the normal export/save-as-design control for a **Save Pattern** button (`useSavePattern`, which reads live store state via `useStore.getState()` to dodge stale-closure issues during the async thumbnail capture, then `PUT`s the configuration back). `BraceletDetailsDialog` retitles to "Pattern Details" and hides the "Save as Pattern" affordance. Starting a new bracelet or clearing the canvas resets `activePatternId` to `null`.

`activePatternId` (and `activeDesignId`) are part of the persisted store slice and survive a refresh, with a `version: 4` migration adding `activePatternId`.

## Edit Locking

Concurrent editing is prevented via server-side edit locks with a 30-second heartbeat. When a user loads a design, `useLoadDesign` acquires the lock via `POST /designs/:id/lock`. The `useDesignHeartbeat` hook sends keepalive POSTs every 30 seconds. If another user (typically an admin) force-takes the lock, the original editor is kicked to read-only mode and shown a `SessionTakenOverDialog`.

Pusher events (`design.lock-taken`, `design.lock-changed`) provide instant notification of lock changes, supplementing the heartbeat polling. On the client, the `useDesignLock` hook centralises all of this — optimistic acquisition when the active design changes, server confirmation from the GET response's `active_lock`, heartbeat wiring, and the kicked / status-locked modal state that `BuilderLayout` renders.

## Real-time Updates (Pusher)

Each design has a private Pusher channel (`private-design-{id}`) carrying events for design updates, lock changes, and comment CRUD. The `usePusherDesign` hook subscribes when a design is loaded and writes event payloads directly into the React Query cache via `setQueryData` to avoid redundant network round-trips; `BuilderLayout` wires its handlers through `useDesignLock`. The global `private-designs` channel carries `design.status-changed` events that update notification badge counts.

## 3D Scene Architecture

The scene renders inside a React Three Fiber `<Canvas>` with `camera-controls` for orbit/zoom. Key components:

- **BeadOnBracelet** — Loads GLB via `useGLTF`, applies material finish presets (gold/silver/rose_gold), handles charm hanging via bounding-box measurement, and renders selection rings and drag targets.
- **SeedSegmentOnBracelet** — Renders a run of procedurally placed seed beads (or fixed-size round beads) along an arc segment. Per-bead diameters, positions, and colors come from `seed-bead-utils` and are deterministic for a given `random_seed`.
- **SpacerOnBracelet** — Procedural wireframe cylinder (no GLB). Visible only in draft/rejected states; suppressed during thumbnail capture.
- **BarOnBracelet** — Elongated `bar`-category catalog items whose arc footprint is their `size_mm` length (not diameter). Added via the **Bar** tab of the bead selector (`BarPicker`); in Edit Mode a bar can be replaced by several smaller beads (`replaceWithBeads`) or a seed segment (`replaceBarWithSeedSegment`).
- **BraceletCord** — Torus (3D view) or cylinder (line view) with material-specific properties. Hairtie cord color is user-selectable.
- **CameraController** — Manages transitions between free orbit, bead zoom, top-down edit, side edit, and line view modes.
- **CameraOffset** — Applies view offset to keep the bracelet centred when side panels slide open.

All three on-cord items (bead, seed segment, spacer) share pointer, drag-threshold, and selection logic via `useSceneItemInteraction`. When charms sit close together, `charm-collision.ts` applies a small radial layer offset plus a bail-pivot swing so hanging bodies fan apart rather than overlap.

Two canvas layouts are supported: circular (torus in XZ plane) and line (straight along X axis). The `bead-layout.ts` module computes per-bead transforms for both, using actual bead diameters and per-category spacing rules. A charm's footprint next to a non-charm is its `bail_width_mm`, floored to `MIN_CHARM_ARC_MM` so tiny bails can't collapse or overlap (float charms are exempt; charm↔charm spacing uses `body_width_mm`). An optional **evenly-spaced** toggle (`isEvenlySpaced`, in the Edit Mode toolbar) distributes items at equal angular intervals around the bracelet — purely visual, with no effect on capacity.

## Seed Beads

Seed beads are placed as a **segment** — a single `PlacedBead` whose `seedConfig` describes a whole run of tiny beads, rather than one model per bead. Two shapes are supported:

- **Seed** — irregular seed beads. Each bead's diameter is randomised within a ±15% band (`SEED_BEAD_SIZE_VARIANCE`) around a nominal size. Two nominal sizes are offered: **Small (1 mm)** and **Large (2 mm)** (`SEED_BEAD_SIZES_MM` / `SEED_BEAD_SIZE_LABELS`).
- **Round** — uniform round beads at a fixed diameter (`ROUND_SEED_SIZES_MM`, 1 or 2 mm) rendered from the Classic Bead GLB, in a gold or silver finish.

A segment carries a **colorway** of up to six `SeedColorEntry` weights (hex, label, percent, metallic flag) that must sum to 100%. `seed-bead-utils.ts` uses a deterministic PRNG seeded by `random_seed` to lay out bead positions, sizes, and colors, so the same seed always reproduces the same arrangement — "Shuffle" just picks a new seed and saved designs need only store the seed, not every bead.

The **SeedBeadPicker** panel composes a segment: shape, size, colorway (built from the color catalog or a preset, with metallic/matte groupings), and fill amount (remaining space, custom mm, or bead count). The **remaining-space** figure comes from `maxSeedArcMm`, which subtracts the inter-item spacing gap a segment introduces when appended — without it a full-length "fill remaining" segment overflows by that gap (notably after charms, whose gap is positive). `seedSizeLabel()` in `seed-bead-utils` produces the readable size shown in the bead info and bracelet details dialogs.

### Seed Color & Preset Administration

Admins manage the shared palette via **ManageSeedColorsDialog**, which has two tabs:

- **Colors** — the catalog of color swatches (hex, label, metallic/matte). Create, edit, reorder, deactivate/reactivate, or delete. Deleting a color still referenced by a preset is blocked server-side (`409`, with the offending presets listed).
- **Presets** — named colorways referencing those colors, with weights that must total 100%.

Both lists support an Active / Inactive / All status filter; inactive rows are fetched with `?include_inactive=1` for admins only. Colors and presets are served from `/seed-colors` and `/seed-presets` and managed through the `useSeedColors` / `useSeedPresets` hook families.

## Bead Administration

Admins can manage the bead catalog via `ManageBeadsDialog`:

- Create/edit bead products with metadata (name, SKU, category, material, dimensions)
- Upload GLB models to S3 with client-side validation (extension, size, magic bytes)
- Capture bead thumbnails from a preview R3F canvas
- Toggle active/inactive status (soft delete)
- Permanently delete beads (409 conflict when referenced by designs)

The inventory search and the in-builder bead-selector search share one matcher, `beadMatchesSearch` (in `utils.ts`), which spans name, type, category, material, colour, SKU, and size — not just the name. In the bead selector, items that don't fit are hidden while space remains but stay visible (greyed) once the bracelet is full, and opening a replace flow defaults the category tab to the item being replaced.

## Thumbnail Generation

Bracelet thumbnails are captured via `useGenerateThumbnail`:

1. Spacer wireframes are hidden (`spacersHiddenForCapture`)
2. Two rAF ticks wait for React to flush the state change
3. A cloned camera renders from `CAMERA_DEFAULT_POSITION` into a `WebGLRenderTarget`
4. Pixel data is read, row-flipped (WebGL→Canvas origin), and content-aware cropped
5. The cropped image is scaled to a 600×600 PNG and uploaded to S3

Thumbnails are only regenerated when the visual content changes (beads, size, material). Name-only or description-only edits reuse the existing thumbnail.

## Environment Variables

### Required (Runtime)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | PHP API base URL |
| `NEXT_PUBLIC_TOKEN_KEY` | localStorage key for auth token |
| `NEXT_PUBLIC_PUSHER_APP_KEY` | Pusher application key |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster (default: `mt1`) |

### Required (Server-side / Build)

| Variable | Purpose |
|----------|---------|
| `ENEWTON_AWS_ACCESS_KEY_ID` | AWS credentials for S3 uploads |
| `ENEWTON_AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 uploads |
| `ENEWTON_AWS_REGION` | AWS region for S3 bucket |
| `S3_BUCKET_NAME` | S3 bucket name for models/thumbnails |

### Optional

| Variable | Purpose |
|----------|---------|
| `S3_PUBLIC_URL` | CloudFront/custom domain for S3 assets |

Note: AWS env vars use the `ENEWTON_` prefix because AWS reserves `AWS_*` names on certain platforms (including Netlify). `S3_BUCKET_NAME` and `S3_PUBLIC_URL` are server-side only and not available at Netlify build time when marked as "Secret".

## Design Tokens

Defined in `globals.css` under `@theme`:

| Token | Hex | Usage |
|-------|-----|-------|
| `navy` | `#1F3A5F` | Primary actions, headers |
| `gold` | `#a38d48` | Accent, selection highlight |
| `mint` | `#e2ffff` | Secondary backgrounds, hover states |
| `light-mint` | `#D8F0ED` | Positive action buttons |
| `blush` | `#F7D9DD` | Soft danger, type filter chips |
| `stone` | `#9b948e` | Muted text, borders |
| `shell` | `#f6f3ee` | Tooltip backgrounds, subtle surfaces |
| `error` | rose-700 | Error states, danger buttons |
| `orange` | `#c0774a` | Warning banners (lock/kicked) |

Typography uses three font families: Inter (body), Italiana (headlines), and Square Peg (display/decorative).

## Key Patterns & Conventions

- **Targeted diffs over full rewrites** — Prefer minimal, focused changes rather than wholesale component rewrites.
- **Consolidation over file proliferation** — Related hooks are grouped by domain in single files (e.g. `useWorkflow.ts`, `useComments.ts`, `useUsers.ts`). Standalone hooks with enough unique logic keep their own files.
- **Feature flags for backend stubs** — Features awaiting API work use feature flags or stubs (e.g. `REJECT_ENDPOINT_READY`).
- **PHP API quirks** — The backend returns empty strings and zero-dates instead of null; `apiFetch` guards against non-JSON error responses from Apache/PHP.
- **Tailwind dynamic classes** — Computed class strings don't survive JIT; use inline `style` props with shared constants instead.
- **GLB finish overrides** — Apply finish presets by traversing materials with a per-instance color override, never by mutating the shared `FINISH_PRESETS` (which would bleed into other bead types).
- **Deterministic procedural content** — Seed segments regenerate from a stored `random_seed`, so designs render identically without persisting every individual bead.
- **React hooks ordering** — All hooks must appear unconditionally before any early `return null` statements.
- **Camera UX** — Minimal camera movement with natural transitions; avoid disorienting scripted repositioning.
- **GLB convention** — Bead hole axis is local Y. Charms need pivot at bail top, Y-up, face +Z (standardisation in progress with 3D modeler).

## Keyboard Shortcuts

### Global (always active, never captured from inputs)

| Key | Action | Condition |
|-----|--------|-----------|
| `E` | Enter Edit Mode | `canEdit` and design not locked |

### Edit Mode (active only while Edit Mode is on)

| Key | Action |
|-----|--------|
| `↑` / `←` | Move selected bead back one slot |
| `↓` / `→` | Move selected bead forward one slot |
| `Delete` / `Backspace` | Remove selected bead(s) |
| `⌘/Ctrl + D` | Duplicate selected bead(s) |
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Y` / `⌘/Ctrl + Shift + Z` | Redo |
| `Escape` | Deselect all |
| `⌘/Ctrl + Escape` | Exit Edit Mode |

### Canvas pointer (Edit Mode)

| Gesture | Action |
|---------|--------|
| Click bead | Toggle bead into / out of edit selection |
| `⌘/Ctrl` + Click bead | Open bead info panel and add to edit selection |
| Drag bead | Reorder by dragging |

### Dialogs & Panels (local scope)

| Context | Key | Action |
|---------|-----|--------|
| Any dialog / full-screen overlay | `Escape` | Close / cancel |
| Any confirmation input field | `Enter` | Confirm / save |
| Comments composer or edit field | `⌘/Ctrl + Enter` | Submit comment |
| Comments edit field | `Escape` | Cancel edit |
| User row (admin screen) | `Enter` / `Space` | Expand / collapse row |
| Permissions dropdown | `Escape` | Close dropdown |

## Development

```bash
npm install
npm run dev
```

## Deployment

Frontend deploys to Netlify. The `next.config.mjs` rewrites proxy `/models/*` and `/images/*` to the S3 bucket so the frontend never makes cross-origin requests for 3D assets and thumbnails.