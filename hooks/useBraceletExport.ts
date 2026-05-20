import { useStore } from "@/lib/store";
import { usedArc, braceletArc } from "@/lib/bead-layout";
import { slugify } from "@/lib/utils";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";

export function useBraceletExport() {
  const { storedBeads, braceletName, braceletSize } = useStore((s) => ({
    storedBeads: s.beads,
    braceletName: s.braceletName,
    braceletSize: s.braceletSize,
  }));

  const maxArc = braceletArc(BRACELET_SIZE_RADIUS[braceletSize]);
  const arcUsed = usedArc(storedBeads);
  const arcUsedMm = arcUsed * 1000;
  const maxArcMm = maxArc * 1000;
  const percentUsed = Math.min((arcUsed / maxArc) * 100, 100);

  return function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      bracelet: {
        name: braceletName,
        arcUsedMm: arcUsedMm.toFixed(2),
        arcTotalMm: maxArcMm.toFixed(2),
        percentUsed: percentUsed.toFixed(1),
        beadCount: storedBeads.length,
      },
      beads: storedBeads.map((b, i) => ({
        position: i + 1,
        instanceId: b.instanceId,
        id: b.product.id,
        name: b.product.name,
        diameterMm: ((b.product.diameter ?? 0) * 1000).toFixed(2),
        glb_path: b.product.glb_path,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bracelet-${slugify(braceletName)}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
