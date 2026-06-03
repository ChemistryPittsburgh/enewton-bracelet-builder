import { getInitials } from "@/lib/utils";

const SIZE = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-10 h-10 text-sm",
} as const;

interface AvatarProps {
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}

export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  return (
    <div
      className={`${SIZE[size]} shrink-0 rounded-full bg-neutral-500 flex items-center justify-center font-bold text-white ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
