import { OpportunityRadarBoard } from "./opportunity-radar-board";

export function OpportunityRadarSection() {
  return (
    <section id="opportunity-radar" className="section-pad blueprint-section blueprint-section-alt">
      <div className="mx-auto max-w-6xl px-4">
        <OpportunityRadarBoard ctaHref="#relationship-graph" ctaLabel="Explore Signal Graph™" />
      </div>
    </section>
  );
}
