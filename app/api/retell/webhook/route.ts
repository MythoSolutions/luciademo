import { createHash } from "node:crypto";
import { verify } from "retell-sdk";

import {
  LuciaServerError,
  assertOwnedRetellCall,
  noStoreJson,
  postToN8n,
  readSessionId,
  safeString,
} from "@/app/lib/lucia-server";

export const runtime = "nodejs";

const ALLOWED_EVENTS = new Set(["call_started", "call_ended", "call_analyzed"]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature") || "";
  const apiKey = process.env.RETELL_API_KEY?.trim() || "";

  try {
    if (!apiKey || !signature || !await verify(rawBody, apiKey, signature)) {
      return noStoreJson({ ok: false }, 401);
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const event = safeString(payload.event, 40);
    if (!ALLOWED_EVENTS.has(event)) return new Response(null, { status: 204 });

    const call = payload.call;
    if (!call || typeof call !== "object") return noStoreJson({ ok: false }, 400);
    const callRecord = call as Record<string, unknown>;
    assertOwnedRetellCall(callRecord);
    const callId = safeString(callRecord.call_id, 128);
    if (!callId) return noStoreJson({ ok: false }, 400);

    const callCost = callRecord.call_cost;
    const combinedCostCents = callCost && typeof callCost === "object"
      ? Number((callCost as Record<string, unknown>).combined_cost || 0)
      : 0;
    const costUsd = event === "call_analyzed" && Number.isFinite(combinedCostCents)
      ? Math.max(0, combinedCostCents / 100)
      : 0;
    const digest = createHash("sha256").update(rawBody).digest("hex").slice(0, 24);

    await postToN8n("events", {
      event_id: `retell:${event}:${digest}`,
      event_type: event,
      call_id: callId,
      session_id: readSessionId(callRecord),
      cost_usd: costUsd,
      received_at: new Date().toISOString(),
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof SyntaxError) return noStoreJson({ ok: false }, 400);
    if (error instanceof LuciaServerError) {
      return noStoreJson({ ok: false }, error.status === 429 ? 503 : error.status);
    }
    return noStoreJson({ ok: false }, 503);
  }
}
