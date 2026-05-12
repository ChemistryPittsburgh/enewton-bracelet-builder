import { useStore } from "@/lib/store";
import { usedArc, MAX_BRACELET_ARC } from "@/lib/bead-layout";
import { slugify } from "@/lib/utils";

export function useBraceletExport() {
  const { storedBeads, braceletName } = useStore((s) => ({
    storedBeads: s.beads,
    braceletName: s.braceletName,
  }));

  const arcUsed = usedArc(storedBeads);
  const percentUsed = Math.min((arcUsed / MAX_BRACELET_ARC) * 100, 100);

  return function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      bracelet: {
        name: braceletName,
        arcUsedMm: (arcUsed * 1000).toFixed(2),
        arcTotalMm: (MAX_BRACELET_ARC * 1000).toFixed(2),
        percentUsed: percentUsed.toFixed(1),
        beadCount: storedBeads.length,
      },
      beads: storedBeads.map((b, i) => ({
        position: i + 1,
        instanceId: b.instanceId,
        id: b.product.id,
        name: b.product.name,
        diameterMm: ((b.product.diameter ?? 0) * 1000).toFixed(2),
        glbPath: b.product.glbPath,
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
