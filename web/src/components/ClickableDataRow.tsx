import { type ReactNode } from "react";

interface Props {
  onInspect: () => void;
  children: ReactNode;
  title?: string;
}

export function ClickableDataRow({ onInspect, children, title }: Props) {
  return (
    <button
      type="button"
      className="data-row data-row-clickable"
      onClick={onInspect}
      title={title ?? "Click for more info"}
    >
      {children}
    </button>
  );
}
