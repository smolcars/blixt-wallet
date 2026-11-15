import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDunderSignedRequest,
  dunderServiceDomain,
  supportsDunderSignedRequests,
} from "../dunder-signed-request.ts";

test("the domain is the server's host, without default ports or credentials", () => {
  assert.equal(dunderServiceDomain("https://dunder.example.com"), "dunder.example.com");
  assert.equal(dunderServiceDomain("https://Dunder.Example.com/"), "dunder.example.com");
  assert.equal(dunderServiceDomain("https://dunder.example.com:443/path"), "dunder.example.com");
  assert.equal(dunderServiceDomain("http://10.0.2.2:8080"), "10.0.2.2:8080");
  assert.equal(dunderServiceDomain("http://dunder.local:80"), "dunder.local");
  assert.equal(dunderServiceDomain("https://user:pass@dunder.example.com"), "dunder.example.com");
  assert.throws(() => dunderServiceDomain("dunder.example.com"));
});

test("only servers that advertise the format get signed messages", () => {
  assert.equal(supportsDunderSignedRequests({ requestSigningVersion: 2 }), true);
  assert.equal(supportsDunderSignedRequests({ requestSigningVersion: 3 }), true);
  assert.equal(supportsDunderSignedRequests({ requestSigningVersion: 1 }), false);
  assert.equal(supportsDunderSignedRequests({}), false);
  assert.equal(supportsDunderSignedRequests(null), false);
  assert.equal(supportsDunderSignedRequests(undefined), false);
});

test("signs exactly the message it sends, bound to endpoint, domain and time", async () => {
  let signed;
  const body = await createDunderSignedRequest({
    server: "https://dunder.example.com",
    endpoint: "/ondemand-channel/register",
    pubkey: "02abc",
    data: { amountSat: 50000, preimage: "ab".repeat(32) },
    sign: async (message) => {
      signed = message;
      return "signature";
    },
    randomHex: async () => "00112233445566778899aabbccddeeff",
    now: 1_731_628_800_123,
  });

  assert.equal(body.pubkey, "02abc");
  assert.equal(body.signature, "signature");
  assert.equal(body.message, signed);
  assert.deepEqual(JSON.parse(body.message), {
    endpoint: "/ondemand-channel/register",
    domain: "dunder.example.com",
    timestamp: 1_731_628_800,
    nonce: "00112233445566778899aabbccddeeff",
    data: { amountSat: 50000, preimage: "ab".repeat(32) },
  });
});
