"use client";

import { useEffect, useRef } from "react";

const widgetId = "retell-widget";
const widgetSource = "https://dashboard.retellai.com/retell-widget-v2.js";

function isWidgetLauncher(target: EventTarget): target is HTMLButtonElement {
  return target instanceof HTMLButtonElement && target.textContent?.trim() === "Probar recepcionista";
}

export default function RetellVoiceWidget() {
  const voicePublicKey = process.env.NEXT_PUBLIC_RETELL_VOICE_PUBLIC_KEY;
  const agentId = process.env.NEXT_PUBLIC_RETELL_AGENT_ID;
  const isConfigured = Boolean(voicePublicKey && agentId);
  const microphoneRequestInFlight = useRef(false);

  useEffect(() => {
    if (!isConfigured || document.getElementById(widgetId)) return;

    const script = document.createElement("script");
    script.id = widgetId;
    script.src = widgetSource;
    script.type = "module";
    script.setAttribute("data-voice-public-key", voicePublicKey ?? "");
    script.setAttribute("data-voice-agent-id", agentId ?? "");
    script.setAttribute("data-title", "Habla con Lucía");
    script.setAttribute("data-fab-text", "Probar recepcionista");
    script.setAttribute("data-auto-open", "false");
    document.head.appendChild(script);
  }, [agentId, isConfigured, voicePublicKey]);

  useEffect(() => {
    const requestMicrophoneOnLauncherTap = (event: MouseEvent) => {
      if (microphoneRequestInFlight.current) return;
      if (!event.composedPath().some(isWidgetLauncher)) return;
      if (!navigator.mediaDevices?.getUserMedia) return;

      // Do not intercept the widget event. Android receives its native permission
      // prompt from the same customer tap, while Retell still opens normally.
      microphoneRequestInFlight.current = true;
      void navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => stream.getTracks().forEach((track) => track.stop()))
        .catch(() => {
          microphoneRequestInFlight.current = false;
        });
    };

    document.addEventListener("click", requestMicrophoneOnLauncherTap, true);
    return () => document.removeEventListener("click", requestMicrophoneOnLauncherTap, true);
  }, []);

  if (process.env.NODE_ENV === "development" && !isConfigured) {
    return <p className="retell-notice" role="status">Para activar la prueba, añade <code>NEXT_PUBLIC_RETELL_VOICE_PUBLIC_KEY</code> y <code>NEXT_PUBLIC_RETELL_AGENT_ID</code> en <code>.env.local</code>.</p>;
  }

  return null;
}
