export type FeePriority = "low" | "medium" | "high";
export type RecommendedFees = Record<FeePriority, number>;

// An absolute threshold also catches bad recommendations from the fee server.
export const HIGH_ONCHAIN_FEE_RATE = 100;

export async function confirmOnchainFee(
  feeRate: number | undefined,
  confirmHighFee: (feeRate: number) => Promise<boolean>,
): Promise<boolean> {
  if (feeRate === undefined || !Number.isSafeInteger(feeRate) || feeRate <= 0) {
    return false;
  }
  if (feeRate < HIGH_ONCHAIN_FEE_RATE) {
    return true;
  }
  // Approval is specific to this rate and submission; never remember it for retries.
  return (await confirmHighFee(feeRate)) === true;
}

export function defaultOnchainFeeServer(chain: string): string {
  switch (chain) {
    case "mainnet":
      return "https://mempool.space/api";
    case "testnet":
    case "signet":
      return `https://mempool.space/${chain}/api`;
    default:
      // No public fee server is available for local regtest networks.
      return "";
  }
}

export class FeeServerRequiresHttpsError extends Error {
  constructor() {
    super(
      "On iOS, use HTTPS for public hostnames. HTTP is allowed for local hostnames and IP addresses.",
    );
  }
}

export function normalizeOnchainFeeServer(value: string, platform?: string): string {
  const server = value.trim().replace(/\/+$/, "");
  const url = new URL(server);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !url.hostname ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid fee server URL");
  }
  if (platform === "ios" && url.protocol === "http:") {
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    // Match Info.plist's NSAllowsLocalNetworking exception: unqualified names,
    // .local domains and IP literals (including public IPs), not arbitrary DNS names.
    const allowsHttp =
      !hostname.includes(".") ||
      hostname.endsWith(".local") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
      hostname.includes(":");
    if (!allowsHttp) {
      throw new FeeServerRequiresHttpsError();
    }
  }
  return server;
}

export function parseCustomFee(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) {
    return undefined;
  }
  const fee = Number(value);
  return Number.isSafeInteger(fee) && fee > 0 ? fee : undefined;
}

export async function fetchRecommendedFees(
  server: string,
  signal: AbortSignal,
  platform?: string,
): Promise<RecommendedFees> {
  const baseUrl = normalizeOnchainFeeServer(server, platform);
  const options = {
    // Native and DOM AbortSignal declarations differ, but both support fetch cancellation.
    signal: signal as RequestInit["signal"],
  };
  let response = await fetch(`${baseUrl}/v1/fees/recommended`, options);
  const useEsplora = response.status === 404;
  if (useEsplora) {
    response = await fetch(`${baseUrl}/fee-estimates`, options);
  }
  if (!response.ok) {
    throw new Error(`Fee request failed (${response.status})`);
  }
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid fee recommendations");
  }
  const recommendations = data as Record<string, unknown>;
  const normalizeFee = (fee: unknown): number => {
    if (
      typeof fee !== "number" ||
      !Number.isFinite(fee) ||
      fee <= 0 ||
      fee > Number.MAX_SAFE_INTEGER
    ) {
      throw new Error("Invalid fee recommendation");
    }
    // LND's SendCoins satPerVbyte field accepts whole satoshis only.
    return Math.ceil(fee);
  };
  return {
    low: normalizeFee(useEsplora ? recommendations["6"] : recommendations.hourFee),
    medium: normalizeFee(useEsplora ? recommendations["3"] : recommendations.halfHourFee),
    high: normalizeFee(useEsplora ? recommendations["1"] : recommendations.fastestFee),
  };
}
