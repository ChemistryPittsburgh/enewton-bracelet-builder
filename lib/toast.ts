import { useStore } from "@/lib/store";

/**
 * Fire a toast from anywhere — hooks (inside mutation onSuccess), components,
 * or plain functions — without needing the store hook. Rendered by <Toaster />.
 *
 *   toast.success("Bracelet saved");
 *   toast.error("Couldn't publish — SKU required");
 */
export const toast = {
  success: (message: string, durationMs?: number) =>
    useStore.getState().addToast({ type: "success", message, durationMs }),
  error: (message: string, durationMs?: number) =>
    useStore.getState().addToast({ type: "error", message, durationMs }),
  info: (message: string, durationMs?: number) =>
    useStore.getState().addToast({ type: "info", message, durationMs }),
};