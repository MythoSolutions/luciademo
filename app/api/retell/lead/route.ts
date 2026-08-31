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

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature") || "";
  const apiKey = process.env.RETELL_API_KEY?.trim() || "";

  try {
    if (!apiKey || !signature || !await verify(rawBody, apiKey, signature)) {
      return noStoreJson({ saved: false }, 401);
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    if (safeString(payload.name, 80) !== "save_lucia_lead") {
      return noStoreJson({ saved: false }, 400);
    }
    const args = payload.args;
    const call = payload.call;
    if (!args || typeof args !== "object" || !call || typeof call !== "object") {
      return noStoreJson({ saved: false }, 400);
    }
    const values = args as Record<string, unknown>;
    const callRecord = call as Record<string, unknown>;
    assertOwnedRetellCall(callRecord);
    const responseCommitment = safeString(values.response_commitment, 300);
    const approvedCommitments = new Set([
      "Mytho responderá en un máximo de un día hábil para revisar el caso.",
      "Mytho propondrá horarios para una reunión de diagnóstico de treinta minutos.",
    ]);
    if (!approvedCommitments.has(responseCommitment)) {
      return noStoreJson({ saved: false }, 400);
    }
    const result = await postToN8n<{ saved?: boolean; lead_id?: string }>("leads", {
      call_id: safeString(callRecord.call_id, 128),
      session_id: readSessionId(callRecord),
      contact_name: safeString(values.contact_name, 120),
      contact_method: safeString(values.contact_method, 20),
      contact_value: safeString(values.contact_value, 180),
      consent: values.consent === true || values.consent === "true",
      response_commitment: responseCommitment,
    });
    if (result.saved !== true || !result.lead_id) {
      throw new LuciaServerError("lead_not_saved", 503);
    }
    return noStoreJson({ saved: true, lead_id: result.lead_id });
  } catch (error) {
    if (error instanceof SyntaxError) return noStoreJson({ saved: false }, 400);
    if (error instanceof LuciaServerError) {
      return noStoreJson({ saved: false }, error.status === 429 ? 503 : error.status);
    }
    return noStoreJson({ saved: false }, 503);
  }
}
