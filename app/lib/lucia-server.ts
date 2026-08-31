import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const N8N_PATHS = {
  access: "lucia-demo-access",
  session: "lucia-demo-session",
  events: "lucia-demo-events",
  leads: "lucia-demo-leads",
} as const;

const ALLOWED_IP_HEADERS = new Set([
  "cf-connecting-ip",
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-forwarded-for",
]);

export class LuciaServerError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new LuciaServerError("service_not_configured", 503);
  return value;
}

function positiveNumber(name: string, maximum: number) {
  const value = Number(required(name));
  if (!Number.isFinite(value) || value <= 0 || value > maximum) {
    throw new LuciaServerError("service_not_configured", 503);
  }
  return value;
}

function nonNegativeInteger(name: string, maximum: number) {
  const value = Number(required(name));
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new LuciaServerError("service_not_configured", 503);
  }
  return value;
}

export function isDemoEnabled() {
  return process.env.LUCIA_DEMO_ENABLED?.trim().toLowerCase() === "true";
}

export function getSessionConfig() {
  return {
    retellApiKey: required("RETELL_API_KEY"),
    retellAgentId: required("RETELL_AGENT_ID"),
    retellAgentVersion: nonNegativeInteger("RETELL_AGENT_VERSION", 10_000),
    visitorHashSecret: required("LUCIA_VISITOR_HASH_SECRET"),
    turnstileSecretKey: required("TURNSTILE_SECRET_KEY"),
    reservationCostUsd: positiveNumber("LUCIA_SESSION_RESERVATION_USD", 5),
    dailyBudgetUsd: positiveNumber("LUCIA_DAILY_BUDGET_USD", 100),
  };
}

export function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.LUCIA_PUBLIC_ORIGIN?.trim() || new URL(request.url).origin;
  if (!origin || origin !== expected) {
    throw new LuciaServerError("invalid_origin", 403);
  }
}

export function assertSmallJsonRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new LuciaServerError("invalid_content_type", 415);
  }
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > 10_000) {
    throw new LuciaServerError("request_too_large", 413);
  }
}

export function getClientIp(request: Request) {
  const configuredHeader = (
    process.env.LUCIA_CLIENT_IP_HEADER?.trim().toLowerCase()
    || (process.env.NODE_ENV === "production" ? "" : "x-forwarded-for")
  );

  if (!ALLOWED_IP_HEADERS.has(configuredHeader)) {
    throw new LuciaServerError("service_not_configured", 503);
  }

  const value = request.headers.get(configuredHeader)?.split(",")[0]?.trim();
  if (value && isIP(value)) return value;
  if (value) throw new LuciaServerError("client_address_unavailable", 503);
  if (process.env.NODE_ENV !== "production") return "127.0.0.1";
  throw new LuciaServerError("client_address_unavailable", 503);
}

export function hashVisitor(ip: string, secret: string) {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function mexicoCityDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

type TurnstileResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

export async function verifyTurnstile({
  token,
  secret,
  ip,
}: {
  token: string;
  secret: string;
  ip: string;
}) {
  if (token.length < 10 || token.length > 2048) {
    throw new LuciaServerError("challenge_failed", 403);
  }

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  form.set("remoteip", ip);
  form.set("idempotency_key", crypto.randomUUID());

  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new LuciaServerError("challenge_unavailable", 503);
  }

  if (!response.ok) throw new LuciaServerError("challenge_unavailable", 503);
  const result = await response.json() as TurnstileResult;
  const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim();
  if (
    result.success !== true
    || result.action !== "lucia_demo_call"
    || (expectedHostname && result.hostname !== expectedHostname)
  ) {
    throw new LuciaServerError("challenge_failed", 403);
  }
}

export async function postToN8n<T>(path: keyof typeof N8N_PATHS, body: unknown) {
  const baseUrl = required("LUCIA_N8N_WEBHOOK_BASE_URL").replace(/\/$/, "");
  const secret = required("LUCIA_N8N_SHARED_SECRET");
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/webhook/${N8N_PATHS[path]}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Lucia-Demo-Secret": secret,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new LuciaServerError("operations_unavailable", 503);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new LuciaServerError("operations_unavailable", 503);
  }
  if (!response.ok) {
    if (response.status === 429) return result as T;
    throw new LuciaServerError("operations_unavailable", 503);
  }
  return result as T;
}

export function readSessionId(call: Record<string, unknown>) {
  const variables = call.retell_llm_dynamic_variables;
  if (variables && typeof variables === "object") {
    const sessionId = (variables as Record<string, unknown>).session_id;
    if (typeof sessionId === "string") return sessionId;
  }
  const metadata = call.metadata;
  if (metadata && typeof metadata === "object") {
    const sessionId = (metadata as Record<string, unknown>).session_id;
    if (typeof sessionId === "string") return sessionId;
  }
  return "";
}

export function assertOwnedRetellCall(call: Record<string, unknown>) {
  const expectedAgentId = required("RETELL_AGENT_ID");
  if (safeString(call.agent_id, 128) !== expectedAgentId) {
    throw new LuciaServerError("unrecognized_agent", 403);
  }
}

export function safeString(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}
