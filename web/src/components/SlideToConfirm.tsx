import { useRef, useState, type PointerEvent } from "react";
import { ChevronRight } from "lucide-react";

interface Props {
  label: string;
  accent: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export function SlideToConfirm({ label, accent, onConfirm, disabled }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function maxOffset() {
    const track = trackRef.current;
    if (!track) return 200;
    return track.clientWidth - 44;
  }

  function onPointerDown(e: PointerEvent) {
    if (disabled || confirmed) return;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || disabled || confirmed) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left - 22;
    setOffset(Math.max(0, Math.min(maxOffset(), x)));
  }

  function onPointerUp() {
    if (!dragging || disabled || confirmed) return;
    setDragging(false);
    if (offset >= maxOffset() * 0.92) {
      setOffset(maxOffset());
      setConfirmed(true);
      onConfirm();
      window.setTimeout(() => {
        setConfirmed(false);
        setOffset(0);
      }, 1200);
    } else {
      setOffset(0);
    }
  }

  const progress = maxOffset() > 0 ? offset / maxOffset() : 0;

  return (
    <div
      ref={trackRef}
      className={`slide-confirm-track ${disabled ? "disabled" : ""} ${confirmed ? "confirmed" : ""}`}
      style={{ ["--slide-accent" as string]: accent }}
    >
      <div className="slide-confirm-fill" style={{ width: `${progress * 100}%` }} />
      <span className="slide-confirm-label" style={{ opacity: 1 - progress * 0.85 }}>
        {confirmed ? "Confirmed ✓" : label}
      </span>
      <button
        type="button"
        className="slide-confirm-thumb"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        disabled={disabled || confirmed}
        aria-label={label}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
