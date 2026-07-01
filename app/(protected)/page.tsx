import { BuilderLayout } from "@/components/builder/BuilderLayout";
import { DesktopOnly } from "@/components/ui/DesktopOnly";

export default function HomePage() {
  return (
    <DesktopOnly>
      <BuilderLayout />
    </DesktopOnly>
  );
}
