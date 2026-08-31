import RetellVoiceWidget from "./components/retell-voice-widget";

const routes = [
  { family: "Agenda", business: "Estética Camelia", prompt: "Quiero agendar una cita." },
  { family: "Reserva", business: "Restaurante La Terraza", prompt: "Quiero hacer una reservación." },
  { family: "Cotización", business: "Inmobiliaria Punto", prompt: "Necesito una cotización." },
  { family: "Pedido", business: "Tienda Nube", prompt: "Necesito ayuda con un pedido." },
  { family: "Técnico", business: "Taller Norte", prompt: "Quiero reportar una incidencia." },
] as const;

export default function Home() {
  return (
    <main className="site-shell">
      <div className="top-rule" aria-hidden="true" />

      <section className="hero" aria-labelledby="hero-title">
        <div className="intro-column">
          <header className="site-header">
            <div className="wordmark" aria-label="Mytho Solutions">
              <span className="wordmark-mark" aria-hidden="true">M</span>
              <span>Mytho Solutions</span>
            </div>
            <p className="eyebrow">Demo privada · Entrada única</p>
          </header>

          <div className="intro-copy">
            <p className="kicker">Prueba de voz / aprox. 5 min</p>
            <h1 id="hero-title">Una llamada basta para entenderlo.</h1>
            <p className="lede">
              Conversa con Lucía como si llamaras a tu negocio. Plantea una situación real y escucha cómo adapta la atención sin menús ni guiones.
            </p>
          </div>

          <div className="examples" aria-labelledby="examples-title">
            <p id="examples-title" className="section-label">Puedes probarla diciendo</p>
            <dl className="example-list">
              {routes.map(({ family, business, prompt }) => (
                <div className="example-row" key={family}>
                  <dt>{family}</dt>
                  <dd>“{prompt}” <span>{business}</span></dd>
                </div>
              ))}
            </dl>
            <p className="other-business">
              ¿Tienes otro negocio? Descríbelo al comenzar y Lucía usará una ficha ficticia para continuar la prueba.
            </p>
          </div>
        </div>

        <RetellVoiceWidget
          demoEnabled={process.env.LUCIA_DEMO_ENABLED === "true"}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
        />
      </section>

      <section className="guidance" aria-labelledby="guidance-title">
        <div>
          <p className="section-label">Antes de empezar</p>
          <h2 id="guidance-title">Una prueba breve, en condiciones reales.</h2>
        </div>
        <p>
          Es una demostración controlada. Agendar, reservar, cotizar, pedir, escalar y transferir son acciones simuladas. No compartas información personal, financiera, médica ni confidencial.
        </p>
      </section>

      <footer>
        <span>Desarrollado por Mytho Solutions</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
