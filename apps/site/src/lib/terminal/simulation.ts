import { prisma } from "@motivefx/database";
import type { User } from "@prisma/client";
import { planForUser } from "./plan";

const SIMULATION_MODULES = ["betting", "predictions"] as const;
const SIMULATION_DAYS = 3;
const START_BANKROLL = 1000;

export interface SimulationStatus {
  active: boolean;
  expiresAt: string | null;
  bankroll: number;
  modules: string[];
  daysRemaining: number;
}

export async function ensureSimTrial(user: User): Promise<SimulationStatus> {
  if (!user.simTrialStartedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { simTrialStartedAt: new Date(), simBankroll: START_BANKROLL },
    });
    user = { ...user, simTrialStartedAt: new Date(), simBankroll: START_BANKROLL };
  }
  return getSimulationStatus(user);
}

export function getSimulationStatus(user: User): SimulationStatus {
  const started = user.simTrialStartedAt;
  const bankroll = user.simBankroll ?? START_BANKROLL;
  if (!started) {
    return { active: false, expiresAt: null, bankroll, modules: [], daysRemaining: 0 };
  }
  const expires = new Date(started.getTime() + SIMULATION_DAYS * 86400000);
  const now = Date.now();
  const active = now < expires.getTime();
  const daysRemaining = active ? (expires.getTime() - now) / 86400000 : 0;
  return {
    active,
    expiresAt: expires.toISOString(),
    bankroll: Math.round(bankroll * 100) / 100,
    modules: active ? [...SIMULATION_MODULES] : [],
    daysRemaining: Math.round(daysRemaining * 10) / 10,
  };
}

export function simHasModule(user: User, module: string): boolean {
  if (!(SIMULATION_MODULES as readonly string[]).includes(module)) return false;
  const plan = planForUser(user);
  if (plan.hasSubscription && plan.allowedMarkets.includes(module)) return false;
  return getSimulationStatus(user).active;
}
