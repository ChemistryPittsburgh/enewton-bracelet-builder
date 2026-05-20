import { BuilderLayout } from "@/components/builder/BuilderLayout";
import { BEADS } from "@/lib/bead-catalog";

export default function HomePage() {
  return <BuilderLayout beads={BEADS} />;
}
