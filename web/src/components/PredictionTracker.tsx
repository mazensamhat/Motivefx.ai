import { SavedPositionLedger, type SavedLedgerProps } from "./SavedPositionLedger";
export function PredictionTracker(props: SavedLedgerProps) {
  return <SavedPositionLedger {...props} kind="predictions" />;
}