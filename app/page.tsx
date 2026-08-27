import RetellVoiceWidget from "./components/retell-voice-widget";

const examples = [
  "Quiero solicitar una cotización.",
  "Necesito reportar una incidencia.",
  "Busco comunicarme con un área específica.",
];

export default function Home() {
  return (
    <main className="site-shell">
      <div className="top-rule" aria-hidden="true" />
      <section className="hero" aria-labelledby="hero-title">
        <div className="intro-column">
          <header className="site-header">
            <a className="wordmark" href="#inicio" aria-label="Mytho Solutions, inicio"><span className="wordmark-mark" aria-hidden="true">M</span><span>Mytho Solutions</span></a>
            <p className="eyebrow">Demo privada · Recepcionista virtual</p>
          </header>
          <div id="inicio" className="intro-copy">
            <p className="kicker">PRUEBA DE VOZ / 05 MIN</p>
            <h1 id="hero-title">Una llamada basta para entenderlo.</h1>
            <p className="lede">Conversa con Lucía como si estuvieras llamando a tu negocio. Haz una consulta, interrúmpela o plantea una situación real y escucha cómo responde.</p>
          </div>
          <div className="examples" aria-labelledby="examples-title">
            <p id="examples-title" className="section-label">Puedes empezar diciendo</p>
            <ul>{examples.map((example) => <li key={example}>“{example}”</li>)}</ul>
          </div>
        </div>
        <aside className="lucia-module" aria-labelledby="lucia-title">
          <div className="module-topline"><p className="section-label">CANAL DE VOZ</p><span className="availability"><span aria-hidden="true" /> Disponible</span></div>
          <div className="voice-stage"><div className="voice-wave wave-outer" aria-hidden="true" /><div className="voice-wave wave-middle" aria-hidden="true" /><div className="voice-wave wave-inner" aria-hidden="true" /><div className="lucia-orb" aria-hidden="true"><span>Lu</span></div></div>
          <div className="module-copy"><p className="module-status"><span aria-hidden="true" /> Lucía está disponible</p><h2 id="lucia-title">Lista cuando tú lo estés.</h2><p>Presiona <strong>“Probar recepcionista”</strong> en la esquina inferior derecha y permite el acceso al micrófono.</p></div>
          <div className="module-notes"><p><span>01</span> Duración máxima de la prueba: 5 minutos</p><p><span>02</span> Habla con naturalidad. No necesitas seguir un guion.</p></div>
        </aside>
      </section>
      <section className="guidance" aria-labelledby="guidance-title"><p className="section-label">ANTES DE EMPEZAR</p><h2 id="guidance-title">Una prueba breve, en condiciones reales.</h2><p>Esta es una demostración controlada. No compartas información personal, financiera ni confidencial. Las transferencias y acciones externas pueden estar simuladas.</p></section>
      <footer><span>Desarrollado por Mytho Solutions</span><span aria-hidden="true">© {new Date().getFullYear()}</span></footer>
      <RetellVoiceWidget />
    </main>
  );
}
