"use client";

import { useEffect } from "react";

interface LockEnforcementOptions {
  isLocked: boolean;
  canEdit: boolean;
  isEditMode: boolean;
  toggleEditMode: () => void;
  setBraceletPanelOpen: (v: boolean) => void;
}

/**
 * Enforces UI state when the design lock or edit permission changes:
 *   - Closes the bead selector panel when the user loses edit access
 *   - Exits edit mode if the design becomes locked mid-session
 */
export function useLockEnforcement({
  isLocked,
  canEdit,
  isEditMode,
  toggleEditMode,
  setBraceletPanelOpen,
}: LockEnforcementOptions): void {
  useEffect(() => {
    if (!canEdit || isLocked) setBraceletPanelOpen(false);
  }, [canEdit, isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLocked && isEditMode) toggleEditMode();
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps
}
