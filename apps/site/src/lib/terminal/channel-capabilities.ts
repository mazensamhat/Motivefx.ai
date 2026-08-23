/**
 * G4 ChannelCapabilities — single policy matrix for web / iOS / Android.
 */

export type Channel = "web" | "ios" | "android";

export type ChannelCapability =
  | "stocksIntelligence"
  | "cryptoIntelligence"
  | "oddsIntelligence"
  | "eventIntelligence"
  | "portfolio"
  | "askMotive"
  | "stripePurchase"
  | "brokerExecution"
  | "cryptoExecution"
  | "sportsbookExecution"
  | "predictionExecution"
  | "apiManagement";

const MATRIX: Record<Channel, Record<ChannelCapability, boolean>> = {
  web: {
    stocksIntelligence: true,
    cryptoIntelligence: true,
    oddsIntelligence: true,
    eventIntelligence: true,
    portfolio: true,
    askMotive: true,
    stripePurchase: true,
    brokerExecution: false,
    cryptoExecution: false,
    sportsbookExecution: false,
    predictionExecution: false,
    apiManagement: true,
  },
  ios: {
    stocksIntelligence: true,
    cryptoIntelligence: true,
    oddsIntelligence: true,
    eventIntelligence: true,
    portfolio: true,
    askMotive: true,
    stripePurchase: false,
    brokerExecution: false,
    cryptoExecution: false,
    sportsbookExecution: false,
    predictionExecution: false,
    apiManagement: false,
  },
  android: {
    stocksIntelligence: true,
    cryptoIntelligence: true,
    oddsIntelligence: true,
    eventIntelligence: true,
    portfolio: true,
    askMotive: true,
    stripePurchase: false,
    brokerExecution: false,
    cryptoExecution: false,
    sportsbookExecution: false,
    predictionExecution: false,
    apiManagement: false,
  },
};

export function channelAllows(channel: Channel, capability: ChannelCapability): boolean {
  return MATRIX[channel][capability];
}

export function channelCapabilities(channel: Channel): Record<ChannelCapability, boolean> {
  return { ...MATRIX[channel] };
}

/** Compliance Manifest snapshot for Truth Console / release gate. */
export function complianceManifest() {
  return {
    version: "CHANNEL_CAPABILITIES_V1",
    matrix: MATRIX,
    nativeCommercialStrategy: "informational_companion_reader" as const,
    paidPrimaryChannel: "web" as const,
  };
}
