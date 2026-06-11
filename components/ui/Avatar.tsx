import { getInitials } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const SIZE = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-10 h-10 text-sm",
} as const;

interface AvatarProps {
  name: string;
  color?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}

export function Avatar({ name, color, size = "md", className = "" }: AvatarProps) {
  const { data: currentUser } = useCurrentUser();
  const isCurrentUser = name === currentUser?.name;
  const currentUserClass = isCurrentUser ? "avatar-current-user text-navy border-navy border" : "text-white";

  let avatarBg = isCurrentUser ? "#e2ffff" : "#9b948e";
  if (color && !isCurrentUser) {
    avatarBg = color;
  }

  return (
    <div
      className={`${SIZE[size]} shrink-0 rounded-full flex items-center justify-center font-bold ${className} ${currentUserClass}`}
      style={{ backgroundColor: avatarBg }}
    >
      {getInitials(name)}
    </div>
  );
}