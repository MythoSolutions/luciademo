import "server-only";

import Retell from "retell-sdk";

import {
  LuciaServerError,
  getSessionConfig,
  mexicoCityDay,
  postToN8n,
} from "@/app/lib/lucia-server";

type AccessResult = {
  allowed?: boolean;
  reason?: string;
  session_id?: string;
};

async function cancelReservation(sessionId: string) {
  try {
    await postToN8n("session", { action: "cancel", session_id: sessionId });
  } catch {
    // Preserve the original failure. n8n retains the reservation audit trail.
  }
}

export async function createLuciaWebSession({
  visitorHash,
  channel,
}: {
  visitorHash: string;
  channel: "lucia_web_demo" | "lucia_admin_debug";
}) {
  let sessionId = "";
  let callId = "";
  let retell: Retell | null = null;

  try {
    const config = getSessionConfig();
    const access = await postToN8n<AccessResult>("access", {
      visitor_hash: visitorHash,
      day: mexicoCityDay(),
      reservation_cost_usd: config.reservationCostUsd,
      daily_budget_usd: config.dailyBudgetUsd,
      enabled: true,
    });

    if (!access.allowed || !access.session_id) {
      throw new LuciaServerError(access.reason || "operations_unavailable", 429);
    }
    sessionId = access.session_id;

    retell = new Retell({ apiKey: config.retellApiKey, maxRetries: 1, timeout: 10_000 });
    const webCall = await retell.call.createWebCall({
      agent_id: config.retellAgentId,
      agent_version: config.retellAgentVersion,
      metadata: { session_id: sessionId, channel },
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

    return { accessToken: webCall.access_token, callId };
  } catch (error) {
    if (callId && retell) {
      try {
        await retell.call.stop(callId);
      } catch {
        // The unshared access token expires quickly even if stopping fails.
      }
    }
    if (sessionId) await cancelReservation(sessionId);
    throw error;
  }
}
