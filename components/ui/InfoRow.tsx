interface InfoRowProps {
  label: string;
  value: string;
  layout?: "vertical" | "horizontal";
}

export function InfoRow({ label, value, layout = "vertical" }: InfoRowProps) {
  if (layout === "horizontal") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-color-base/70">{label}</span>
        <span className="text-xs font-semibold  ">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-color-base/70">{label}</span>
      <span className="text-sm  ">{value}</span>
    </div>
  );
}
