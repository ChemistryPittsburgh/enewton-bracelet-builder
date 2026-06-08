import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorAlertProps {
  message: string;
  className?: string;
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <p className={cn("flex items-center gap-2 rounded-lg bg-error px-3 py-2 text-sm text-white", className)}>
      <AlertCircle size={14} className="shrink-0" />
      {message}
    </p>
  );
}
