"use client";

import { useEffect, useRef, useState } from "react";

const widgetId = "retell-widget";
const widgetSource = "https://dashboard.retellai.com/retell-widget-v2.js";

function isStartCallButton(target: EventTarget): target is HTMLButtonElement {
  return target instanceof HTMLButtonElement && target.textContent?.trim() === "Start to call";
}

export default function RetellVoiceWidget() {
  const voicePublicKey = process.env.NEXT_PUBLIC_RETELL_VOICE_PUBLIC_KEY;
  const agentId = process.env.NEXT_PUBLIC_RETELL_AGENT_ID;
  const isConfigured = Boolean(voicePublicKey && agentId);
  const micReady = useRef(false);
  const [permissionMessage, setPermissionMessage] = useState("");

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
    const requestMicrophoneBeforeCall = async (event: MouseEvent) => {
      if (micReady.current) return;

      const startButton = event.composedPath().find(isStartCallButton);
      if (!startButton) return;

      // Retell renders the button in its Shadow DOM. Intercept the first tap so
      // Android receives a native permission request while it still has a user gesture.
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionMessage("Este navegador no puede solicitar acceso al micrófono para la llamada.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        micReady.current = true;
        setPermissionMessage("");
        startButton.click();
      } catch {
        setPermissionMessage("Lucía necesita acceso al micrófono para iniciar la llamada. Permítalo cuando el navegador lo solicite.");
      }
    };

    document.addEventListener("click", requestMicrophoneBeforeCall, true);
    return () => document.removeEventListener("click", requestMicrophoneBeforeCall, true);
  }, []);

  if (process.env.NODE_ENV === "development" && !isConfigured) {
    return <p className="retell-notice" role="status">Para activar la prueba, añade <code>NEXT_PUBLIC_RETELL_VOICE_PUBLIC_KEY</code> y <code>NEXT_PUBLIC_RETELL_AGENT_ID</code> en <code>.env.local</code>.</p>;
  }

  return permissionMessage ? <p className="retell-notice" role="status">{permissionMessage}</p> : null;
}
