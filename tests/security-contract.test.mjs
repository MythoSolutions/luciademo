import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const session = read("app/api/lucia/session/route.ts");
const webhook = read("app/api/retell/webhook/route.ts");
const lead = read("app/api/retell/lead/route.ts");
const server = read("app/lib/lucia-server.ts");
const widget = read("app/components/retell-voice-widget.tsx");
const config = read("next.config.ts");
const envExample = read(".env.example");

test("keeps every Retell secret and agent identifier on the server", () => {
  assert.match(session, /new Retell\(/);
  assert.match(session, /createWebCall/);
  assert.match(server, /process\.env\[name\]/);
  assert.match(server, /RETELL_API_KEY/);
  assert.doesNotMatch(widget, /RETELL_API_KEY|RETELL_AGENT_ID|NEXT_PUBLIC_RETELL|agent_[a-z0-9_-]+/i);
  assert.doesNotMatch(envExample, /^NEXT_PUBLIC_RETELL/gm);
});

test("verifies Turnstile before reserving or creating a call", () => {
  const challenge = session.indexOf("verifyTurnstile");
  const reserve = session.indexOf('postToN8n<AccessResult>("access"');
  const create = session.indexOf("createWebCall");
  assert.ok(challenge >= 0 && reserve > challenge && create > reserve);
  assert.match(server, /turnstile\/v0\/siteverify/);
  assert.match(server, /result\.action !== "lucia_demo_call"/);
  assert.match(session, /hashVisitor\(ip/);
});

test("requires same-origin calls and an explicit trusted IP header", () => {
  assert.match(session, /assertSameOrigin\(request\)/);
  assert.match(server, /LUCIA_PUBLIC_ORIGIN/);
  assert.match(server, /LUCIA_CLIENT_IP_HEADER/);
  assert.match(server, /LUCIA_VISITOR_HASH_SECRET/);
  assert.match(server, /isIP\(value\)/);
  assert.match(session, /assertSmallJsonRequest\(request\)/);
});

test("authenticates n8n and fails closed on unavailable operations", () => {
  assert.match(server, /"X-Lucia-Demo-Secret": secret/);
  assert.match(server, /AbortSignal\.timeout/);
  assert.match(session, /LUCIA_DEMO_ENABLED|isDemoEnabled/);
  assert.match(session, /cancelReservation/);
});

test("verifies Retell signatures against the exact raw body", () => {
  for (const route of [webhook, lead]) {
    assert.match(route, /const rawBody = await request\.text\(\)/);
    assert.match(route, /verify\(rawBody, apiKey, signature\)/);
    assert.match(route, /x-retell-signature/i);
  }
});

test("forwards only operational event data and no transcript", () => {
  assert.match(webhook, /combinedCostCents \/ 100/);
  assert.match(webhook, /call_started/);
  assert.match(webhook, /call_analyzed/);
  assert.doesNotMatch(webhook, /transcript|recording_url|public_log/i);
});

test("accepts leads only through the named signed Retell function", () => {
  assert.match(lead, /save_lucia_lead/);
  assert.match(lead, /consent/);
  assert.match(lead, /saved: true/);
  assert.match(lead, /saved: false/);
  assert.match(lead, /approvedCommitments/);
  assert.match(lead, /assertOwnedRetellCall/);
});

test("sets browser defenses needed by the protected voice entry", () => {
  for (const header of [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) assert.match(config, new RegExp(header));
  assert.match(config, /challenges\.cloudflare\.com/);
  assert.match(config, /wss:\/\/\*\.livekit\.cloud/);
});
