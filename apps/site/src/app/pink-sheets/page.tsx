import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { getModule } from "@/content/modules";

export const metadata = entityMetadata(getModule("pink-sheets")!, "/pink-sheets");

export default function PinkSheetsModulePage() {
  const content = getModule("pink-sheets")!;
  return (
    <EntityPageView
      content={content}
      path="/pink-sheets"
      breadcrumbs={[{ name: "Home", href: "/" }, { name: "Pink Sheets", href: "/pink-sheets" }]}
    />
  );
}
