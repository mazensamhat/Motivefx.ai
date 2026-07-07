import { isCompAccessExpired } from "./comp-access";

export type SubscriptionAccessUser = {
  stripeSubscriptionId: string | null;
  subscriptionStatus: string;
  accessExpiresAt: Date | string | null;
  disabledAt?: Date | string | null;
};

export function userHasActiveSubscription(user: SubscriptionAccessUser): boolean {
  if (user.disabledAt) return false;
  if (user.subscriptionStatus === "paused" || user.subscriptionStatus === "cancelled") {
    return false;
  }
  if (user.stripeSubscriptionId) return true;
  if (user.subscriptionStatus !== "comp" && user.subscriptionStatus !== "active") {
    return false;
  }
  return !isCompAccessExpired(user.accessExpiresAt, false);
}

export function subscriptionStatusLabel(status: string): string {
  switch (status) {
    case "comp":
      return "Comp access";
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "cancelled":
      return "Cancelled";
    default:
      return "None";
  }
}
