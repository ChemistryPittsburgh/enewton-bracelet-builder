import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <h3 className={cn("text-[13.5px] font-semibold uppercase tracking-wider text-black mb-2", className)}>
      {children}
    </h3>
  );
}
