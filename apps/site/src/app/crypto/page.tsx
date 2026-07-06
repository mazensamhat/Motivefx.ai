import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { getModule } from "@/content/modules";

const SLUG = "crypto" as const;
export const metadata = entityMetadata(getModule(SLUG)!, `/${SLUG}`);

export default function CryptoModulePage() {
  const content = getModule(SLUG)!;
  return (
    <EntityPageView
      content={content}
      path={`/${SLUG}`}
      breadcrumbs={[{ name: "Home", href: "/" }, { name: "Crypto", href: `/${SLUG}` }]}
    />
  );
}
