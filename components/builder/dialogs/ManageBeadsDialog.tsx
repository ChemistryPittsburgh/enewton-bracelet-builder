"use client";

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { Box3, Vector3, Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial } from "three";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { BeadThumbnail } from "@/components/ui/BeadThumbnail";

import { cn, capitalize, slugify, unslugify } from "@/lib/utils";
import { STATUS_META, getBeadCategoryMeta } from "@/lib/category-colors";

import {
  useAllBeads,
  useCreateBead,
  useUpdateBead,
  useToggleBeadActive,
  useDeleteBead,
  BeadInUseError,
  uploadBeadGlb,
  uploadBeadThumbnail,
  validateGlbFile,
  validateGlbMagicBytes,
} from "@/hooks/useBeadAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useDesigns } from "@/hooks/useDesigns";

import {
  CHARM_ROTATION,
  SCENE_BACKGROUND_PREVIEW_BEAD,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_FAR,
  FINISH_PRESETS,
  DEFAULT_FINISH,
  BEAD_CATEGORIES,
  MATERIAL_OPTIONS,
} from "@/lib/constants";
import type { BeadProduct } from "@/types";


/** Beads are modeled with their cord-hole along Z — rotate 90° around X
 *  so the camera sees the side profile instead of the hole. */
const BEAD_PREVIEW_ROTATION: [number, number, number] = [Math.PI/8, Math.PI/2, Math.PI/6];
const CHARM_PREVIEW_ROTATION: [number, number, number] = [Math.PI / 2, 0, Math.PI/6];

/**
 * Thumbnail capture camera range (metres).
 *
 * Instead of one fixed distance for all beads, the capture measures the
 * model's bounding box and computes an ideal distance, then clamps it:
 *   - MIN: prevents tiny beads (2–3mm) from being microscopic dots
 *   - MAX: prevents large charms (15mm+) from being clipped
 *
 * Items between the two thresholds still appear at their natural relative
 * sizes; only the extremes get adjusted.
 */
const THUMB_MIN_DISTANCE = 0.012;   // closest zoom — small beads
const THUMB_MAX_DISTANCE = 0.045;   // furthest zoom — large charms

// ── GLB preview error boundary ───────────────────────────────────────────────

interface PreviewErrorBoundaryState {
  hasError: boolean;
}

class PreviewErrorBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  PreviewErrorBoundaryState
> {
  state: PreviewErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PreviewErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-error/80">
          <AlertTriangle size={14} className="mr-1.5 shrink-0" />
          Model failed to render
        </div>
      );
    }
    return this.props.children;
  }
}

// ── GLB preview model ────────────────────────────────────────────────────────

function GlbModel({ url, isCharm, finish, onMeasured }: { url: string; isCharm: boolean; finish: string | null; onMeasured?: (dims: { x: number; y: number; z: number }) => void }) {
  const { scene } = useGLTF(url);
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);

    // Apply material finish preset — same logic as BeadOnBracelet
    const finishKey = finish ?? DEFAULT_FINISH;
    const preset = finishKey ? FINISH_PRESETS[finishKey] : undefined;
    if (preset) {
      clone.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const srcMat = child.material;
        if (!(srcMat instanceof MeshStandardMaterial)) return;
        if (srcMat.metalness < 0.5) return;

        const mat = srcMat.clone();
        if (preset.color           !== undefined) mat.color.set(preset.color);
        if (preset.metalness       !== undefined) mat.metalness       = preset.metalness;
        if (preset.roughness       !== undefined) mat.roughness       = preset.roughness;
        if (preset.envMapIntensity !== undefined) mat.envMapIntensity = preset.envMapIntensity;

        if (mat instanceof MeshPhysicalMaterial && mat.clearcoat > 0) {
          mat.clearcoat = 0;
        }

        child.material = mat;
      });
    } else {
      // Non-metal material — force dielectric so painted/colored items
      // (crosses, gems, crystals) render with vibrant base colours.
      clone.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const srcMat = child.material;
        if (!(srcMat instanceof MeshStandardMaterial)) return;
        if (srcMat.metalness <= 0.3) return;

        const mat = srcMat.clone();
        mat.metalness = 0;
        mat.roughness = Math.max(mat.roughness, 0.55);
        mat.envMapIntensity = Math.min(mat.envMapIntensity ?? 1, 0.4);
        child.material = mat;
      });
    }

    // Centre the clone at the origin so rotation pivots around its centre.
    // This replaces <Center> — doing it synchronously in useMemo avoids the
    // timing race that caused off-centre previews on initial charm upload.
    const box = new Box3().setFromObject(clone);
    const center = new Vector3();
    box.getCenter(center);
    clone.position.sub(center);

    return clone;
  }, [scene, finish]);

  const rotation = isCharm ? CHARM_PREVIEW_ROTATION : BEAD_PREVIEW_ROTATION;

  // Fit camera to the rotated model.
  // The clone is already centred at origin (useMemo above), so after rotation
  // it stays visually centred — no <Center> needed, no timing race.
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.updateMatrixWorld(true);

    const box = new Box3().setFromObject(groupRef.current);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const fov = (CAMERA_FOV * Math.PI) / 180;
      const dist = (maxDim * 0.75) / Math.tan(fov / 2);
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }

    // Report raw (pre-rotation) dimensions so the admin can verify size_mm
    const rawBox = new Box3().setFromObject(cloned);
    const rawSize = new Vector3();
    rawBox.getSize(rawSize);
    onMeasured?.({
      x: parseFloat((rawSize.x * 1000).toFixed(2)),
      y: parseFloat((rawSize.y * 1000).toFixed(2)),
      z: parseFloat((rawSize.z * 1000).toFixed(2)),
    });
  }, [cloned, camera, rotation, onMeasured]);

  return (
    <group ref={groupRef} rotation={rotation}>
      <primitive object={cloned} />
    </group>
  );
}

// ── Canvas capture helper — exposes a function to grab the canvas as PNG ─────

/** Must live inside <Canvas>. Populates captureRef with a function that
 *  resets the camera to a front-facing view, renders one frame, and returns
 *  a data URL.
 *
 *  Measures the model's bounding box (mesh-only, excluding lights) and
 *  computes a camera distance clamped between THUMB_MIN_DISTANCE and
 *  THUMB_MAX_DISTANCE. Small beads get zoomed in; large charms get
 *  zoomed out — no more microscopic dots or clipped edges. */
function CaptureHelper({
  captureRef,
}: {
  captureRef: React.MutableRefObject<(() => string | null) | null>;
}) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    captureRef.current = () => {
      // Save camera state
      const savedPos = camera.position.clone();
      const savedQuat = camera.quaternion.clone();

      // Measure only mesh geometry (excludes lights, helpers, etc.)
      const box = new Box3();
      scene.traverse((child) => {
        if (child instanceof Mesh) {
          box.expandByObject(child);
        }
      });
      const size = new Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      // Compute ideal distance from FOV, then clamp to range
      const fov = (CAMERA_FOV * Math.PI) / 180;
      const idealDist = maxDim > 0
        ? (maxDim * 0.75) / Math.tan(fov / 2)
        : (THUMB_MIN_DISTANCE + THUMB_MAX_DISTANCE) / 2;
      const dist = Math.max(THUMB_MIN_DISTANCE, Math.min(THUMB_MAX_DISTANCE, idealDist));

      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      // Render with transparent background (alpha canvas)
      const prevBackground = scene.background;
      scene.background = null;
      gl.render(scene, camera);
      scene.background = prevBackground;
      const dataUrl = gl.domElement.toDataURL("image/png");

      // Restore camera state
      camera.position.copy(savedPos);
      camera.quaternion.copy(savedQuat);
      camera.updateProjectionMatrix();

      return dataUrl;
    };
    return () => {
      captureRef.current = null;
    };
  }, [gl, scene, camera, captureRef]);

  return null;
}

function GlbPreview({
  url,
  isCharm = false,
  finish = null,
  captureRef,
}: {
  url: string;
  isCharm?: boolean;
  finish?: string | null;
  captureRef?: React.MutableRefObject<(() => string | null) | null>;
}) {
  const [renderError, setRenderError] = useState(false);
  const [dims, setDims] = useState<{ x: number; y: number; z: number } | null>(null);

  if (renderError) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-error/80">
        <AlertTriangle size={14} className="mr-1.5 shrink-0" />
        Model failed to render
      </div>
    );
  }

  return (
    <PreviewErrorBoundary onError={() => setRenderError(true)}>
      <div className="relative h-full w-full">
        <Canvas
          camera={{ position: [0, 0, 0.03], fov: CAMERA_FOV, near: CAMERA_NEAR, far: CAMERA_FAR }}
          gl={{ preserveDrawingBuffer: true, alpha: true }}
          style={{ width: "100%", height: "100%", background: SCENE_BACKGROUND_PREVIEW_BEAD }}
        >
          {/* Match main scene lighting (Scene.tsx) */}
          <ambientLight intensity={0.2} color="#fff8f2" />
          <directionalLight position={[0.1, 0.2, 0.1]} intensity={1.1} color="#fffaf6" />
          <directionalLight position={[-0.1, 0.2, -0.1]} intensity={0.5} color="#fff5f0" />
          <Suspense fallback={null}>
            <GlbModel url={url} isCharm={isCharm} finish={finish} onMeasured={setDims} />
            <Environment files="/hdri/lebombo_1k.hdr" background={false} blur={0.85} />
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 2}
            maxPolarAngle={Math.PI / 2}
            autoRotate
            autoRotateSpeed={2}
          />
          {captureRef && <CaptureHelper captureRef={captureRef} />}
        </Canvas>

        {/* Measured dimensions overlay */}
        {dims && (
          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[11px] text-white font-mono leading-relaxed pointer-events-none">
            <span className="opacity-60">W</span> {dims.x}mm
            {" · "}
            <span className="opacity-60">H</span> {dims.y}mm
            {" · "}
            <span className="opacity-60">D</span> {dims.z}mm
          </div>
        )}
      </div>
    </PreviewErrorBoundary>
  );
}

// ── Bead row (view mode) ─────────────────────────────────────────────────────

function BeadRow({
  bead,
  onEdit,
  onToggleActive,
  onDelete,
  isTogglingActive,
  cacheBust,
}: {
  bead: BeadProduct;
  onEdit: (bead: BeadProduct) => void;
  onToggleActive: (bead: BeadProduct) => void;
  onDelete: (bead: BeadProduct) => void;
  isTogglingActive: boolean;
  cacheBust: number;
}) {
  const isInactive = bead.active === 0;

  return (
    <div
      className={`manage-bead-row flex items-center gap-4 pr-2 rounded-[2px] border group transition-colors ${
        isInactive
          ? "border-default bg-grey opacity-60"
          : "border-default bg-white"
      }`}
    >
      <div className="flex flex-col justify-center items-center w-28 h-full min-h-24 object-cover object-center bg-light-grey">
        <BeadThumbnail bead={bead} cacheBust={cacheBust} className="h-full w-full flex-1" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{bead.name}</p>
        <p className="text-xs text-color-base/60 truncate">
          {bead.bead_type ?? "—"}
          {bead.size_mm ? ` · ${bead.size_mm}mm` : ""}
          {bead.material ? ` · ${bead.material}` : ""}
          {bead.sku ? ` · SKU ${bead.sku}` : ""}
        </p>
      </div>

      {/* Category badge */}
      {(() => {
        const cat = getBeadCategoryMeta(bead.bead_category);
        return (
          <span className={`shrink-0 rounded-[2px] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cat.cls}`}>
            {cat.label}
          </span>
        );
      })()}

      {/* Actions — reveal on hover */}
      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(bead)}
          className={`icon-only-btn ${
            isInactive
              ? "inactive"
              : "active"
          }`}
          title="Edit bead"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => onToggleActive(bead)}
          disabled={isTogglingActive}
          className={`icon-only-btn icon-only-btn--error ${
            isInactive
              ? "inactive text-color-base/70 hover:bg-light-mint hover:text-color-base"
              : "active"
          } disabled:opacity-40`}
          title={isInactive ? "Reactivate bead" : "Deactivate bead"}
        >
          {isTogglingActive ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isInactive ? (
            <Eye size={16} />
          ) : (
            <EyeOff size={16} />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Bead form (create / edit) ────────────────────────────────────────────────

interface BeadFormData {
  name: string;
  bead_type: string;
  bead_category: string;
  diameter_mm: string;       // displayed/entered in mm, converted on submit
  size_mm: string;
  sku: string;
  material: string;
  color: string;
  bail_width_mm: string;
  body_width_mm: string;
}

function emptyFormData(): BeadFormData {
  return {
    name: "",
    bead_type: "",
    bead_category: "bead",
    diameter_mm: "",
    size_mm: "",
    sku: "",
    material: "gold",
    color: "",
    bail_width_mm: "",
    body_width_mm: "",
  };
}

function beadToFormData(bead: BeadProduct): BeadFormData {
  return {
    name:          bead.name,
    bead_type:     bead.bead_type ?? "",
    bead_category: bead.bead_category ?? "bead",
    diameter_mm:   String(bead.diameter * 1000),   // metres → mm
    size_mm:       bead.size_mm != null ? String(bead.size_mm) : "",
    sku:           bead.sku ?? "",
    material:      bead.material ?? "",
    color:         bead.color ?? "",
    bail_width_mm: bead.bail_width_mm != null ? String(bead.bail_width_mm) : "",
    body_width_mm: bead.body_width_mm != null ? String(bead.body_width_mm) : "",
  };
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-medium text-color-base/70 uppercase tracking-wide">
      {children}
      {required && <span className="text-error ml-0.5">*</span>}
    </label>
  );
}

function BeadForm({
  initial,
  existingGlbPath,
  onSave,
  onCancel,
  onThumbnailUpdated,
  onToggleActive,
  isInactive,
  isTogglingActive,
  isSaving,
  submitLabel,
}: {
  initial: BeadFormData;
  /** Existing GLB path when editing — shown as the current model. */
  existingGlbPath: string | null;
  onSave: (data: BeadFormData, glbFile: File | null, thumbnailDataUrl: string | null) => void;
  onCancel: () => void;
  onThumbnailUpdated: () => void;
  /** Called to activate/deactivate the bead. Null when creating a new bead. */
  onToggleActive: (() => void) | null;
  isInactive: boolean;
  isTogglingActive: boolean;
  isSaving: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<BeadFormData>(initial);
  const [glbFile, setGlbFile]         = useState<File | null>(null);
  const [glbPreviewUrl, setGlbPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError]     = useState<string | null>(null);
  const [validatingMagic, setValidatingMagic] = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureRef   = useRef<(() => string | null) | null>(null);
  const [updatingThumb, setUpdatingThumb] = useState(false);
  const [thumbUpdated, setThumbUpdated]   = useState(false);
  const [thumbError, setThumbError]       = useState<string | null>(null);

  const isCharm = form.bead_category === "charm";
  const nameValid     = form.name.trim().length > 0;
  const typeValid     = form.bead_type.trim().length > 0;
  // For charms, bail_width_mm is required (used as diameter); for beads, diameter_mm is required
  const diameterValid = isCharm
    ? form.bail_width_mm !== "" && parseFloat(form.bail_width_mm) > 0
    : form.diameter_mm !== "" && parseFloat(form.diameter_mm) > 0;
  const hasGlb        = glbFile !== null || existingGlbPath !== null;
  const canSubmit     = nameValid && typeValid && diameterValid && hasGlb && !validatingMagic;

  // Revoke blob URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (glbPreviewUrl) URL.revokeObjectURL(glbPreviewUrl);
    };
  }, [glbPreviewUrl]);

  const processFile = useCallback(async (file: File) => {
    setFileError(null);

    // Quick checks
    const quickError = validateGlbFile(file);
    if (quickError) {
      setFileError(quickError);
      return;
    }

    // Magic-byte check
    setValidatingMagic(true);
    const magicValid = await validateGlbMagicBytes(file);
    setValidatingMagic(false);

    if (!magicValid) {
      setFileError("File does not appear to be a valid GLB (header check failed).");
      return;
    }

    // Clean up previous preview
    if (glbPreviewUrl) URL.revokeObjectURL(glbPreviewUrl);

    setGlbFile(file);
    setGlbPreviewUrl(URL.createObjectURL(file));
  }, [glbPreviewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset the input so re-selecting the same file triggers onChange
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    // Capture the preview canvas as a thumbnail PNG
    const thumbnailDataUrl = captureRef.current?.() ?? null;
    onSave(form, glbFile, thumbnailDataUrl);
  }

  async function handleUpdateThumbnail() {
    setThumbError(null);
    setThumbUpdated(false);

    // Capture the canvas
    let dataUrl: string | null = null;
    try {
      dataUrl = captureRef.current?.() ?? null;
    } catch (err) {
      console.error("Canvas capture failed:", err);
      setThumbError("Failed to capture preview.");
      return;
    }

    if (!dataUrl) {
      setThumbError("No preview to capture — upload a GLB first.");
      return;
    }

    if (!form.name.trim()) {
      setThumbError("Enter a bead name first.");
      return;
    }

    setUpdatingThumb(true);
    try {
      const beadSlug = slugify(form.name);
      await uploadBeadThumbnail(dataUrl, `${beadSlug}-thumbnail.png`);
      setThumbUpdated(true);
      onThumbnailUpdated();
      setTimeout(() => setThumbUpdated(false), 3000);
    } catch (err: any) {
      console.error("Thumbnail upload failed:", err);
      setThumbError(err.message ?? "Upload failed.");
    } finally {
      setUpdatingThumb(false);
    }
  }

  function update<K extends keyof BeadFormData>(key: K, value: BeadFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const previewUrl = glbPreviewUrl ?? existingGlbPath ?? null;

  return (
    <div className="rounded-[2px] border border-default bg-white">

      {/* Inactive status banner */}
      {isInactive && (
        <div className="flex items-center justify-between gap-3 bg-blush/30 border-b border-blush px-4 py-2.5">
          <div className="flex items-center gap-2">
            <EyeOff size={14} className="text-[#8b3040] shrink-0" />
            <p className="text-xs font-medium text-[#8b3040]">
              This bead is inactive and hidden from the bead selector.
            </p>
          </div>
          {onToggleActive && (
            <button
              onClick={onToggleActive}
              disabled={isTogglingActive}
              className="shrink-0 rounded-sm border border-[#8b3040]/30 bg-white px-3 py-1 text-xs font-medium text-[#8b3040] hover:bg-blush/40 disabled:opacity-40 transition-colors"
            >
              {isTogglingActive ? <Loader2 size={12} className="animate-spin" /> : "Reactivate"}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Left: 3D preview + file upload */}
        <div className="lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-default bg-light-grey/30 flex flex-col">
          {/* Preview canvas */}
          <div className="flex-1 w-full relative">
            <div className="flex h-full relative z-10">
              {previewUrl ? (
                <GlbPreview url={previewUrl} isCharm={isCharm} finish={form.material || null} captureRef={captureRef} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-color-base/40">
                  Upload a GLB to preview
                </div>
              )}
            </div>
            {glbFile && (
              <span className="absolute animate-pulse rounded-[2px] top-0 left-0 bg-blush ring-3 ring-dark-blush inline-flex h-full w-full"></span>
            )}
            {validatingMagic && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
                <Loader2 size={20} className="animate-spin text-color-base/60" />
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div className="p-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 cursor-pointer transition-colors ${
                dragOver
                  ? "border-navy bg-mint/40"
                  : "border-neutral-300 hover:border-navy hover:bg-mint/20"
              }`}
            >
              <Upload size={18} className="text-color-base/50" />
              <p className="text-xs text-color-base/60 text-center">
                {glbFile ? glbFile.name : "Drop a .glb file or click to browse"}
              </p>
              <p className="text-[10px] text-color-base/40">Max 10 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileError && (
              <p className="mt-2 text-xs text-error flex items-center gap-1">
                <AlertTriangle size={12} className="shrink-0" />
                {fileError}
              </p>
            )}
          </div>
          {glbFile && 
            <p className="text-xs pb-2 px-2 font-semibold text-center text-dark-blush">Ensure the model above is rendering correctly before saving.</p>
          }
        </div>

        {/* ── Right: form fields ──────────────────────────────────────────── */}
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto max-h-[440px]">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <FieldLabel required>Name</FieldLabel>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
              placeholder="e.g. Admire"
              className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
            />
          </div>

          {/* Bead type + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <FieldLabel required>Item type</FieldLabel>
              <input
                type="text"
                value={form.bead_type}
                onChange={(e) => update("bead_type", e.target.value)}
                placeholder="e.g. Admire, Disc, etc."
                className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel required>Category</FieldLabel>
              <select
                value={form.bead_category}
                onChange={(e) => update("bead_category", e.target.value)}
                className="rounded-[2px] border border-default bg-white px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
              >
                {BEAD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {unslugify(cat, "_")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diameter + Size row — diameter hidden for charms (uses bail_width_mm instead) */}
          <div className="grid grid-cols-2 gap-3">
            {!isCharm && (
              <div className="flex flex-col gap-1">
                <FieldLabel required>Diameter (mm)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.diameter_mm}
                  onChange={(e) => update("diameter_mm", e.target.value)}
                  placeholder="e.g. 6"
                  className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <FieldLabel>Size (mm)</FieldLabel>
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.size_mm}
                onChange={(e) => update("size_mm", e.target.value)}
                placeholder="e.g. 6"
                className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
              />
            </div>
          </div>

          {/* Material + SKU row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <FieldLabel>Material</FieldLabel>
              <select
                value={form.material}
                onChange={(e) => update("material", e.target.value)}
                className="rounded-[2px] border border-default bg-white px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
              >
                <option value="">None</option>
                {MATERIAL_OPTIONS.map((mat) => (
                  <option key={mat} value={mat}>
                    {mat.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel>SKU</FieldLabel>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => update("sku", e.target.value)}
                placeholder="e.g. 00000"
                className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
              />
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1">
            <FieldLabel>Color</FieldLabel>
            <input
              type="text"
              value={form.color}
              onChange={(e) => update("color", e.target.value)}
              placeholder="e.g. rose, ivory"
              className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
            />
            <p className="text-xs text-color-base/60 italic">Color can be left blank (if item is metal/gold/silver/etc)</p>
          </div>

          {/* Charm-specific fields — only visible when category is "charm" */}
          {isCharm && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-default/50">
              <div className="flex flex-col gap-1">
                <FieldLabel required>Bail width (mm)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.bail_width_mm}
                  onChange={(e) => update("bail_width_mm", e.target.value)}
                  className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
                />
                <p className="text-xs text-color-base/60 italic">Average bail: 0.5</p>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>Body width (mm)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={form.body_width_mm}
                  onChange={(e) => update("body_width_mm", e.target.value)}
                  className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy transition-colors"
                />
              </div>
            </div>
          )}
          {previewUrl && (
            <Button
              variant="ghost"
              size="sm"
              disabled={updatingThumb || !form.name.trim()}
              onClick={handleUpdateThumbnail}
              className="max-w-[200px] py-2"
            >
              {updatingThumb ? (
                <Loader2 size={12} className="animate-spin" />
              ) : thumbUpdated ? (
                <Check size={12} className="text-[#0d5c52]" />
              ) : (
                <Camera size={12} />
              )}
              {thumbUpdated ? "Updated!" : "Update Thumbnail"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Footer buttons ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-t border-default px-4 py-3">
        {/* Deactivate button — right-aligned, only shown for active beads in edit mode */}
        {onToggleActive && !isInactive && hasGlb && (
          <button
            onClick={onToggleActive}
            disabled={isTogglingActive}
            className="ml-auto flex items-center gap-1.5 text-xs text-color-base/50 p-2 rounded-[2px] hover:text-error hover:bg-error/10 disabled:opacity-40 transition-colors"
          >
            {isTogglingActive ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
            Deactivate
          </button>
        )}
        <div className="flex flex-col gap-2 flex-1 justify-center items-end">
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={onCancel} disabled={isSaving}>
              <X size={12} /> Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !canSubmit}
              size="md"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {submitLabel}
            </Button>
          </div>
          <div className="text-right">
            {thumbError && (
              <p className="ml-auto text-xs text-error flex items-center gap-1">
                <AlertTriangle size={12} className="shrink-0" />
                {thumbError}
              </p>
            )}
            {!hasGlb && !thumbError && (
              <p className="ml-auto text-xs text-color-base/50 italic">
                A GLB file is required
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Designs containing this bead ─────────────────────────────────────────────

function BeadDesignsList({ productId }: { productId: number }) {
  const { data: allDesigns = [], isLoading } = useDesigns();

  const designs = useMemo(
    () =>
      allDesigns.filter((d) =>
        d.configuration?.beads?.some((b) => b.product_id === productId),
      ),
    [allDesigns, productId],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-color-base/50">
        <Loader2 size={12} className="animate-spin" /> Loading designs…
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <p className="py-2 text-xs text-color-base/50 italic">
        This item is not used in any saved designs.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {designs.map((d) => {
        const isDiscontinued = d.is_discontinued === 1;
        const meta = isDiscontinued
          ? STATUS_META.discontinued
          : STATUS_META[d.status] ?? null;
        const count = d.configuration.beads.filter(
          (b) => b.product_id === productId,
        ).length;

        return (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-[2px] border border-default bg-white"
          >
            {/* Thumbnail */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[2px] bg-light-grey">
              {d.preview_image_url ? (
                <img
                  src={d.preview_image_url}
                  alt={d.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>

            {/* Name + count */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{d.name}</p>
              {count > 1 && (
                <p className="text-xs text-color-base/50">×{count} items</p>
              )}
            </div>

            {/* Status badge */}
            {meta && (
              <div className="shrink-0 pr-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}
                >
                  {meta.label}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Edit-mode footer: designs list + delete ──────────────────────────────────

function EditModeFooter({
  bead,
  onDelete,
}: {
  bead: BeadProduct;
  onDelete: (bead: BeadProduct) => void;
}) {
  const { data: allDesigns = [], isLoading } = useDesigns();

  const designCount = useMemo(
    () =>
      allDesigns.filter((d) =>
        d.configuration?.beads?.some((b) => b.product_id === bead.id),
      ).length,
    [allDesigns, bead.id],
  );

  const isUsed = designCount > 0;

  return (
    <div className="pt-4 flex flex-col gap-4">
      {/* Designs list */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide text-color-base/70 mb-2">
          Used in designs
        </h4>
        <BeadDesignsList productId={bead.id} />
      </div>

      {/* Delete section */}
      <div className="pt-4">
        <div className="flex items-center justify-between rounded-[2px] border border-error/20 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Delete this item</p>
            <p className="text-xs text-color-base/60">
              {isLoading
                ? "Checking design usage…"
                : isUsed
                  ? `${bead.name} is used in ${designCount} ${designCount === 1 ? "design" : "designs"} and cannot be deleted. Remove it from all designs first.`
                  : `${bead.name} is not used in any designs and can be safely deleted.`}
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            className="ml-3 shrink-0"
            disabled={isUsed || isLoading}
            onClick={() => onDelete(bead)}
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main dialog ──────────────────────────────────────────────────────────────

interface ManageBeadsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ManageBeadsDialog({ open, onClose }: ManageBeadsDialogProps) {
  const { data: allBeads = [], isLoading } = useAllBeads();
  const { canManageComponents } = usePermissions();

  const { mutate: createBead, isPending: creating } = useCreateBead();
  const { mutate: updateBead, isPending: updating } = useUpdateBead();
  const { mutate: toggleActive, isPending: toggling } = useToggleBeadActive();
  const { mutate: deleteBead, isPending: deleting } = useDeleteBead();

  const [mode, setMode]             = useState<"list" | "create" | "edit">("list");
  const [editingBead, setEditingBead] = useState<BeadProduct | null>(null);
  const [togglingId, setTogglingId]   = useState<number | null>(null);
  const [search, setSearch]           = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [thumbVersion, setThumbVersion] = useState(0);

  // ── Delete bead state ────────────────────────────────────────────────────
  const [beadToDelete, setBeadToDelete]           = useState<BeadProduct | null>(null);
  const [deleteError, setDeleteError]             = useState<string | null>(null);
  const [blockingDesigns, setBlockingDesigns]     = useState<{ id: number; name: string; status: string }[]>([]);


  // ── Filtered bead list ──────────────────────────────────────────────────
  const filteredBeads = useMemo(() => {
    let list = allBeads;

    if (statusFilter === "active") {
      list = list.filter((b) => b.active === 1);
    } else if (statusFilter === "inactive") {
      list = list.filter((b) => b.active === 0);
    }

    if (categoryFilter !== "all") {
      list = list.filter((b) => (b.bead_category ?? "bead") === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.bead_type ?? "").toLowerCase().includes(q) ||
          (b.sku ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [allBeads, search, categoryFilter, statusFilter]);

  // ── Handlers ────────────────────────────────────────────────────────────
  function resetState() {
    setMode("list");
    setEditingBead(null);
    setUploadError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function openCreate() {
    setEditingBead(null);
    setUploadError(null);
    setMode("create");
  }

  function openEdit(bead: BeadProduct) {
    setUploadError(null);
    setEditingBead(bead);
    setMode("edit");
  }

  function handleToggleActive(bead: BeadProduct) {
    setTogglingId(bead.id);
    const newActive = bead.active !== 1;
    toggleActive(
      { slug: bead.slug, active: newActive },
      {
        onSuccess: () => {
          if (editingBead?.id === bead.id) {
            setEditingBead({ ...bead, active: newActive ? 1 : 0 });
          }
        },
        onSettled: () => setTogglingId(null),
      },
    );
  }

  function openDeleteConfirm(bead: BeadProduct) {
    setDeleteError(null);
    setBlockingDesigns([]);
    setBeadToDelete(bead);
  }

  function handleDeleteBead() {
    if (!beadToDelete) return;
    setDeleteError(null);
    setBlockingDesigns([]);
    deleteBead(beadToDelete.id, {
      onSuccess: () => {
        setBeadToDelete(null);
      },
      onError: (err) => {
        if (err instanceof BeadInUseError) {
          setBlockingDesigns(err.designs);
          setDeleteError(err.message);
        } else {
          setDeleteError(err instanceof Error ? err.message : "Delete failed.");
        }
      },
    });
  }

  async function handleSave(data: BeadFormData, glbFile: File | null, thumbnailDataUrl: string | null) {
    setUploadError(null);

    try {
      // Upload GLB if a new file was provided
      let glbPath = editingBead?.glb_path ?? "";

      if (glbFile) {
        glbPath = await uploadBeadGlb(glbFile);
      }

      const beadSlug = slugify(data.name);

      // Upload auto-generated thumbnail if we captured one
      if (thumbnailDataUrl) {
        try {
          await uploadBeadThumbnail(thumbnailDataUrl, `${beadSlug}-thumbnail.png`);
        } catch {
          // Non-fatal — the bead still gets created, thumbnail just falls
          // back to the gradient placeholder in BeadSelectorPanel.
          console.warn("Thumbnail upload failed; item will use placeholder.");
        }
      }

      const diameterMm = parseFloat(data.diameter_mm);
      const isCharmCategory = data.bead_category === "charm";

      // For charms, diameter = bail width (the cord-hole), not the overall size.
      // If bail_width_mm is filled in, use that as the diameter instead.
      const diameterMetres = isCharmCategory && data.bail_width_mm
        ? parseFloat(data.bail_width_mm) / 1000
        : diameterMm / 1000;

      const payload = {
        name:          data.name.trim(),
        slug:          beadSlug,
        glb_path:      glbPath,
        bead_type:     data.bead_type.trim(),
        bead_category: data.bead_category,
        diameter:      diameterMetres,
        size_mm:       data.size_mm ? parseFloat(data.size_mm) : null,
        sku:           data.sku.trim() || null,
        material:      data.material || null,
        color:         data.color.trim() || null,
        bail_width_mm: data.bail_width_mm ? parseFloat(data.bail_width_mm) : null,
        body_width_mm: data.body_width_mm ? parseFloat(data.body_width_mm) : null,
      };

      if (mode === "edit" && editingBead) {
        updateBead(
          { id: editingBead.id, ...payload },
          {
            onSuccess: () => resetState(),
            onError: (err) => {
              setUploadError(err instanceof Error ? err.message : "Failed to update item. Please try again.");
            },
          },
        );
      } else {
        createBead(payload, {
          onSuccess: () => resetState(),
          onError: (err) => {
            setUploadError(err instanceof Error ? err.message : "Failed to create item. Please try again.");
          },
        });
      }
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed.");
    }
  }
  // Header "Back to Bead Library" button — shown only when editing/creating
  const headerBackButton = mode !== "list" ? (
    <button
      onClick={resetState}
      className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium text-color-base/70 hover:bg-light-grey hover:text-color-base transition-colors"
    >
      <ArrowLeft size={14} />
      Back to Library
    </button>
  ) : undefined;

  return (
    <FullScreenDialog
      open={open}
      onClose={handleClose}
      title="Upload / Edit Inventory"
      className="max-w-3xl"
      bodyClasses="px-5 py-4 max-h-[75vh] overflow-y-auto"
      headerExtra={headerBackButton}
    >
      <div className={`flex flex-col gap-4 ${
        mode === "list" && "pb-20"
      }`}>
        <p className="text-sm text-color-base/70">
          Manage the inventory library. Upload new GLB models, edit metadata, or deactivate items that are no longer in use.
        </p>

        {uploadError && <ErrorAlert message={uploadError} />}

        {/* ── Create / Edit form ────────────────────────────────────────── */}
        {mode !== "list" && (
          <BeadForm
            initial={
              mode === "edit" && editingBead
                ? beadToFormData(editingBead)
                : emptyFormData()
            }
            existingGlbPath={
              mode === "edit" && editingBead ? editingBead.glb_path : null
            }
            onSave={handleSave}
            onCancel={resetState}
            onThumbnailUpdated={() => setThumbVersion((v) => v + 1)}
            onToggleActive={
              mode === "edit" && editingBead
                ? () => handleToggleActive(editingBead)
                : null
            }
            isInactive={mode === "edit" && editingBead?.active === 0}
            isTogglingActive={toggling && togglingId === editingBead?.id}
            isSaving={creating || updating}
            submitLabel={mode === "edit" ? "Save changes" : "Create item"}
          />
        )}

        {/* ── Designs using this bead (edit mode only) ────────────────────── */}
        {mode === "edit" && editingBead && (
          <EditModeFooter
            bead={editingBead}
            onDelete={openDeleteConfirm}
          />
        )}

        {/* ── List mode ─────────────────────────────────────────────────── */}
        {mode === "list" && (
          <>
            {/* Search + filters toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="text"
                  placeholder="Search by name, type, or SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-[2px] border border-default py-2 pl-3 pr-16 text-sm outline-none placeholder:text-color-base/50 focus:border-navy transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-[2px] text-color-base/40 bg-white hover:text-color-base hover:bg-light-grey focus:ring-navy transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                <Search
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-color-base/40"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-[2px] min-w-[180px] border border-default bg-white px-3 py-2 text-sm outline-none focus:border-navy focus:ring-navy"
              >
                <option value="all">All categories</option>
                {BEAD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {unslugify(cat, "_")}
                  </option>
                ))}
              </select>

              {/* Status segmented control */}
              <div className="flex rounded-[2px] border border-default bg-white overflow-hidden">
                {([
                  { label: "Active",   value: "active"   },
                  { label: "Inactive", value: "inactive" },
                  { label: "All",      value: "all"      },
                ] as const).map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={cn(
                      "px-3 py-2 text-xs font-semibold transition-all",
                      statusFilter === value
                        ? "bg-navy text-white"
                        : "text-color-base hover:bg-mint",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bead list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-color-base/60" />
              </div>
            ) : filteredBeads.length === 0 ? (
              <p className="py-8 text-center text-sm text-color-base/50">
                {allBeads.length === 0
                  ? "No beads in the library yet."
                  : "No beads match your filters."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-color-base/50">
                  {filteredBeads.length} {filteredBeads.length === 1 ? "item" : "items"}
                </p>
                {filteredBeads.map((bead) => (
                  <BeadRow
                    key={bead.id}
                    bead={bead}
                    onEdit={openEdit}
                    onToggleActive={handleToggleActive}
                    onDelete={openDeleteConfirm}
                    isTogglingActive={toggling && togglingId === bead.id}
                    cacheBust={thumbVersion}
                  />
                ))}
              </div>
            )}

            {/* New bead button */}
            {canManageComponents && (
              <div className="fixed w-full bottom-0 left-0 right-0 bg-white border-t border-default px-6 py-3">
                <Button
                  onClick={openCreate}
                  variant="dashed"
                  className="flex items-center gap-2 self-start dashed-border"
                >
                  <Plus size={15} /> Upload new item
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete bead confirmation overlay ──────────────────────────────── */}
      {beadToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-error/10">
                <Trash2 size={16} className="text-error" />
              </div>
              <h3 className="text-base font-semibold">Delete item</h3>
            </div>

            <p className="text-sm text-color-base/80">
              Permanently delete <span className="font-semibold">"{beadToDelete.name}"</span> from the inventory? This cannot be undone.
            </p>

            {/* Blocking designs (409 response) */}
            {blockingDesigns.length > 0 && (
              <div className="mt-3 rounded-lg border border-error/20 bg-error/5 p-3">
                <p className="text-sm font-medium text-error mb-2">
                  This item is used in {blockingDesigns.length} {blockingDesigns.length === 1 ? "design" : "designs"} and cannot be deleted:
                </p>
                <ul className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {blockingDesigns.map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{d.name}</span>
                      <span className="ml-2 shrink-0 rounded-full bg-stone/40 px-2 py-0.5 text-[10px] uppercase">{d.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Generic error */}
            {deleteError && blockingDesigns.length === 0 && (
              <div className="mt-3">
                <ErrorAlert message={deleteError} />
              </div>
            )}

            <div className="mt-5 flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBeadToDelete(null)}
                disabled={deleting}
              >
                {blockingDesigns.length > 0 ? "Close" : "Cancel"}
              </Button>
              {blockingDesigns.length === 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteBead}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete item
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </FullScreenDialog>
  );
}