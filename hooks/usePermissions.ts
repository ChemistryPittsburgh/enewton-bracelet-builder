import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { User } from "@/types";

/** Returns the highest-priority role label for a user's permission set. */
export function getPrimaryRole(permissions: User["permissions"]): string {
  if (permissions.is_admin)           return "Admin";
  if (permissions.is_publisher)       return "Publisher";
  if (permissions.is_reviewer)        return "Reviewer";
  if (permissions.is_bracelet_editor) return "Bracelet Editor";
  if (permissions.is_component_admin) return "Component Admin";
  return "User";
}

/**
 * Clean permission booleans derived from the current user.
 * Admin implicitly holds all permissions.
 *
 * Use this hook instead of reaching into useCurrentUser().data.permissions
 * directly, so permission logic stays in one place.
 */
export function usePermissions() {
  const { data: user, isLoading } = useCurrentUser();
  const p = user?.permissions;

  const isAdmin             = p?.is_admin             ?? false;
  const canEdit             = isAdmin || (p?.is_bracelet_editor   ?? false);
  const canReview           = isAdmin || (p?.is_reviewer          ?? false);
  const canPublish          = isAdmin || (p?.is_publisher         ?? false);
  const canManageComponents = isAdmin || (p?.is_component_admin   ?? false);
  const canDeleteBracelet   = isAdmin;

  return {
    isLoading,
    isAdmin,
    canEdit,
    canReview,
    canPublish,
    canManageComponents,
    canDeleteBracelet,
    /** Raw permissions object — use sparingly; prefer the named booleans above. */
    raw: p,
  };
}
