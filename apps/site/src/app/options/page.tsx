import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { getModule } from "@/content/modules";

export const metadata = entityMetadata(getModule("options")!, "/options");

export default function OptionsModulePage() {
  const content = getModule("options")!;
  return (
    <EntityPageView
      content={content}
      path="/options"
      breadcrumbs={[{ name: "Home", href: "/" }, { name: "Options Flow", href: "/options" }]}
    />
  );
}
