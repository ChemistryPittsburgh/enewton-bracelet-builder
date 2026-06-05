"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Pencil, X } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissions } from "@/hooks/usePermissions";
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
  const { isAdmin } = usePermissions();

  const { data: comments = [], isLoading, isError, refetch } = useComments(activeDesignId, { enabled: open });
  const { mutate: addComment, isPending: adding } = useAddComment();
  const { mutate: deleteComment } = useDeleteComment();
  const { mutate: editComment, isPending: saving } = useEditComment();

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

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
    c.user_id === currentUser?.id || isAdmin;

  return (
    <Panel open={open} onClose={onClose} direction="right">
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-2">
          <h2 className="text-2xl font-semibold text-neutral-800">Comments</h2>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center pt-16 text-neutral-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-3 pt-16 text-neutral-400">
              <p className="text-sm">Failed to load comments.</p>
              <button
                onClick={() => refetch()}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !isError && comments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400 pt-16">
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
                      className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-neutral-400"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={cancelEdit} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(comment)}
                        disabled={!editDraft.trim() || saving}
                        className="flex items-center gap-1 rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                      >
                        {saving && <Loader2 size={10} className="animate-spin" />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-neutral-800">{comment.user_name}</span>
                      <span className="text-xs text-neutral-400">{formatTimestamp(comment.created_at)}</span>
                      {isOwnComment(comment) && (
                        <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(comment)} className="rounded p-0.5 text-neutral-400 hover:text-neutral-600" aria-label="Edit">
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => activeDesignId && deleteComment({ designId: activeDesignId, commentId: comment.id })}
                            className="rounded p-0.5 text-neutral-400 hover:text-red-500"
                            aria-label="Delete"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className={`shrink-0 border-t border-neutral-200 px-6 py-5 transition-opacity ${!canInteract ? "opacity-40 pointer-events-none" : ""}`}>
          <p className="text-sm font-semibold text-neutral-700 mb-3">Leave a comment</p>
          <div className="flex gap-3 rounded-lg border border-neutral-300 px-3 py-3 focus-within:border-neutral-400 transition-colors">
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
              className="flex-1 resize-none bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400 border-none"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            {draft.length > 0 ? (
              <span className={`text-[11px] ${draft.length >= COMMENT_MAX_LENGTH ? "text-red-400" : "text-neutral-400"}`}>
                {draft.length} / {COMMENT_MAX_LENGTH}
              </span>
            ) : (
              <span />
            )}
            <button
              onClick={handleSubmit}
              disabled={!draft.trim() || adding || !canInteract}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-40 transition-colors"
            >
              {adding && <Loader2 size={13} className="animate-spin" />}
              Comment
            </button>
          </div>
        </div>

      </div>
    </Panel>
  );
}
