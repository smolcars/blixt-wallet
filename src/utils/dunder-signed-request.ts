/**
 * Signed requests for Dunder (Blixt LSP).
 *
 * Older Dunder servers verify a signature over a fixed word ("REGISTER",
 * "CLAIM", "CHECKSTATUS"), which can be replayed and doesn't cover the request
 * contents (request signing version 1). Newer servers advertise
 * `requestSigningVersion: 2` in /ondemand-channel/service-status and accept a
 * signed JSON message instead:
 *
 *   { endpoint, domain, timestamp, nonce, data }
 *
 * Dunder accepts each message once, within 30 seconds of its timestamp, only for
 * the named endpoint and its own domain, and reads the request fields from
 * `data`.
 */

export type DunderSignedEndpoint =
  | "/ondemand-channel/register"
  | "/ondemand-channel/claim"
  | "/ondemand-channel/check-status";

export interface IDunderSignedRequestBody {
  pubkey: string;
  message: string;
  signature: string;
}

export function supportsDunderSignedRequests(
  status: { requestSigningVersion?: number } | null | undefined,
): boolean {
  return (
    typeof status?.requestSigningVersion === "number" && status.requestSigningVersion >= 2
  );
}

/**
 * The host (with a non-default port) of a Dunder server URL, lowercased. Must
 * equal the host of Dunder's configured `serverDomain`. Parsed by hand to avoid
 * depending on React Native's URL implementation.
 */
export function dunderServiceDomain(server: string): string {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]+)/i.exec(server.trim());
  if (!match) {
    throw new Error("Invalid Dunder server URL");
  }
  const scheme = match[1].toLowerCase();
  let host = match[2].toLowerCase();
  const userInfoEnd = host.lastIndexOf("@");
  if (userInfoEnd !== -1) {
    host = host.slice(userInfoEnd + 1);
  }
  if ((scheme === "https" && host.endsWith(":443")) || (scheme === "http" && host.endsWith(":80"))) {
    host = host.replace(/:\d+$/, "");
  }
  return host;
}

export async function createDunderSignedRequest(options: {
  server: string;
  endpoint: DunderSignedEndpoint;
  pubkey: string;
  data: Record<string, unknown>;
  /** Signs the message with the node key (lnd SignMessage) and returns the signature. */
  sign: (message: string) => Promise<string>;
  /** Returns a random hex string (at least 16 characters). */
  randomHex: () => Promise<string>;
  now?: number;
}): Promise<IDunderSignedRequestBody> {
  const message = JSON.stringify({
    endpoint: options.endpoint,
    domain: dunderServiceDomain(options.server),
    timestamp: Math.floor((options.now ?? Date.now()) / 1000),
    nonce: await options.randomHex(),
    data: options.data,
  });
  return {
    pubkey: options.pubkey,
    message,
    signature: await options.sign(message),
  };
}
