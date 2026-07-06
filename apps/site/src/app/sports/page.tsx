import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { getModule } from "@/content/modules";

export const metadata = entityMetadata(getModule("sports")!, "/sports");

export default function SportsModulePage() {
  const content = getModule("sports")!;
  return (
    <EntityPageView
      content={content}
      path="/sports"
      breadcrumbs={[{ name: "Home", href: "/" }, { name: "Sports Betting", href: "/sports" }]}
    />
  );
}
