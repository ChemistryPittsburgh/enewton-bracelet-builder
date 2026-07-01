"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DESKTOP_QUERY } from "@/lib/constants";

/**
 * Renders children only on desktop. On touch devices it mounts nothing of the
 * app (no canvas, no subscriptions) and shows a "use desktop" message instead.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  // `pending` until the effect runs so server and first client render agree
  // (both render null) — avoids a hydration mismatch.
  const [state, setState] = useState<"pending" | "mobile" | "desktop">("pending");

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const apply = () => setState(mq.matches ? "desktop" : "mobile");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (state === "pending") return null;
  if (state === "desktop") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-light-grey px-8 text-center">
      <div className="grid place-items-center rounded-full bg-mint p-4 text-navy">
        <Monitor size={28} />
      </div>
      <h1 className="font-headline text-xl text-color-base">Desktop required</h1>
      <p className="max-w-sm text-sm leading-relaxed text-color-base/70">
        The Bracelet Builder needs a larger screen and a mouse or trackpad to place and
        arrange beads precisely. Please open it on a desktop or laptop to continue.
      </p>
      <Button variant="ghost" size="sm" onClick={() => router.push("/read-only")} className="mt-2">
        View bracelets (read-only)
      </Button>
    </div>
  );
}