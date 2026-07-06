import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-page min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
