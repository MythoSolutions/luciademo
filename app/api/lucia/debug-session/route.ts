import { randomUUID } from "node:crypto";

import {
  LuciaServerError,
  assertSameOrigin,
  assertSmallJsonRequest,
  getSessionConfig,
  hashVisitor,
  isPrivateDebugEnabled,
  noStoreJson,
  safeString,
} from "@/app/lib/lucia-server";
import { createLuciaWebSession } from "@/app/lib/lucia-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertSmallJsonRequest(request);
    if (!isPrivateDebugEnabled()) {
      return noStoreJson({ ok: false, reason: "not_found" }, 404);
    }

    const body = await request.json() as Record<string, unknown>;
    if (safeString(body.website, 200)) {
      throw new LuciaServerError("invalid_request", 403);
    }

    const config = getSessionConfig();
    const webCall = await createLuciaWebSession({
      visitorHash: hashVisitor(`admin:${randomUUID()}`, config.visitorHashSecret),
      channel: "lucia_admin_debug",
    });
    return noStoreJson({ ok: true, ...webCall });
  } catch (error) {
    if (error instanceof LuciaServerError) {
      return noStoreJson({ ok: false, reason: error.code }, error.status);
    }
    return noStoreJson({ ok: false, reason: "service_unavailable" }, 503);
  }
}
