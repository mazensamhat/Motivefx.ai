import { Sparkles } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { APP_MODULE_TO_BRAND } from "../brand/moduleBrand";
import { CompareLensSection } from "./CompareLensSection";
import type { HomeBriefing } from "../types";

const TAB_TO_STORY_KEY: Record<string, keyof NonNullable<HomeBriefing["moduleStories"]>> = {
  stocks: "trades",
  penny: "penny",
  crypto: "crypto",
  betting: "betting",
  predictions: "predictions",
};

interface Props {
  tab: "stocks" | "penny" | "crypto" | "betting" | "predictions";
}

export function ModuleIntelStrip({ tab }: Props) {
  const storyKey = TAB_TO_STORY_KEY[tab];
  const { data } = useApi<HomeBriefing>("/home/briefing", 60_000);
  const story = data?.moduleStories?.[storyKey];
  const lens = (data?.compareLens ?? []).filter((c) => c.module === storyKey);

  if (!story && lens.length === 0) return null;

  return (
    <>
      {story && (
        <section
          className="module-story-banner glass-card"
          data-brand={APP_MODULE_TO_BRAND[storyKey] ?? "trades"}
        >
          <Sparkles size={16} />
          <p>{story}</p>
        </section>
      )}
      {lens.length > 0 && <CompareLensSection items={lens} />}
    </>
  );
}
