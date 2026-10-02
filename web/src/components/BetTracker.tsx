import { SavedPositionLedger, type SavedLedgerProps } from "./SavedPositionLedger";
export function BetTracker(props: SavedLedgerProps) {
  return <SavedPositionLedger {...props} kind="betting" />;
}
