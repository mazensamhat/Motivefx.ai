import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { getModule } from "@/content/modules";

export const metadata = entityMetadata(getModule("stocks")!, "/stocks");

export default function StocksModulePage() {
  const content = getModule("stocks")!;
  return (
    <EntityPageView
      content={content}
      path="/stocks"
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Stocks", href: "/stocks" },
      ]}
    />
  );
}
