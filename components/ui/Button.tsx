import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

const variants = {
  primary:    "bg-navy border-navy border text-white hover:bg-white hover:text-navy",
  secondary:  "bg-mint border-navy border text-navy hover:bg-white",
  ghost:      "border bg-white border-stone/40 text-color-base/80 hover:border-stone hover:bg-mint hover:text-color-base",
  danger:     "bg-error text-white hover:bg-error/90",
  softDanger: "bg-blush text-[#8b3040] hover:bg-blush/80",
  positive:   "bg-light-mint text-[#0d5c52] hover:bg-light-mint/80",
};

const sizes = {
  xs:   "h-8 px-3 text-[11px]",
  sm:   "h-9 px-4 text-[12px]",
  md:   "h-11 px-6 text-[12.5px]",
  lg:   "h-11 px-6 text-base",
  icon: "h-9 w-9",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[2px]",
          "font-medium uppercase tracking-wider",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30",
          "disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";