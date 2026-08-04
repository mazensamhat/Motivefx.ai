import { ANDROID_PACKAGE_ID, IOS_APP_STORE_URL, PLAY_STORE_URL, STORE_COPY } from "@/lib/store-links";

function GooglePlayGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden width="22" height="22">
      <path
        fill="currentColor"
        d="M3.6 2.3c-.3.2-.5.6-.5 1v17.4c0 .4.2.8.5 1l9.6-9.7L3.6 2.3zm12.2 7L13 7.5 4.5 2.6l11.3 6.7zm.7.7-2.4 1.4 2.4 1.4 3.2-1.9-3.2-.9zm-3.5 2.1 2.8 1.7 2.8 1.6-11.4 6.8 5.8-10.1z"
      />
    </svg>
  );
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden width="22" height="22">
      <path
        fill="currentColor"
        d="M16.4 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.8zm-2-5.9c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1.1 1.7-1 2.6 1 .1 1.9-.5 2.6-1.2z"
      />
    </svg>
  );
}

type StoreBadgesProps = {
  /** Compact text links for footers / tight layouts. */
  variant?: "badges" | "links";
  className?: string;
};

export function StoreBadges({ variant = "badges", className }: StoreBadgesProps) {
  if (variant === "links") {
    return (
      <ul className={className ?? "footer-links"}>
        <li>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label={STORE_COPY.playAria}>
            Google Play
          </a>
        </li>
        <li>
          <span className="store-link-soon" aria-label={STORE_COPY.iosAria}>
            iOS — Coming soon
          </span>
        </li>
      </ul>
    );
  }

  return (
    <div className={`store-buttons ${className ?? ""}`.trim()}>
      <a
        href={PLAY_STORE_URL}
        className="store-badge store-badge-play"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={STORE_COPY.playAria}
        data-package={ANDROID_PACKAGE_ID}
      >
        <GooglePlayGlyph />
        <span className="store-badge-text">
          <span className="store-badge-eyebrow">Get it on</span>
          <span className="store-badge-title">Google Play</span>
        </span>
      </a>

      {IOS_APP_STORE_URL ? (
        <a
          href={IOS_APP_STORE_URL}
          className="store-badge store-badge-ios"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={STORE_COPY.iosAria}
        >
          <AppleGlyph />
          <span className="store-badge-text">
            <span className="store-badge-eyebrow">Download on the</span>
            <span className="store-badge-title">App Store</span>
          </span>
        </a>
      ) : (
        <span className="store-badge store-badge-ios store-badge-soon" aria-label={STORE_COPY.iosAria}>
          <AppleGlyph />
          <span className="store-badge-text">
            <span className="store-badge-eyebrow">Coming soon on the</span>
            <span className="store-badge-title">App Store</span>
          </span>
        </span>
      )}
    </div>
  );
}
