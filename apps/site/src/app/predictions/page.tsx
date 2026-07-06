import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { getModule } from "@/content/modules";

export const metadata = entityMetadata(getModule("predictions")!, "/predictions");

export default function PredictionsModulePage() {
  const content = getModule("predictions")!;
  return (
    <EntityPageView
      content={content}
      path="/predictions"
      breadcrumbs={[{ name: "Home", href: "/" }, { name: "Prediction Markets", href: "/predictions" }]}
    />
  );
}
