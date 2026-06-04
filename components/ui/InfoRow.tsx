interface InfoRowProps {
  label: string;
  value: string;
  layout?: "vertical" | "horizontal";
}

export function InfoRow({ label, value, layout = "vertical" }: InfoRowProps) {
  if (layout === "horizontal") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">{label}</span>
        <span className="text-xs font-semibold text-neutral-700">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="text-sm text-neutral-700">{value}</span>
    </div>
  );
}
