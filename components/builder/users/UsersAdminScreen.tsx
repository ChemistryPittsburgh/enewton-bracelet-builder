"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Copy, Loader2, Plus, Search, Trash2, X } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useUsers } from "@/hooks/useUsers";
import { useCreateUser, type CreateUserResponse } from "@/hooks/useCreateUser";
import { useUpdateUser } from "@/hooks/useUpdateUser";
import { useDeleteUser } from "@/hooks/useDeleteUser";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getPrimaryRole } from "@/hooks/usePermissions";
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

const PERMISSION_FIELDS: { key: keyof User["permissions"]; label: string }[] = [
  { key: "is_bracelet_editor", label: "Bracelet Editor" },
  { key: "is_reviewer",        label: "Reviewer" },
  { key: "is_publisher",       label: "Publisher" },
  { key: "is_component_admin", label: "Component Admin" },
  { key: "is_admin",           label: "Admin" },
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

// ── Create user dialog ────────────────────────────────────────────────────────

function PermissionsDropdown({
  selected,
  onChange,
  disabled = false,
}: {
  selected: Set<keyof User["permissions"]>;
  onChange: (next: Set<keyof User["permissions"]>) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(key: keyof User["permissions"]) {
    if (disabled) return;
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
  }

  const label =
    selected.size === 0
      ? "No permissions"
      : PERMISSION_FIELDS.filter((f) => selected.has(f.key))
          .map((f) => f.label)
          .join(", ");

  return (
    <div ref={ref} className={`relative ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="flex w-full items-center justify-between rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-neutral-600 transition-colors"
      >
        <span className="truncate text-left text-sm" title={label}>
          {label}
        </span>
        <ChevronDown size={14} className={`ml-2 shrink-0 text-color-base50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-default bg-white shadow-lg py-1">
          {PERMISSION_FIELDS.map(({ key, label: pLabel }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm   hover:bg-neutral-50 transition-colors"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  selected.has(key)
                    ? "border-neutral-800 bg-neutral-800"
                    : "border-default bg-white"
                }`}
              >
                {selected.has(key) && <Check size={10} className="text-white" />}
              </span>
              {pLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (result: CreateUserResponse) => void;
}) {
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [permissions, setPermissions] = useState<Set<keyof User["permissions"]>>(new Set());
  const [sendEmail,   setSendEmail]   = useState(true);
  const { mutate, isPending, error } = useCreateUser();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const perms = Object.fromEntries(
      PERMISSION_FIELDS.map(({ key }) => [key, permissions.has(key)]),
    ) as User["permissions"];
    mutate({ name: name.trim(), email: email.trim(), permissions: perms }, { onSuccess: onCreated });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-xl border border-default bg-white shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2>Add user</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-light-grey/60 text-color-base50">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="create-name" className="text-xs font-medium text-color-base/70">Name</label>
            <input
              id="create-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg border border-default px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-600 transition-colors"
              placeholder="Full name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="create-email" className="text-xs font-medium text-color-base/70">Email</label>
            <input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-default px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-600 transition-colors"
              placeholder="user@example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="create-permissions" className="text-xs font-medium text-color-base/70">Permissions</label>
            <PermissionsDropdown selected={permissions} onChange={setPermissions} />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span
              className={`relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                sendEmail ? "bg-neutral-800" : "bg-light-grey"
              }`}
            >
              <span
                className={`absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  sendEmail ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="sr-only"
              />
            </span>
            <span className="text-sm  ">Send email code.</span>
          </label>

          {error && (
            <ErrorAlert message={error instanceof Error ? error.message : "Failed to create user"} />
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={isPending || !name.trim() || !email.trim()}
              variant="primary"
              size="sm"
              className="flex-1"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Token display modal (one-time) ────────────────────────────────────────────

function TokenModal({ result, onClose }: { result: CreateUserResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(result.token)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-xl border border-default bg-white shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">User created</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-light-grey/60 text-color-base50">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm  ">
          <span className="font-semibold">{result.name}</span> has been created. Copy their login token now — it will not be shown again.
        </p>

        <div className="flex items-center gap-2 rounded-lg border border-default bg-neutral-50 px-3 py-2">
          <code className="flex-1 text-xs font-mono   break-all select-all">
            {result.token}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded p-1.5 hover:bg-light-grey transition-colors text-color-base/70"
            title="Copy token"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
        </div>

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          This token will not be shown again. Make sure the user saves it before closing.
        </p>

        <Button
          onClick={onClose}
          variant="primary"
          size="sm"
          className="w-full"
        >
          Done
        </Button>
      </div>
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
  const [showCreate, setShowCreate]     = useState(false);
  const [tokenResult, setTokenResult]   = useState<CreateUserResponse | null>(null);

  const filtered = filterUsers(users, roleFilter, search);

  useEffect(() => { setEditingId(null); }, [roleFilter, search]);

  function handleCreated(result: CreateUserResponse) {
    setShowCreate(false);
    setTokenResult(result);
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
    </div>
  );
}