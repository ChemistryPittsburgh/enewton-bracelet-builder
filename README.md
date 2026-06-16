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
└── layout.tsx             # Root layout (fonts, QueryProvider)

components/
├── builder/
│   ├── canvas/            # Canvas overlays: toolbar, stats bar, band selector,
│   │                        edit mode toolbar, workflow bar, exporter
│   ├── dialogs/           # Modal dialogs: bead info, bracelet details, confirm
│   │                        replace, delete, discontinue, manage beads/tags/
│   │                        collections, reject, session takeover, design lock
│   ├── panels/            # Slide-out panels: bead selector, comments
│   ├── saved-designs/     # Saved designs screen, design cards, filter pickers
│   ├── sections/          # Workflow + assignment sections (inside details dialog)
│   ├── users/             # User admin: CRUD, OTP creation, permissions, avatar
│   └── BuilderLayout.tsx  # Root component — orchestrates panels, lock state,
│                            Pusher subscriptions, notifications
├── scene/
│   ├── AllBeads.tsx        # Maps placed beads → BeadOnBracelet / SpacerOnBracelet
│   ├── BeadOnBracelet.tsx  # GLB loader, material finish, charm hanging, selection
│   ├── SpacerOnBracelet.tsx# Procedural wireframe cylinder for virtual spacers
│   ├── BraceletCord.tsx    # Torus (3D) or cylinder (line) cord mesh
│   ├── CameraController.tsx# Camera transitions for select, edit, line views
│   ├── CameraOffset.tsx    # View offset for panel-aware centering
│   ├── Scene.tsx           # Canvas setup, lighting, environment, shadows
│   ├── BeadErrorBoundary.tsx # Fallback wireframe sphere for broken GLBs
│   └── BeadErrorToast.tsx  # Toast notifications for failed model loads
└── ui/                    # Design system primitives: Button, Panel, Tooltip,
                             Avatar, ErrorAlert, StandardConfirmDialog, etc.

hooks/
├── useAuth.ts             # Login flow: request OTP code + verify code
├── useBeadAdmin.ts        # Full bead CRUD, GLB upload, thumbnail upload
├── useBeads.ts            # Active bead catalog query (filtered, normalised)
├── useCollections.ts      # CRUD + design↔collection assignment mutations
├── useComments.ts         # Query + add + edit + delete comment mutations
├── useCreateBracelet.ts   # POST /designs with derived config
├── useCurrentUser.ts      # GET /me — current session user
├── useDeleteDesign.ts     # DELETE /designs/:id
├── useDesign.ts           # Single design query by ID
├── useDesignHeartbeat.ts  # 30s interval lock keepalive
├── useDesigns.ts          # All designs query with client-side filter/sort
├── useDrag.ts             # Canvas drag-to-reorder + panel-to-canvas drop
├── useGenerateThumbnail.ts# WebGL render target capture + content-aware crop
├── useIsDirty.ts          # Compares store state to cached saved design
├── useLoadDesign.ts       # Hydrate store from saved design + acquire lock
├── useLockDesign.ts       # POST /designs/:id/lock (edit lock acquisition)
├── useNotificationCounts.ts # Lightweight counts-only endpoint query
├── useNotifications.ts    # Badge counts via Pusher + counts endpoint
├── useOptimisticAssignment.ts # Generic optimistic toggle for tags/collections
├── usePermissions.ts      # Role-based permission booleans
├── usePusherConnectionStatus.ts # Pusher WebSocket connection state
├── usePusherDesign.ts     # Per-design Pusher channel subscriptions
├── useReleaseLock.ts      # DELETE /designs/:id/lock (fire-and-forget)
├── useSaveBracelet.ts     # Shared save flow: capture → upload → create
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
├── bead-layout.ts         # Arc geometry: circular + line layout transforms
├── bead-helpers.ts        # API→frontend bead normalisation (string→number)
├── build-bracelet-config.ts # Derives BraceletConfiguration from store state
├── measure-bead.ts        # GLB bounding box measurement + structural clone
├── constants.ts           # Scene, camera, cord, finish presets, spacer sizes
├── category-colors.ts     # Status badges, category chips, avatar colors
├── sanitize.ts            # HTML-strip + length-limit for comment text
├── pusher.ts              # Pusher singleton with lazy Bearer auth
├── query-client.ts        # QueryClient with 401 → logout handler
└── utils.ts               # cn, slugify, formatMm, formatTimestamp, etc.

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
| `useTags.ts` | `useTags`, `useCreateTag`, `useUpdateTag`, `useDeleteTag`, `useApplyTag`, `useRemoveTag` |
| `useUsers.ts` | `useUsers`, `useCreateUser`, `useCreateOtpUser`, `useUpdateUser`, `useDeleteUser` |
| `useWorkflow.ts` | `useSubmitDesign`, `useApproveDesign`, `useRejectDesign`, `usePublishDesign`, `useUnPublishDesign`, `useSendToDraft`, `useReopenDesign`, `useDiscontinueDesign`, `useUndiscontinueDesign`, `useSetDesignSku` |

Hooks that carry enough standalone logic to justify their own file remain separate (e.g. `useLoadDesign`, `useDrag`, `useGenerateThumbnail`, `usePusherDesign`).

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

## Edit Locking

Concurrent editing is prevented via server-side edit locks with a 30-second heartbeat. When a user loads a design, `useLoadDesign` acquires the lock via `POST /designs/:id/lock`. The `useDesignHeartbeat` hook sends keepalive POSTs every 30 seconds. If another user (typically an admin) force-takes the lock, the original editor is kicked to read-only mode and shown a `SessionTakenOverDialog`.

Pusher events (`design.lock-taken`, `design.lock-changed`) provide instant notification of lock changes, supplementing the heartbeat polling.

## Real-time Updates (Pusher)

Each design has a private Pusher channel (`private-design-{id}`) carrying events for design updates, lock changes, and comment CRUD. The `usePusherDesign` hook subscribes when a design is loaded and writes event payloads directly into the React Query cache via `setQueryData` to avoid redundant network round-trips. The global `private-designs` channel carries `design.status-changed` events that update notification badge counts.

## 3D Scene Architecture

The scene renders inside a React Three Fiber `<Canvas>` with `camera-controls` for orbit/zoom. Key components:

- **BeadOnBracelet** — Loads GLB via `useGLTF`, applies material finish presets (gold/silver/rose_gold), handles charm hanging via bounding-box measurement, and renders selection rings and drag targets.
- **SpacerOnBracelet** — Procedural wireframe cylinder (no GLB). Visible only in draft/rejected states; suppressed during thumbnail capture.
- **BraceletCord** — Torus (3D view) or cylinder (line view) with material-specific properties. Hairtie cord color is user-selectable.
- **CameraController** — Manages transitions between free orbit, bead zoom, top-down edit, side edit, and line view modes.
- **CameraOffset** — Applies view offset to keep the bracelet centred when side panels slide open.

Two canvas layouts are supported: circular (torus in XZ plane) and line (straight along X axis). The `bead-layout.ts` module computes per-bead transforms for both, using actual bead diameters and per-category spacing rules.

## Bead Administration

Admins can manage the bead catalog via `ManageBeadsDialog`:

- Create/edit bead products with metadata (name, SKU, category, material, dimensions)
- Upload GLB models to S3 with client-side validation (extension, size, magic bytes)
- Capture bead thumbnails from a preview R3F canvas
- Toggle active/inactive status (soft delete)
- Permanently delete beads (409 conflict when referenced by designs)

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
- **React hooks ordering** — All hooks must appear unconditionally before any early `return null` statements.
- **Camera UX** — Minimal camera movement with natural transitions; avoid disorienting scripted repositioning.
- **GLB convention** — Bead hole axis is local Y. Charms need pivot at bail top, Y-up, face +Z (standardisation in progress with 3D modeler).

## Development

```bash
npm install
npm run dev
```

Local PHP API testing uses MAMP. Database access via TablePlus or phpMyAdmin.

## Deployment

Frontend deploys to Netlify. The `next.config.mjs` rewrites proxy `/models/*` and `/images/*` to the S3 bucket so the frontend never makes cross-origin requests for 3D assets and thumbnails.