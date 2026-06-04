"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const actionButton = cva(
  "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:   "bg-neutral-900 text-white hover:bg-neutral-700",
        secondary: "border border-neutral-300 text-neutral-700 hover:bg-neutral-50",
        danger:    "border border-red-200 text-red-600 hover:bg-red-50",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

interface ActionButtonProps extends VariantProps<typeof actionButton> {
  label: string;
  isPending: boolean;
  onClick: () => void;
  className?: string;
}

export function ActionButton({ label, isPending, onClick, variant, className }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={cn(actionButton({ variant }), className)}
    >
      {isPending && <Loader2 size={13} className="animate-spin" />}
      {label}
    </button>
  );
}
