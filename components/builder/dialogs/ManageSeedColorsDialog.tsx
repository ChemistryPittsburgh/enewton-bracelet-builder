"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Sparkle,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tooltip } from "@/components/ui/Tooltip";

import { usePermissions } from "@/hooks/usePermissions";
import {
  useSeedColors,
  useCreateSeedColor,
  useUpdateSeedColor,
  useToggleSeedColorStatus,
  useDeleteSeedColor,
  type ApiSeedColor,
} from "@/hooks/useSeedColors";
import {
  useSeedPresets,
  useCreateSeedPreset,
  useUpdateSeedPreset,
  useToggleSeedPresetStatus,
  useDeleteSeedPreset,
  type ApiSeedPreset,
  type SeedPresetColorInput,
} from "@/hooks/useSeedPresets";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Normalises user hex input: prepends "#", lowercases. Returns null if invalid. */
function normaliseHex(input: string): string | null {
  let h = input.trim().toLowerCase();
  if (!h.startsWith("#")) h = `#${h}`;
  return HEX_RE.test(h) ? h : null;
}

function distributeEvenly(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

type StatusFilter = "active" | "inactive" | "all";

function matchesStatus(active: number, f: StatusFilter): boolean {
  if (f === "active") return !!active;
  if (f === "inactive") return !active;
  return true;
}

/** Active / Inactive / All segmented control — mirrors the bead inventory screen. */
function StatusToggle({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  return (
    <div className="flex overflow-hidden rounded-[2px] border border-default bg-white">
      {(
        [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
          { label: "All", value: "all" },
        ] as const
      ).map(({ label, value: v }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 text-xs font-semibold transition-all ${
            value === v ? "bg-navy text-white" : "text-color-base hover:bg-mint"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Colors tab ────────────────────────────────────────────────────────────────

function ColorRow({
  color,
  inactive,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  color: ApiSeedColor;
  inactive: boolean;
  busy: boolean;
  onEdit: (c: ApiSeedColor) => void;
  onToggle: (c: ApiSeedColor) => void;
  onDelete: (c: ApiSeedColor) => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-neutral-100 px-4 py-2.5 ${
        inactive ? "bg-light-grey/40" : "bg-white"
      }`}
    >
      <span
        className={`h-6 w-6 shrink-0 rounded-full border border-color-base/20 ${inactive ? "opacity-50" : ""}`}
        style={{ backgroundColor: color.hex }}
      />
      <span className={`flex-1 text-sm font-medium ${inactive ? "opacity-50" : ""}`}>{color.label}</span>
      {inactive && (
        <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-error">
          Inactive
        </span>
      )}
      {color.is_metallic && (
        <span
          className={`flex items-center gap-1 rounded-[2px] bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold ${
            inactive ? "opacity-50" : ""
          }`}
        >
          <Sparkle size={10} /> Metallic
        </span>
      )}
      <span className={`font-mono text-xs uppercase text-color-base/70 ${inactive ? "opacity-50" : ""}`}>
        {color.hex}
      </span>

      <div className="flex items-center gap-1 opacity-50 transition-opacity group-hover:opacity-100">
        <Tooltip content="Edit Color">
          <button onClick={() => onEdit(color)} className="icon-only-btn" title="Edit color">
            <Pencil size={14} />
          </button>
        </Tooltip>
        <Tooltip content={inactive ? "Reactivate Color" : "Activate Color"} >
          <button
            onClick={() => onToggle(color)}
            disabled={busy}
            className={`icon-only-btn disabled:opacity-40 ${inactive ? "icon-only-btn--green" : "icon-only-btn--error"}`}
            aria-label={inactive ? "Reactivate color" : "Deactivate color"}
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : inactive ? (
              <Eye size={14} />
            ) : (
              <EyeOff size={14} />
            )}
          </button>
        </Tooltip>
        <Tooltip content="Delete Color">
          <button
            onClick={() => onDelete(color)}
            className="icon-only-btn icon-only-btn--error"
            aria-label="Delete color permanently"
          >
            <Trash2 size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function ColorEditRow({
  initial,
  isSaving,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: { hex: string; label: string; is_metallic: boolean };
  isSaving: boolean;
  submitLabel: string;
  onSave: (v: { hex: string; label: string; is_metallic: boolean }) => void;
  onCancel: () => void;
}) {
  const [hex, setHex] = useState(initial.hex);
  const [label, setLabel] = useState(initial.label);
  const [isMetallic, setIsMetallic] = useState(initial.is_metallic);

  const normalised = normaliseHex(hex);
  const valid = normalised !== null && label.trim().length > 0;

  function submit() {
    if (!valid) return;
    onSave({ hex: normalised!, label: label.trim(), is_metallic: isMetallic });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-default bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Native swatch picker */}
        <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-color-base/20">
          <span className="absolute inset-0" style={{ backgroundColor: normalised ?? "#ffffff" }} />
          <input
            type="color"
            value={normalised ?? "#ffffff"}
            onChange={(e) => setHex(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        {/* Hex */}
        <input
          type="text"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          placeholder="#D4AF37"
          spellCheck={false}
          className="w-28 rounded border border-default px-2.5 py-1.5 font-mono text-sm uppercase outline-none focus:border-grey"
        />

        {/* Label */}
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Color name"
          className="flex-1 rounded border border-default px-3 py-1.5 text-sm outline-none focus:border-grey"
        />
      </div>

      {/* Metallic toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-color-base/70">Finish</span>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMetallic(true)}
            className={`flex items-center gap-1 rounded-[2px] border px-2.5 py-1 text-xs transition-all ${
              isMetallic ? "border-navy bg-mint font-medium" : "border-default bg-white hover:bg-shell"
            }`}
          >
            <Sparkle size={11} /> Metallic
          </button>
          <button
            onClick={() => setIsMetallic(false)}
            className={`flex items-center gap-1 rounded-[2px] border px-2.5 py-1 text-xs transition-all ${
              !isMetallic ? "border-navy bg-mint font-medium" : "border-default bg-white hover:bg-shell"
            }`}
          >
            <Circle size={11} /> Matte
          </button>
        </div>
      </div>

      {!normalised && hex.trim().length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-error">
          <AlertTriangle size={12} className="shrink-0" /> Enter a valid 6-digit hex (e.g. #D4AF37).
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={isSaving || !valid} size="sm" variant="secondary">
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {submitLabel}
        </Button>
        <Button onClick={onCancel} disabled={isSaving} size="sm" variant="ghost">
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
}

function ColorDeleteRow({
  color,
  usedBy,
  busy,
  onConfirm,
  onDeactivate,
  onCancel,
}: {
  color: ApiSeedColor;
  /** Names of presets that reference this color. Non-empty = deletion blocked. */
  usedBy: string[];
  busy: boolean;
  onConfirm: () => void;
  onDeactivate: () => void;
  onCancel: () => void;
}) {
  const blocked = usedBy.length > 0;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-error bg-light-grey/50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-error/80" />
        <div>
          {blocked ? (
            <>
              <p className="text-sm font-medium text-error">Can&rsquo;t delete &ldquo;{color.label}&rdquo;</p>
              <p className="mt-0.5 text-sm">
                It&rsquo;s used by {usedBy.length} preset{usedBy.length > 1 ? "s" : ""}: {usedBy.join(", ")}.
                {color.active
                  ? " Deactivate it instead, or remove it from those presets first."
                  : " Remove it from those presets first."}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-error">Delete &ldquo;{color.label}&rdquo; permanently?</p>
              <p className="mt-0.5 text-sm">
                This can&rsquo;t be undone. Saved bracelet designs keep their own color copies and are
                unaffected.
              </p>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {blocked ? (
          color.active && (
            <Button onClick={onDeactivate} disabled={busy} variant="secondary" size="xs">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />} Deactivate instead
            </Button>
          )
        ) : (
          <Button onClick={onConfirm} disabled={busy} variant="danger" size="xs">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
          </Button>
        )}
        <Button onClick={onCancel} disabled={busy} size="xs" variant="ghost">
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Presets tab ───────────────────────────────────────────────────────────────

function PresetRow({
  preset,
  inactive,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  preset: ApiSeedPreset;
  inactive: boolean;
  busy: boolean;
  onEdit: (p: ApiSeedPreset) => void;
  onToggle: (p: ApiSeedPreset) => void;
  onDelete: (p: ApiSeedPreset) => void;
}) {
  const total = preset.colors.reduce((s, c) => s + c.percent, 0) || 1;
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-neutral-100 px-4 py-2.5 ${
        inactive ? "bg-light-grey/40" : "bg-white"
      }`}
    >
      <span className={`w-28 shrink-0 truncate text-sm font-medium ${inactive ? "opacity-50" : ""}`}>
        {preset.name}
      </span>

      {/* Proportional bar */}
      <div className={`flex h-4 flex-1 overflow-hidden rounded-[2px] border border-color-base/10 ${inactive ? "opacity-50" : ""}`}>
        {preset.colors.map((c, i) => (
            <span
              key={i}
              title={`${c.label} · ${c.percent}%`}
              style={{ backgroundColor: c.hex, width: `${(c.percent / total) * 100}%` }}
            />
        ))}
      </div>

      {inactive ? (
        <span className="shrink-0 rounded-full bg-shell px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-color-base/60">
          Inactive
        </span>
      ) : (
        <span className="shrink-0 text-xs text-color-base/50">{preset.colors.length} colors</span>
      )}

      <div className="flex items-center gap-1 opacity-50 transition-opacity group-hover:opacity-100">
        <Tooltip content="Edit Preset">
          <button onClick={() => onEdit(preset)} className="icon-only-btn" aria-label="Edit preset">
            <Pencil size={14} />
          </button>
        </Tooltip>
        <Tooltip content={inactive ? "Reactivate preset" : "Deactivate preset"}>
          <button
            onClick={() => onToggle(preset)}
            disabled={busy}
            className="icon-only-btn icon-only-btn--error disabled:opacity-40"
            aria-label={inactive ? "Reactivate preset" : "Deactivate preset"}
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : inactive ? (
              <Eye size={14} />
            ) : (
              <EyeOff size={14} />
            )}
          </button>
        </Tooltip>
        <Tooltip content="Delete Preset">
          <button
            onClick={() => onDelete(preset)}
            className="icon-only-btn icon-only-btn--error"
            title="Delete preset permanently"
          >
            <Trash2 size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

interface DraftPresetColor {
  color_id: number;
  hex: string;
  label: string;
  percent: number;
}

function PresetEditor({
  initial,
  palette,
  isSaving,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: { name: string; colors: DraftPresetColor[] };
  palette: ApiSeedColor[];
  isSaving: boolean;
  submitLabel: string;
  onSave: (v: { name: string; colors: SeedPresetColorInput[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [colors, setColors] = useState<DraftPresetColor[]>(initial.colors);

  const total = colors.reduce((s, c) => s + c.percent, 0);
  const available = palette.filter((p) => !colors.some((c) => c.color_id === p.id));
  // The API requires percentages to sum to exactly 100 (422 otherwise), so the
  // editor enforces it before allowing save.
  const valid = name.trim().length > 0 && colors.length > 0 && total === 100;

  function addColor(c: ApiSeedColor) {
    setColors((prev) => [...prev, { color_id: c.id, hex: c.hex, label: c.label, percent: 0 }]);
  }

  function removeColor(colorId: number) {
    setColors((prev) => prev.filter((c) => c.color_id !== colorId));
  }

  function setPercent(colorId: number, percent: number) {
    const clamped = Math.max(0, Math.min(100, Number.isNaN(percent) ? 0 : percent));
    setColors((prev) => prev.map((c) => (c.color_id === colorId ? { ...c, percent: clamped } : c)));
  }

  function balance() {
    const even = distributeEvenly(colors.length);
    setColors((prev) => prev.map((c, i) => ({ ...c, percent: even[i] })));
  }

  function submit() {
    if (!valid) return;
    onSave({
      name: name.trim(),
      colors: colors.map((c, i) => ({ color_id: c.color_id, percent: c.percent, sort_order: i + 1 })),
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-white p-4 shadow-sm">
      {/* Name */}
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Preset name (e.g. Berry)"
        className="w-full rounded border border-default px-3 py-1.5 text-sm outline-none focus:border-grey"
      />

      {/* Selected colors */}
      {colors.length > 0 ? (
        <div className="flex flex-col gap-2">
          {colors.map((c) => (
            <div key={c.color_id} className="flex items-center gap-2.5">
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-color-base/20"
                style={{ backgroundColor: c.hex }}
              />
              <span className="flex-1 truncate text-[13px]">{c.label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={c.percent}
                onChange={(e) => setPercent(c.color_id, parseInt(e.target.value))}
                className="w-16 rounded border border-default px-2 py-1 text-right text-sm outline-none focus:border-grey"
              />
              <span className="w-3 text-xs text-color-base/50">%</span>
              <Tooltip content={`Remove ${c.label}`} placement="left">
                <button
                  onClick={() => removeColor(c.color_id)}
                  className="icon-only-btn icon-only-btn--error"
                  aria-label="Remove color"
                >
                  <X size={13} />
                </button>
              </Tooltip>
            </div>
          ))}

          {/* Total + balance */}
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-xs font-medium ${total === 100 ? "text-[#0d5c52]" : "text-error"}`}>
              Total: {total}%{total !== 100 && " — must equal 100%"}
            </span>
            <button
              onClick={balance}
              className="ml-auto rounded-[2px] border border-default px-2 py-1 text-xs hover:bg-shell"
            >
              Distribute evenly
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-color-base/60">Add at least one color from the palette below.</p>
      )}

      {/* Palette */}
      {available.length > 0 && (
        <div>
          <SectionHeading className="mb-1.5">Add color</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {available.map((c) => (
              <Tooltip content={c.label}>
                <button
                  key={c.id}
                  onClick={() => addColor(c)}
                  title={c.label}
                  className="h-6 w-6 rounded-full border border-color-base/30 transition-all hover:ring-2 hover:ring-navy"
                  style={{ backgroundColor: c.hex }}
                />
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={isSaving || !valid} size="sm" variant="secondary">
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {submitLabel}
        </Button>
        <Button onClick={onCancel} disabled={isSaving} size="sm" variant="ghost">
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
}

function PresetDeleteRow({
  preset,
  busy,
  onConfirm,
  onCancel,
}: {
  preset: ApiSeedPreset;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-error bg-light-grey/50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-error/80" />
        <div>
          <p className="text-sm font-medium text-error">Delete &ldquo;{preset.name}&rdquo; permanently?</p>
          <p className="mt-0.5 text-sm">
            This can&rsquo;t be undone. Saved designs that used this preset keep their own colorway copy
            and are unaffected.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onConfirm} disabled={busy} variant="danger" size="xs">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
        </Button>
        <Button onClick={onCancel} disabled={busy} size="xs" variant="ghost">
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

type Tab = "colors" | "presets";
/** null = none, "new" = create form, number = editing that id. */
type EditTarget = number | "new" | null;

interface ManageSeedColorsDialogProps {
  open: boolean;
  onClose: () => void;
  includeBackDropBlur?: boolean;
}

export function ManageSeedColorsDialog({
  open,
  onClose,
  includeBackDropBlur = true,
}: ManageSeedColorsDialogProps) {
  const { isAdmin } = usePermissions();

  // Admin view needs inactive rows too (filtered client-side). Only fetch while
  // the dialog is open to an admin — it's mounted persistently by BuilderLayout.
  const fetchEnabled = open && isAdmin;
  const { data: colors = [], isLoading: colorsLoading } = useSeedColors({ includeInactive: true, enabled: fetchEnabled });
  const { data: presets = [], isLoading: presetsLoading } = useSeedPresets({ includeInactive: true, enabled: fetchEnabled });

  const { mutate: createColor, isPending: creatingColor, error: createColorErr } = useCreateSeedColor();
  const { mutate: updateColor, isPending: updatingColor, error: updateColorErr } = useUpdateSeedColor();
  const { mutate: toggleColor, error: toggleColorErr } = useToggleSeedColorStatus();
  const { mutate: deleteColor, error: deleteColorErr } = useDeleteSeedColor();

  const { mutate: createPreset, isPending: creatingPreset, error: createPresetErr } = useCreateSeedPreset();
  const { mutate: updatePreset, isPending: updatingPreset, error: updatePresetErr } = useUpdateSeedPreset();
  const { mutate: togglePreset, error: togglePresetErr } = useToggleSeedPresetStatus();
  const { mutate: deletePreset, error: deletePresetErr } = useDeleteSeedPreset();

  const [tab, setTab] = useState<Tab>("colors");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const [colorEdit, setColorEdit] = useState<EditTarget>(null);
  const [deleteColorTarget, setDeleteColorTarget] = useState<ApiSeedColor | null>(null);
  const [busyColorId, setBusyColorId] = useState<number | null>(null);

  const [presetEdit, setPresetEdit] = useState<EditTarget>(null);
  const [deletePresetTarget, setDeletePresetTarget] = useState<ApiSeedPreset | null>(null);
  const [busyPresetId, setBusyPresetId] = useState<number | null>(null);

  function resetAll() {
    setColorEdit(null);
    setDeleteColorTarget(null);
    setPresetEdit(null);
    setDeletePresetTarget(null);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  // Active palette feeds the preset "Add color" picker (don't offer retired colors).
  const activeColors = useMemo(() => colors.filter((c) => c.active), [colors]);
  // Lists shown in each tab, filtered by the status segmented control.
  const visibleColors = useMemo(
    () => colors.filter((c) => matchesStatus(c.active, statusFilter)),
    [colors, statusFilter],
  );
  const visiblePresets = useMemo(
    () => presets.filter((p) => matchesStatus(p.active, statusFilter)),
    [presets, statusFilter],
  );

  /** Names of presets (active or inactive) that reference a given color. */
  function presetsUsingColor(colorId: number): string[] {
    return presets.filter((p) => p.colors.some((c) => c.color_id === colorId)).map((p) => p.name);
  }

  // Defensive: never render manage UI for non-admins even if somehow opened.
  if (!isAdmin) return null;

  const colorMutationErr = createColorErr ?? updateColorErr ?? toggleColorErr ?? deleteColorErr;
  const presetMutationErr = createPresetErr ?? updatePresetErr ?? togglePresetErr ?? deletePresetErr;

  // ── Color actions ──────────────────────────────────────────────────────────

  function saveNewColor(v: { hex: string; label: string; is_metallic: boolean }) {
    createColor(v, { onSuccess: () => setColorEdit(null) });
  }

  function saveColor(id: number, v: { hex: string; label: string; is_metallic: boolean }) {
    updateColor({ id, ...v }, { onSuccess: () => setColorEdit(null) });
  }

  function toggleColorActive(c: ApiSeedColor) {
    setBusyColorId(c.id);
    toggleColor(c.id, {
      onSuccess: () => setDeleteColorTarget(null),
      onSettled: () => setBusyColorId(null),
    });
  }

  function confirmDeleteColor(id: number) {
    setBusyColorId(id);
    deleteColor(id, {
      onSuccess: () => setDeleteColorTarget(null),
      onSettled: () => setBusyColorId(null),
    });
  }

  // ── Preset actions ─────────────────────────────────────────────────────────

  function saveNewPreset(v: { name: string; colors: SeedPresetColorInput[] }) {
    createPreset(v, { onSuccess: () => setPresetEdit(null) });
  }

  function savePreset(id: number, v: { name: string; colors: SeedPresetColorInput[] }) {
    updatePreset({ id, ...v }, { onSuccess: () => setPresetEdit(null) });
  }

  function togglePresetActive(p: ApiSeedPreset) {
    setBusyPresetId(p.id);
    togglePreset(p.id, { onSettled: () => setBusyPresetId(null) });
  }

  function confirmDeletePreset(id: number) {
    setBusyPresetId(id);
    deletePreset(id, {
      onSuccess: () => setDeletePresetTarget(null),
      onSettled: () => setBusyPresetId(null),
    });
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const tabs: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: "colors", label: "Colors", icon: <Palette size={13} /> },
    { value: "presets", label: "Presets", icon: <Star size={13} /> },
  ];

  const headerExtra = (
    <div className="flex items-center gap-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => { resetAll(); setTab(t.value); }}
          className={`flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === t.value ? "border-navy bg-navy text-white" : "border-navy text-color-base/70 hover:bg-mint"
          }`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );

  // ── Render helpers ──────────────────────────────────────────────────────────
  function renderColor(color: ApiSeedColor) {
    const inactive = !color.active;
    if (deleteColorTarget?.id === color.id) {
      return (
        <ColorDeleteRow
          key={color.id}
          color={color}
          usedBy={presetsUsingColor(color.id)}
          busy={busyColorId === color.id}
          onConfirm={() => confirmDeleteColor(color.id)}
          onDeactivate={() => toggleColorActive(color)}
          onCancel={() => setDeleteColorTarget(null)}
        />
      );
    }
    if (colorEdit === color.id) {
      return (
        <ColorEditRow
          key={color.id}
          initial={{ hex: color.hex, label: color.label, is_metallic: color.is_metallic }}
          isSaving={updatingColor}
          submitLabel="Save changes"
          onSave={(v) => saveColor(color.id, v)}
          onCancel={() => setColorEdit(null)}
        />
      );
    }
    return (
      <ColorRow
        key={color.id}
        color={color}
        inactive={inactive}
        busy={busyColorId === color.id}
        onEdit={() => { resetAll(); setColorEdit(color.id); }}
        onToggle={toggleColorActive}
        onDelete={() => { resetAll(); setDeleteColorTarget(color); }}
      />
    );
  }

  function renderPreset(preset: ApiSeedPreset) {
    const inactive = !preset.active;
    if (deletePresetTarget?.id === preset.id) {
      return (
        <PresetDeleteRow
          key={preset.id}
          preset={preset}
          busy={busyPresetId === preset.id}
          onConfirm={() => confirmDeletePreset(preset.id)}
          onCancel={() => setDeletePresetTarget(null)}
        />
      );
    }
    if (presetEdit === preset.id) {
      return (
        <PresetEditor
          key={preset.id}
          initial={{
            name: preset.name,
            colors: preset.colors.map((c) => ({
              color_id: c.color_id,
              hex: c.hex,
              label: c.label,
              percent: c.percent,
            })),
          }}
          palette={activeColors}
          isSaving={updatingPreset}
          submitLabel="Save changes"
          onSave={(v) => savePreset(preset.id, v)}
          onCancel={() => setPresetEdit(null)}
        />
      );
    }
    return (
      <PresetRow
        key={preset.id}
        preset={preset}
        inactive={inactive}
        busy={busyPresetId === preset.id}
        onEdit={() => { resetAll(); setPresetEdit(preset.id); }}
        onToggle={togglePresetActive}
        onDelete={() => { resetAll(); setDeletePresetTarget(preset); }}
      />
    );
  }

  return (
    <FullScreenDialog
      open={open}
      onClose={handleClose}
      title="Manage Seed Beads"
      className="max-w-2xl"
      bodyClasses="h-full"
      includeBackDropBlur={includeBackDropBlur}
      headerExtra={headerExtra}
    >
      {tab === "colors" ? (
        <div className="flex flex-col">
          <div className="flex flex-col gap-4 overflow-y-scroll max-h-[70vh] py-6 px-4">
            <p className="text-sm text-color-base/70">
              Manage the seed bead color palette. These colors are the building blocks for colorway
              presets and custom colorways in the seed bead picker.
            </p>

            {colorMutationErr && <ErrorAlert message={colorMutationErr.message} />}

            {/* Count + status filter */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-color-base/50">
                {visibleColors.length} {visibleColors.length === 1 ? "color" : "colors"}
              </span>
              <StatusToggle value={statusFilter} onChange={setStatusFilter} />
            </div>

            {colorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-color-base/70" />
              </div>
            ) : visibleColors.length === 0 && colorEdit !== "new" ? (
              <p className="py-4 text-center text-sm text-color-base/70">
                {colors.length === 0 ? "No colors yet." : "No colors match this filter."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">{visibleColors.map((color) => renderColor(color))}</div>
            )}
          </div>
          <div className="border-t border-default py-3 px-4">
            {/* New color — hidden while viewing inactive-only (a new color is active) */}
            {statusFilter !== "inactive" &&
              (colorEdit === "new" ? (
                <ColorEditRow
                  initial={{ hex: "#d4af37", label: "", is_metallic: true }}
                  isSaving={creatingColor}
                  submitLabel="Add color"
                  onSave={saveNewColor}
                  onCancel={() => setColorEdit(null)}
                />
              ) : (
                <Button onClick={() => { resetAll(); setColorEdit("new"); }} variant="dashed" className="min-w-[180px]">
                  <Plus size={15} /> New color
                </Button>
              ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col gap-4 overflow-y-scroll max-h-[70vh] py-6 px-4">
            <p className="text-sm text-color-base/70">
              Build reusable colorway presets from the palette. Presets appear as one-tap starting
              points in the seed bead picker. Percentages must total 100%.
            </p>

            {presetMutationErr && <ErrorAlert message={presetMutationErr.message} />}

            {/* Count + status filter */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-color-base/50">
                {visiblePresets.length} {visiblePresets.length === 1 ? "preset" : "presets"}
              </span>
              <StatusToggle value={statusFilter} onChange={setStatusFilter} />
            </div>

            {presetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-color-base/70" />
              </div>
            ) : visiblePresets.length === 0 && presetEdit !== "new" ? (
              <p className="py-4 text-center text-sm text-color-base/70">
                {presets.length === 0 ? "No presets yet." : "No presets match this filter."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">{visiblePresets.map((preset) => renderPreset(preset))}</div>
            )}
          </div>
          <div className="border-t border-default py-3 px-4">
            {/* New preset — hidden while viewing inactive-only */}
            {statusFilter !== "inactive" &&
              (presetEdit === "new" ? (
                <PresetEditor
                  initial={{ name: "", colors: [] }}
                  palette={activeColors}
                  isSaving={creatingPreset}
                  submitLabel="Create preset"
                  onSave={saveNewPreset}
                  onCancel={() => setPresetEdit(null)}
                />
              ) : (
                <Button onClick={() => { resetAll(); setPresetEdit("new"); }} variant="dashed">
                  <Plus size={15} /> New preset
                </Button>
              ))}
            </div>
        </div>
      )}
    </FullScreenDialog>
  );
}