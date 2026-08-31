import Retell from "retell-sdk";

import {
  LuciaServerError,
  assertSmallJsonRequest,
  assertSameOrigin,
  getClientIp,
  getSessionConfig,
  hashVisitor,
  isDemoEnabled,
  mexicoCityDay,
  noStoreJson,
  postToN8n,
  safeString,
  verifyTurnstile,
} from "@/app/lib/lucia-server";

export const runtime = "nodejs";

type AccessResult = {
  allowed?: boolean;
  reason?: string;
  session_id?: string;
};

async function cancelReservation(sessionId: string) {
  try {
    await postToN8n("session", { action: "cancel", session_id: sessionId });
  } catch {
    // The original failure remains the useful response. n8n retains an audit trail.
  }
}

export async function POST(request: Request) {
  let sessionId = "";
  let retell: Retell | null = null;
  let callId = "";

  try {
    assertSameOrigin(request);
    assertSmallJsonRequest(request);
    if (!isDemoEnabled()) {
      return noStoreJson({ ok: false, reason: "paused" }, 503);
    }

    const body = await request.json() as Record<string, unknown>;
    if (safeString(body.website, 200)) {
      throw new LuciaServerError("challenge_failed", 403);
    }
    const token = safeString(body.turnstileToken, 2048);
    const ip = getClientIp(request);
    const config = getSessionConfig();
    await verifyTurnstile({ token, secret: config.turnstileSecretKey, ip });

    const access = await postToN8n<AccessResult>("access", {
      visitor_hash: hashVisitor(ip, config.visitorHashSecret),
      day: mexicoCityDay(),
      reservation_cost_usd: config.reservationCostUsd,
      daily_budget_usd: config.dailyBudgetUsd,
      enabled: true,
    });

    if (!access.allowed || !access.session_id) {
      return noStoreJson({ ok: false, reason: access.reason || "operations_unavailable" }, 429);
    }
    sessionId = access.session_id;

    retell = new Retell({ apiKey: config.retellApiKey, maxRetries: 1, timeout: 10_000 });
    const webCall = await retell.call.createWebCall({
      agent_id: config.retellAgentId,
      agent_version: config.retellAgentVersion,
      metadata: { session_id: sessionId, channel: "lucia_web_demo" },
      retell_llm_dynamic_variables: {
        session_id: sessionId,
        lead_route_enabled: "true",
        lead_delivery_ready: "true",
        response_commitment: "Mytho responderá en un máximo de un día hábil para revisar el caso.",
      },
    });
    callId = webCall.call_id;

    const attached = await postToN8n<{ ok?: boolean; status?: string }>("session", {
      action: "attach",
      session_id: sessionId,
      call_id: callId,
    });
    if (attached.ok !== true || attached.status !== "token_issued") {
      throw new LuciaServerError("operations_unavailable", 503);
    }

    return noStoreJson({ ok: true, accessToken: webCall.access_token, callId });
  } catch (error) {
    if (callId && retell) {
      try {
        await retell.call.stop(callId);
      } catch {
        // The unshared access token expires quickly even if stopping fails.
      }
    }
    if (sessionId) await cancelReservation(sessionId);
    if (error instanceof LuciaServerError) {
      return noStoreJson({ ok: false, reason: error.code }, error.status);
    }
    return noStoreJson({ ok: false, reason: "service_unavailable" }, 503);
  }
}
