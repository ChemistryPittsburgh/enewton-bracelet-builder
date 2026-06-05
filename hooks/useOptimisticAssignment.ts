import { useState, useEffect, useCallback } from "react";

/**
 * Manages optimistic state for a many-to-many relationship on a design
 * (tags, collections, or any future entity with the same pattern).
 *
 * Handles: immediate UI updates, pending spinners, server re-sync,
 * and automatic rollback on error.
 */
export function useOptimisticAssignment<T extends { id: number }>({
  serverItems,
  applyFn,
  removeFn,
}: {
  /** Current items from the server (e.g. design.tags, design.collections). */
  serverItems: T[];
  /** Mutation to apply an item — receives the item, returns a promise. */
  applyFn: (item: T) => Promise<void>;
  /** Mutation to remove an item — receives the item, returns a promise. */
  removeFn: (item: T) => Promise<void>;
}) {
  const [optimisticItems, setOptimisticItems] = useState<T[]>(() => serverItems);
  const [pendingIds, setPendingIds]           = useState<number[]>([]);

  // Re-sync from server when data settles, preserving in-flight items.
  useEffect(() => {
    setOptimisticItems((prev) => {
      const inFlight = new Set(pendingIds);
      const settled  = serverItems.filter((item) => !inFlight.has(item.id));
      const pending  = prev.filter((item) => inFlight.has(item.id));
      return [...settled, ...pending];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverItems]);

  const handleToggle = useCallback((item: T) => {
    const isApplied = optimisticItems.some((i) => i.id === item.id);

    // Optimistic update
    setOptimisticItems((prev) =>
      isApplied ? prev.filter((i) => i.id !== item.id) : [...prev, item],
    );
    setPendingIds((prev) => [...prev, item.id]);

    const settle = () => setPendingIds((prev) => prev.filter((id) => id !== item.id));

    const fn = isApplied ? removeFn : applyFn;
    fn(item)
      .then(settle)
      .catch(() => {
        // Roll back
        setOptimisticItems((prev) =>
          isApplied ? [...prev, item] : prev.filter((i) => i.id !== item.id),
        );
        settle();
      });
  }, [optimisticItems, applyFn, removeFn]);

  return {
    items: optimisticItems,
    appliedIds: optimisticItems.map((i) => i.id),
    pendingIds,
    handleToggle,
  };
}