import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import RetellVoiceWidget from "@/app/components/retell-voice-widget";
import { isPrivateDebugEnabled } from "@/app/lib/lucia-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lucía Debug | Mytho Solutions",
  description: "Laboratorio privado para validar el borrador de Lucía.",
};

export default function DebugPage() {
  if (!isPrivateDebugEnabled()) notFound();

  return (
    <main className="debug-shell">
      <div className="debug-rail" aria-hidden="true">PRIVATE TEST / LUCÍA</div>

      <section className="debug-workbench" aria-labelledby="debug-title">
        <header className="debug-header">
          <div className="wordmark" aria-label="Mytho Solutions">
            <span className="wordmark-mark" aria-hidden="true">M</span>
            <span>Mytho Solutions</span>
          </div>
          <span className="debug-access"><span aria-hidden="true" /> Acceso privado de Vercel</span>
        </header>

        <div className="debug-grid">
          <div className="debug-brief">
            <p className="kicker">Consola administrativa</p>
            <h1 id="debug-title">Prueba a Lucía sin tocar producción.</h1>
            <p className="lede">
              Esta página usa el borrador fijado de Retell. Puedes terminar una llamada e iniciar otra sin esperar ni consumir el límite público por conexión.
            </p>

            <div className="debug-checks" aria-label="Alcance de la prueba">
              <p><span>Voz</span> Escucha ritmo, claridad y posibles cortes.</p>
              <p><span>Flujo</span> Prueba cierres, objeciones y cambios de intención.</p>
              <p><span>Entrega</span> Verifica contacto, registro y aviso operativo.</p>
            </div>

            <p className="debug-boundary">
              El presupuesto diario permanece activo como freno de seguridad. Nada se publica desde aquí.
            </p>
          </div>

          <RetellVoiceWidget
            demoEnabled
            debugMode
            turnstileSiteKey=""
          />
        </div>

        <footer className="debug-footer">
          <span>Borrador · No público</span>
          <Link href="/">Volver a la landing</Link>
        </footer>
      </section>
    </main>
  );
}
