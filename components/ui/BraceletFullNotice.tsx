import { SectionHeading } from "@/components/ui/SectionHeading";

interface BraceletFullNoticeProps {
  message?: string;
}

export function BraceletFullNotice({
  message = "No more items can fit. Remove beads to free up space.",
}: BraceletFullNoticeProps) {
  return (
    <div className="rounded-[2px] border border-error/20 bg-error/5 px-4 py-3 text-center">
      <SectionHeading className="text-error mb-1">Bracelet is full</SectionHeading>
      <p className="text-xs text-color-base/80 mt-0">{message}</p>
    </div>
  );
}
