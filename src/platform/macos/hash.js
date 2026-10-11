import { hash } from "fast-sha256";
export const CONSTANTS = { HashAlgorithms: { sha256: "sha256" } };
export async function JSHash(text, algorithm) {
  if (algorithm !== "sha256") throw new Error(`Unsupported hash: ${algorithm}`);
  const bytes = new TextEncoder().encode(text);
  return Array.from(hash(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
