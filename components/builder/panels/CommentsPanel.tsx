"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Pencil, X } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissions } from "@/hooks/usePermissions";
import { useDesign } from "@/hooks/useDesign";
import { useComments } from "@/hooks/useComments";
import { useAddComment } from "@/hooks/useAddComment";
import { useDeleteComment } from "@/hooks/useDeleteComment";
import { useEditComment } from "@/hooks/useEditComment";
import { Avatar } from "@/components/ui/Avatar";
import { COMMENT_MAX_LENGTH } from "@/lib/sanitize";
import { formatTimestamp } from "@/lib/utils";
import type { DesignComment } from "@/types";

interface CommentsPanelProps {
  open: boolean;
  onClose: () => void;
}


export function CommentsPanel({ open, onClose }: CommentsPanelProps) {
  const activeDesignId = useStore((s) => s.activeDesignId);
  const { data: currentUser } = useCurrentUser();
  const { data: comments = [], isLoading, isError, refetch } = useComments(activeDesignId, { enabled: open });
  const { mutate: addComment, isPending: adding } = useAddComment();
  const { mutate: deleteComment } = useDeleteComment();
  const { mutate: editComment, isPending: saving } = useEditComment();

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { canEdit } = usePermissions();
  const { data: savedDesign } = useDesign(activeDesignId);
  const isLocked = savedDesign?.status === "approved" || savedDesign?.status === "published";

  useEffect(() => {
    if (comments.length > 0) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [comments.length]);

  const canInteract = activeDesignId !== null;

  function handleSubmit() {
    const text = draft.trim();
    if (!text || !activeDesignId) return;
    addComment({ designId: activeDesignId, body: text }, {
      onSuccess: () => setDraft(""),
    });
  }

  function startEdit(comment: DesignComment) {
    setEditingId(comment.id);
    setEditDraft(comment.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function handleSaveEdit(comment: DesignComment) {
    const text = editDraft.trim();
    if (!text || !activeDesignId) return;
    editComment(
      { designId: activeDesignId, commentId: comment.id, body: text },
      { onSuccess: cancelEdit },
    );
  }

  const isOwnComment = (c: DesignComment) =>
    c.user_id === currentUser?.id || !!currentUser?.permissions?.is_admin;

  return (
    <Panel open={open} onClose={onClose} direction="right">
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-2">
          <h2 className="text-2xl font-semibold  ">Comments</h2>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center pt-16 text-color-base/70">
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-3 pt-16 text-color-base/70">
              <p className="text-sm">Failed to load comments.</p>
              <button
                onClick={() => refetch()}
                className="rounded-lg border border-default bg-white px-3 py-1.5 text-xs font-medium hover:bg-light-grey/60 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !isError && comments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-color-base/70 pt-16">
              <MessageSquare size={32} strokeWidth={1.5} />
              <p className="text-sm">No comments yet</p>
              {!activeDesignId && (
                <p className="text-xs text-center px-4">
                  Save this design first to attach comments to it.
                </p>
              )}
            </div>
          )}

          {!isLoading && !isError && comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar name={comment.user_name} />
              <div className="flex-1 min-w-0">
                {editingId === comment.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSaveEdit(comment); }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      rows={3}
                      autoFocus
                      maxLength={COMMENT_MAX_LENGTH}
                      className="w-full resize-none rounded-lg border border-default bg-neutral-50 px-3 py-2 text-sm outline-none focus-visible:border-stone"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={cancelEdit} className="text-xs text-color-base/70 hover:text-color-base/70 transition-colors">
                        Cancel
                      </button>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handleSaveEdit(comment)}
                        disabled={!editDraft.trim() || saving}
                      >
                        {saving && <Loader2 size={10} className="animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold  ">{comment.user_name}</span>
                      <span className="text-xs text-color-base/70">{formatTimestamp(comment.created_at)}</span>
                      {isOwnComment(comment) && (
                        <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(comment)} className="rounded p-0.5 text-color-base/70 hover:text-color-base/70" aria-label="Edit">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => activeDesignId && deleteComment({ designId: activeDesignId, commentId: comment.id })}
                            className="rounded p-0.5 text-color-base/70 hover:text-error/80"
                            aria-label="Delete"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-color-base/70 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        {canEdit && !isLocked && (
          <div className={`shrink-0 border-t border-default px-6 py-5 transition-opacity ${!canInteract ? "opacity-40 pointer-events-none" : ""}`}>
            <p className="text-sm font-semibold   mb-3">Leave a comment</p>
            <div className="flex gap-3 rounded-lg border border-default px-3 py-3 focus-within:border-gold transition-colors">
              {currentUser && <Avatar name={currentUser.name} size="sm" />}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
                }}
                placeholder="Write a comment…"
                rows={4}
                maxLength={COMMENT_MAX_LENGTH}
                disabled={!canInteract}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-color-base/70 border-none focus:ring-0 p-0 pt-1"
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              {draft.length > 0 ? (
                <span className={`text-[11px] ${draft.length >= COMMENT_MAX_LENGTH ? "text-error/70" : "text-color-base/70"}`}>
                  {draft.length} / {COMMENT_MAX_LENGTH}
                </span>
              ) : (
                <span />
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={handleSubmit}
                disabled={!draft.trim() || adding || !canInteract}
              >
                {adding && <Loader2 size={13} className="animate-spin" />}
                Comment
              </Button>
            </div>
          </div>
        )}

      </div>
    </Panel>
  );
}