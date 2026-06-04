import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <h3 className={cn("text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3", className)}>
      {children}
    </h3>
  );
}
