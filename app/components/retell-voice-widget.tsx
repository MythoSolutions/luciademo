"use client";

import { RetellWebClient } from "retell-client-js-sdk";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type CallState = "waiting" | "ready" | "connecting" | "active" | "error";

const messages: Record<CallState, string> = {
  waiting: "Completa la verificación para habilitar la llamada.",
  ready: "Todo listo. Puedes iniciar la llamada.",
  connecting: "Conectando con Lucía…",
  active: "Llamada activa. Habla con naturalidad.",
  error: "No fue posible iniciar la llamada. Intenta de nuevo.",
};

function friendlyReason(reason: string) {
  const reasons: Record<string, string> = {
    paused: "La demo está en pausa por ahora.",
    visitor_daily_limit: "Ya se usaron las tres pruebas disponibles hoy desde esta conexión.",
    daily_budget_limit: "La demo alcanzó su límite de uso de hoy.",
    challenge_failed: "La verificación venció o no fue válida. Intenta de nuevo.",
    challenge_unavailable: "La verificación no está disponible en este momento.",
    operations_unavailable: "El servicio de la demo no está disponible en este momento.",
    service_not_configured: "La demo todavía no está habilitada en este entorno.",
  };
  return reasons[reason] || messages.error;
}

export default function RetellVoiceWidget({
  demoEnabled,
  turnstileSiteKey,
}: {
  demoEnabled: boolean;
  turnstileSiteKey: string;
}) {
  const [callState, setCallState] = useState<CallState>("waiting");
  const [statusMessage, setStatusMessage] = useState(
    !demoEnabled
      ? "La demo está en pausa por ahora."
      : turnstileSiteKey
        ? messages.waiting
        : "La demo todavía no está habilitada en este entorno.",
  );
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef("");
  const clientRef = useRef<RetellWebClient | null>(null);

  const resetChallenge = useCallback(() => {
    setChallengeToken("");
    setCallState("waiting");
    setStatusMessage(messages.waiting);
    if (turnstileWidgetId.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId.current);
    }
  }, []);

  useEffect(() => {
    const client = new RetellWebClient();
    clientRef.current = client;

    client.on("call_started", () => {
      setCallState("active");
      setStatusMessage(messages.active);
    });
    client.on("call_ready", () => setStatusMessage("Lucía está lista. Ya puede escucharte."));
    client.on("call_ended", () => resetChallenge());
    client.on("error", () => {
      setCallState("error");
      setStatusMessage(messages.error);
      setChallengeToken("");
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
    });

    return () => {
      client.stopCall();
      client.removeAllListeners();
      clientRef.current = null;
    };
  }, [resetChallenge]);

  useEffect(() => {
    if (
      !turnstileReady
      || !demoEnabled
      || !turnstileSiteKey
      || !turnstileContainer.current
      || !window.turnstile
      || turnstileWidgetId.current
    ) return;

    turnstileWidgetId.current = window.turnstile.render(turnstileContainer.current, {
      sitekey: turnstileSiteKey,
      action: "lucia_demo_call",
      callback: (token) => {
        setChallengeToken(token);
        setCallState("ready");
        setStatusMessage(messages.ready);
      },
      "expired-callback": resetChallenge,
      "error-callback": () => {
        setChallengeToken("");
        setCallState("error");
        setStatusMessage("La verificación no pudo completarse. Recarga la página para intentar de nuevo.");
      },
    });

    return () => {
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = "";
      }
    };
  }, [demoEnabled, resetChallenge, turnstileReady, turnstileSiteKey]);

  async function startCall() {
    if (!challengeToken || callState !== "ready" || !clientRef.current) return;
    setCallState("connecting");
    setStatusMessage(messages.connecting);

    try {
      const response = await fetch("/api/lucia/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken: challengeToken, website: honeypot }),
      });
      const result = await response.json() as {
        ok?: boolean;
        accessToken?: string;
        reason?: string;
      };
      setChallengeToken("");
      if (!response.ok || !result.ok || !result.accessToken) {
        setCallState("error");
        setStatusMessage(friendlyReason(result.reason || ""));
        if (turnstileWidgetId.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetId.current);
        }
        return;
      }
      await clientRef.current.startCall({ accessToken: result.accessToken });
    } catch {
      setCallState("error");
      setStatusMessage(messages.error);
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
    }
  }

  function stopCall() {
    clientRef.current?.stopCall();
  }

  const active = callState === "active";
  const disabled = active
    ? false
    : !demoEnabled || !turnstileSiteKey || callState === "connecting" || callState === "waiting" || callState === "error";
  const statusLabel = !demoEnabled
    ? "En pausa"
    : active
    ? "En llamada"
    : callState === "connecting"
      ? "Conectando"
      : callState === "ready"
        ? "Lista"
        : callState === "error"
          ? "En pausa"
          : turnstileSiteKey
            ? "Verificación"
            : "En preparación";

  return (
    <aside className="lucia-module" aria-labelledby="voice-entry-title">
      {demoEnabled && turnstileSiteKey ? (
        <Script
          id="cloudflare-turnstile"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}

      <div className="module-topline">
        <p>Canal de voz</p>
        <span className={`availability availability-${demoEnabled ? callState : "error"}`}><span aria-hidden="true" /> {statusLabel}</span>
      </div>

      <div className="voice-stage" aria-hidden="true">
        <div className="voice-wave wave-outer" />
        <div className="voice-wave wave-middle" />
        <div className="voice-wave wave-inner" />
        <div className="lucia-orb"><span>Lu</span></div>
      </div>

      <div className="module-copy">
        <p className="module-status"><span aria-hidden="true" /> Una voz para toda la prueba</p>
        <h2 id="voice-entry-title">Lista cuando tú lo estés.</h2>
        <p className="voice-status" aria-live="polite">{statusMessage}</p>
      </div>

      <div className="voice-controls">
        <label className="honeypot" aria-hidden="true">
          Sitio web
          <input
            name="website"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
        {demoEnabled && turnstileSiteKey ? <div ref={turnstileContainer} className="turnstile-container" /> : null}
        <button
          className={active ? "voice-button voice-button-stop" : "voice-button"}
          type="button"
          disabled={disabled}
          onClick={active ? stopCall : startCall}
        >
          {active ? "Finalizar llamada" : callState === "connecting" ? "Conectando…" : "Probar con Lucía"}
        </button>
      </div>

      <div className="module-notes">
        <p><span>01</span> Habla con naturalidad; no necesitas seguir un guion.</p>
        <p><span>02</span> Hasta tres pruebas por conexión al día.</p>
      </div>
    </aside>
  );
}
