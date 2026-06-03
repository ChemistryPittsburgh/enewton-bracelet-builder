"use client";

interface PermissionGateProps {
  /** The permission check result — pass a boolean from usePermissions(). */
  allowed: boolean;
  /**
   * "hide"    — renders nothing when not allowed (default).
   * "disable" — renders children wrapped in a non-interactive, dimmed container.
   */
  mode?: "hide" | "disable";
  children: React.ReactNode;
}

/**
 * Conditionally renders children based on a permission boolean.
 *
 * Usage:
 *   const { canReview } = usePermissions();
 *   <PermissionGate allowed={canReview}>
 *     <ApproveButton />
 *   </PermissionGate>
 *
 * When rules aren't defined yet, wrap speculatively — behaviour is easy to
 * change by updating the `allowed` expression, not this component.
 */
export function PermissionGate({ allowed, mode = "hide", children }: PermissionGateProps) {
  if (allowed) return <>{children}</>;

  if (mode === "disable") {
    return (
      <div className="pointer-events-none select-none opacity-40" aria-disabled>
        {children}
      </div>
    );
  }

  return null;
}
