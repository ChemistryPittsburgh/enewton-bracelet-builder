import { useCurrentUser } from "@/hooks/useCurrentUser";

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

  return {
    isLoading,
    isAdmin,
    canEdit,
    canReview,
    canPublish,
    canManageComponents,
    /** Raw permissions object — use sparingly; prefer the named booleans above. */
    raw: p,
  };
}
