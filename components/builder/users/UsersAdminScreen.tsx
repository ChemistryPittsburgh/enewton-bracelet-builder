"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Loader2, Plus, Search, Trash2, X } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useUsers } from "@/hooks/useUsers";
import { useUpdateUser } from "@/hooks/useUpdateUser";
import { useDeleteUser } from "@/hooks/useDeleteUser";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getPrimaryRole } from "@/hooks/usePermissions";
import { PermissionsDropdown, PERMISSION_FIELDS } from "./PermissionsDropdown";
import { CreateUserDialog } from "./CreateUserDialog";
import { CreateOtpUserDialog } from "./CreateOtpUserDialog";
import { OtpCreatedModal } from "./OtpCreatedModal";
import { TokenModal } from "./TokenModal";
import type { CreateUserResponse } from "@/hooks/useCreateUser";
import type { User } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

type RoleFilter = "all" | "admin" | "reviewer" | "publisher" | "editor" | "inactive";

const ROLE_TABS: { label: string; value: RoleFilter }[] = [
  { label: "All",       value: "all" },
  { label: "Admin",     value: "admin" },
  { label: "Reviewer",  value: "reviewer" },
  { label: "Publisher", value: "publisher" },
  { label: "Editor",    value: "editor" },
  { label: "Inactive",  value: "inactive" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function filterUsers(users: User[], role: RoleFilter, search: string): User[] {
  let list = users;

  switch (role) {
    case "admin":     list = list.filter((u) => u.permissions.is_admin); break;
    case "reviewer":  list = list.filter((u) => u.permissions.is_reviewer); break;
    case "publisher": list = list.filter((u) => u.permissions.is_publisher); break;
    case "editor":    list = list.filter((u) => u.permissions.is_bracelet_editor); break;
    case "inactive":  list = list.filter((u) => !u.active); break;
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }

  return list;
}

// ── Inline user editor (name, email, permissions) ────────────────────────────

function UserEditor({
  user,
  isSelf,
  onSave,
  onCancel,
  isSaving,
}: {
  user: User;
  isSelf: boolean;
  onSave: (draft: { name: string; email: string; permissions: User["permissions"] }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [draftName,  setDraftName]  = useState(user.name);
  const [draftEmail, setDraftEmail] = useState(user.email);
  const [draftPerms, setDraftPerms] = useState<Set<keyof User["permissions"]>>(
    () => new Set(PERMISSION_FIELDS.filter((f) => user.permissions[f.key]).map((f) => f.key)),
  );

  function handleSave() {
    const permissions = Object.fromEntries(
      PERMISSION_FIELDS.map(({ key }) => [key, draftPerms.has(key)]),
    ) as User["permissions"];
    onSave({ name: draftName.trim(), email: draftEmail.trim(), permissions });
  }

  return (
    <div className="border-t border-default bg-light-grey/80 px-20 py-10 flex flex-col gap-3">
      {/* Name + email */}
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`edit-name-${user.id}`} className="text-xs font-medium text-color-base/70">Name</label>
          <input
            id={`edit-name-${user.id}`}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="rounded-lg border border-default bg-white px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-600 transition-colors"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`edit-email-${user.id}`} className="text-xs font-medium text-color-base/70">Email</label>
          <input
            id={`edit-email-${user.id}`}
            type="email"
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            className="rounded-lg border border-default bg-white px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-600 transition-colors"
          />
        </div>
      </div>

      {/* Permissions */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`edit-perms-${user.id}`} className="text-xs font-medium text-color-base/70">Permissions</label>
        <PermissionsDropdown selected={draftPerms} onChange={setDraftPerms} disabled={isSelf} />
        {isSelf && (
          <p className="text-xs text-amber-600">You cannot change your own permissions.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={onCancel}
          variant="ghost"
          size="xs"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !draftName.trim() || !draftEmail.trim()}
          variant="secondary"
          size="xs"
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Save
        </Button>
      </div>
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({
  user,
  index,
  isSelf,
  editingId,
  onEditClick,
  onCancelEdit,
}: {
  user: User;
  index: number;
  isSelf: boolean;
  editingId: number | null;
  onEditClick: (id: number) => void;
  onCancelEdit: () => void;
}) {
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = editingId === user.id;
  const isActive  = !!user.active;

  function handleToggleActive() {
    updateUser({ id: user.id, active: isActive ? 0 : 1 });
  }

  function handleSave({ name, email, permissions }: { name: string; email: string; permissions: User["permissions"] }) {
    updateUser({ id: user.id, name, email, permissions }, { onSuccess: onCancelEdit });
  }

  function handleDelete() {
    deleteUser(user.id, { onSuccess: () => setConfirmDelete(false) });
  }

  const rowBg = index % 2 === 0 ? "bg-white" : "bg-neutral-50";

  return (
    <div className={`border-b border-default last:border-b-0 ${rowBg}`}>
      {/* Main row — click anywhere to expand/collapse */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => (isEditing ? onCancelEdit() : onEditClick(user.id))}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (isEditing ? onCancelEdit() : onEditClick(user.id))}
        className="flex items-center gap-3 px-8 py-4 cursor-pointer hover:bg-light-grey/60 transition-colors"
      >
        {/* Expand chevron */}
        <ChevronDown
          size={14}
          className={`shrink-0 text-color-base50 transition-transform ${isEditing ? "rotate-180" : ""}`}
        />

        {/* Avatar */}
        <Avatar name={user.name} size="md" />

        {/* Name + email */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{user.name}</span>
          <span className="text-xs text-color-base/70 truncate">{user.email}</span>
        </div>

        {/* Role badge */}
        <span className="shrink-0 rounded-full border border-default bg-neutral-100 px-2 py-0.5 text-xs font-medium text-color-base/70">
          {getPrimaryRole(user.permissions)}
        </span>

        {/* Active chip */}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            isActive
              ? "bg-green/20 text-green border border-green"
              : "bg-light-grey/20 text-error border border-error"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>

        {/* Actions — stop propagation so they don't toggle the row */}
        <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Activate / deactivate */}
          <button
            onClick={handleToggleActive}
            disabled={isUpdating || isSelf}
            title={isActive ? "Deactivate user" : "Activate user"}
            className="rounded-lg border border-default p-1.5 text-color-base/70 hover:bg-light-grey disabled:opacity-40 transition-colors"
          >
            {isUpdating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isActive ? (
              <X size={13} />
            ) : (
              <Check size={13} />
            )}
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="danger"
                size="xs"
              >
                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
              </Button>
              <Button
                onClick={() => setConfirmDelete(false)}
                variant="ghost"
                size="xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isSelf}
              title="Delete user"
              className="rounded-lg border border-default p-1.5 text-color-base/70 hover:bg-error/20 hover:border-error hover:text-error disabled:opacity-40 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Inline user editor */}
      {isEditing && (
        <UserEditor
          user={user}
          isSelf={isSelf}
          onSave={handleSave}
          onCancel={onCancelEdit}
          isSaving={isUpdating}
        />
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface UsersAdminScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsersAdminScreen({ isOpen, onClose }: UsersAdminScreenProps) {
  const { data: currentUser } = useCurrentUser();
  const { data: users = [], isLoading, isError, refetch } = useUsers();

  const [roleFilter, setRoleFilter]     = useState<RoleFilter>("all");
  const [search, setSearch]             = useState("");
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [tokenResult, setTokenResult]     = useState<CreateUserResponse | null>(null);
  const [showCreateOtp, setShowCreateOtp] = useState(false);
  const [otpCreatedUser, setOtpCreatedUser] = useState<User | null>(null);

  const filtered = filterUsers(users, roleFilter, search);

  useEffect(() => { setEditingId(null); }, [roleFilter, search]);

  function handleCreated(result: CreateUserResponse) {
    setShowCreate(false);
    setTokenResult(result);
  }

  function handleOtpCreated(result: User) {
    setShowCreateOtp(false);
    setOtpCreatedUser(result);
  }

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">

      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-default px-6 py-4">
        <h1 className="text-lg font-semibold text-neutral-900">Users</h1>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-color-base/70 hover:text-text-base transition-colors"
        >
          <ArrowLeft size={15} />
          Return to builder
        </button>
      </div>

      {/* Filter / search bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-100 px-6 py-3">
        {/* Role tabs */}
        <div className="flex items-center gap-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === tab.value
                  ? "bg-neutral-800 text-white"
                  : "text-color-base/70 hover:bg-light-grey/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Count */}
        <span className="text-xs text-color-base50">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-color-base50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="rounded-lg border border-default bg-white pl-7 pr-3 py-1.5 text-xs   outline-none focus:border-neutral-500 transition-colors w-52"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-color-base50 hover:text-color-base/70"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Add user */}
        <Button
          onClick={() => setShowCreate(true)}
          variant="primary"
          size="xs"
        >
          <Plus size={13} />
          Add user
        </Button>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-color-base50">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading users…</span>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-color-base/70">
            <p className="text-sm">Failed to load users.</p>
            <button
              onClick={() => refetch()}
              className="rounded-lg border border-default px-4 py-2 text-sm hover:bg-neutral-50 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex items-center justify-center py-16 text-sm text-color-base50">
            No users match your filters.
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="divide-y divide-neutral-100">
            {filtered.map((user, i) => (
              <UserRow
                key={user.id}
                user={user}
                index={i}
                isSelf={user.id === currentUser?.id}
                editingId={editingId}
                onEditClick={(id) => setEditingId(id)}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {tokenResult && (
        <TokenModal result={tokenResult} onClose={() => setTokenResult(null)} />
      )}
      {showCreateOtp && (
        <CreateOtpUserDialog
          onClose={() => setShowCreateOtp(false)}
          onCreated={handleOtpCreated}
        />
      )}
      {otpCreatedUser && (
        <OtpCreatedModal user={otpCreatedUser} onClose={() => setOtpCreatedUser(null)} />
      )}
    </div>
  );
}