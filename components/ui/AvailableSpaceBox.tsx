import { useStore } from "@/lib/store";
import { braceletArc, usedArc } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface AvailableSpaceBoxProps {
  className?: string;
}

export function AvailableSpaceBox({ className = "" }: AvailableSpaceBoxProps) {
  const placedBeads = useStore((s) => s.beads);
  const braceletSize = useStore((s) => s.braceletSize);

  const radius       = BRACELET_SIZE_RADIUS[braceletSize];
  const totalArc     = braceletArc(radius);
  const used         = usedArc(placedBeads);
  const availableMm  = Math.max(0, Math.round((totalArc - used) * 1000 * 10) / 10);

  return (
    <>
    {/* Available space */}
    <div className={`rounded-[3px] border border-default bg-light-grey/50 px-4 py-3 mb-3 ${className}`}>
      <SectionHeading>
        Available space
      </SectionHeading>
      <p className="text-2xl font-semibold text-navy">{availableMm}mm</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-light-grey overflow-hidden">
        <div
          className="h-full rounded-full bg-navy transition-all"
          style={{ width: `${Math.min(100, (used / totalArc) * 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-color-base/70 mt-1">
        {Math.round((used / totalArc) * 100)}% occupied
      </p>
    </div>
    </>
  );
}