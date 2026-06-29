"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_STYLES, type CategoryKey } from "@/lib/category-colors";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { usePermissions } from "@/hooks/usePermissions";
import { useOptimisticAssignment } from "@/hooks/useOptimisticAssignment";
import type { Bracelet } from "@/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AssignmentSectionProps<T extends { id: number; name: string }> {
  design: Bracelet;
  /** Items currently on the design (e.g. design.tags, design.collections). */
  serverItems: T[];
  /** Key into CATEGORY_STYLES for chip color. */
  categoryKey: CategoryKey;
  /** Section heading text. */
  title: string;
  /** Mutation to apply an item to the design. */
  applyFn: (item: T) => Promise<void>;
  /** Mutation to remove an item from the design. */
  removeFn: (item: T) => Promise<void>;
  /** The picker component to render (TagPicker or CollectionPicker). */
  Picker: React.ComponentType<{
    selectedIds: number[];
    pendingIds: number[];
    onToggle: (item: T) => void;
    variant: "filter" | "assign";
    placeholder: string;
    showManage: boolean;
  }>;
  /** Placeholder when no items are assigned. */
  addPlaceholder: string;
  /** Placeholder when items exist and can be edited. */
  editPlaceholder: string;
  /** When true the user's session is read-only — hides the picker. */
  isReadOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AssignmentSection<T extends { id: number; name: string }>({
  design,
  serverItems,
  categoryKey,
  title,
  applyFn,
  removeFn,
  Picker,
  addPlaceholder,
  editPlaceholder,
  isReadOnly = false,
}: AssignmentSectionProps<T>) {
  const { canManageComponents } = usePermissions();
  const { items, appliedIds, pendingIds, handleToggle } = useOptimisticAssignment({
    serverItems,
    applyFn,
    removeFn,
  });

  const isPublished = design.status === "published";
  const style = CATEGORY_STYLES[categoryKey];

  const assignmentSectionClass = "border-b border-default pb-3";

  // Nothing to show and no way to add → hide entirely.
  if (items.length === 0 && (!canManageComponents || isPublished || isReadOnly)) return null;

  // Non-managers → read-only chip cloud.
  if (!canManageComponents) {
    return (
      <div className={assignmentSectionClass} >
        <SectionHeading>{title}</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {serverItems.map((item) => (
            <span
              key={item.id}
              className={cn(
                "inline-flex items-center rounded-[3px] px-2.5 py-0.5 border border-navy text-xs font-medium text-navy",
                style.bg,
              )}
            >
              {item.name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Managers — full picker with optimistic updates.
  return (
    <div className={assignmentSectionClass} >
      <SectionHeading>{title}</SectionHeading>
      <div
        className={cn(
          "flex flex-col py-1",
          items.length > 0 && 'gap-4',
        )} >
        <div className="flex flex-wrap gap-2 items-center">
          {items.map((item) => {
            const isPending = pendingIds.includes(item.id);
            return (
              <span
                key={item.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[2px] border border-navy px-2.5 py-0.5 text-sm min-w-20 justify-center text-navy transition-opacity",
                  style.bg,
                  isPending && "opacity-50",
                )}
              >
                {isPending && <Loader2 size={10} className="animate-spin" />}
                {item.name}
              </span>
            );
          })}
        </div>
        {!isPublished && !isReadOnly && (
          <Picker
            selectedIds={appliedIds}
            pendingIds={pendingIds}
            onToggle={handleToggle}
            variant="assign"
            placeholder={appliedIds.length > 0 ? editPlaceholder : addPlaceholder}
            showManage
          />
        )}
      </div>
    </div>
  );
}