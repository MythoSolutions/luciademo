import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertLandingStructure } from "./helpers/landing-structure.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const page = read("app/page.tsx");
const layout = read("app/layout.tsx");
const styles = read("app/globals.css");
const widget = read("app/components/retell-voice-widget.tsx");
const robots = read("app/robots.ts");
const readme = read("README.md");
const envExample = read(".env.example");
const appSource = [page, layout, styles, widget].join("\n");
const publicCopy = [page, layout, readme].join("\n");

test("offers one configurable voice entry", () => {
  assert.doesNotThrow(() => assertLandingStructure({
    pageSource: page,
    widgetSource: widget,
    envExampleSource: envExample,
  }));
});

test("presents five informative routes and their exact examples", () => {
  const pairs = [
    ["Agenda", "Estética Camelia"],
    ["Reserva", "Restaurante La Terraza"],
    ["Cotización", "Inmobiliaria Punto"],
    ["Pedido", "Tienda Nube"],
    ["Técnico", "Taller Norte"],
  ];

  for (const [family, business] of pairs) {
    assert.match(page, new RegExp(family, "i"));
    assert.match(page, new RegExp(business, "i"));
  }

  assert.match(page, /otro negocio/i);
  assert.match(page, /ficha ficticia/i);
});

test("sets honest duration, simulation and data boundaries", () => {
  assert.match(publicCopy, /(?:aprox\.|aproximadamente)\s*(?:cinco|5)\s*min/i);
  assert.doesNotMatch(publicCopy, /máxim[oa]\s+(?:de\s+)?(?:cinco|5)\s*min/i);
  for (const action of ["agendar", "reservar", "cotizar", "pedir", "escalar", "transferir"]) {
    assert.match(page, new RegExp(action, "i"));
  }
  assert.match(page, /simulacion(?:es)?|simulad[ao]s?/i);
  for (const category of ["personal", "financiera", "médica", "confidencial"]) {
    assert.match(page, new RegExp(category, "i"));
  }
});

test("does not claim live resources or public protection", () => {
  assert.doesNotMatch(appSource, /\b(?:Aura|GAM|agent_[a-z0-9_-]+|conversation_flow_[a-z0-9_-]+|knowledge_base_[a-z0-9_-]+)\b/i);
  assert.doesNotMatch(publicCopy, /rate[ -]?limit|protegida públicamente|protección pública/i);
  assert.doesNotMatch(appSource, /RETELL_API_KEY|sk-[a-z0-9]/i);
  assert.doesNotMatch(page, /\bDisponible\b|está disponible/i);
});

test("keeps the server page and a minimal script client", () => {
  assert.doesNotMatch(page, /^["']use client["']/m);
  assert.match(widget, /^["']use client["']/m);
  assert.match(widget, /from ["']next\/script["']/);
  assert.match(layout, /@fontsource-variable\/manrope/);
  assert.match(layout, /@fontsource\/ibm-plex-mono/);
  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.doesNotMatch(styles, /fonts\.googleapis\.com|@import\s+url/i);
});

test("includes focus, reduced motion, mobile and private metadata", () => {
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion\s*:\s*reduce/);
  assert.match(styles, /@media\s*\([^)]*max-width\s*:\s*(?:[3-7]\d{2})px/i);
  assert.match(layout, /robots\s*:\s*\{[^}]*index\s*:\s*false[^}]*follow\s*:\s*false/s);
  assert.match(robots, /disallow\s*:\s*["']\/["']/);
  assert.match(layout, /Una voz\. Cinco formas de atender\./);
});

test("keeps informational rows visually non-interactive", () => {
  assert.doesNotMatch(styles, /\.example-row[^{}]*::after\s*\{/);
  assert.doesNotMatch(styles, /\.example-row[^,{]*:hover/);
  assert.doesNotMatch(styles, /\.example-row\s*\{[^}]*cursor\s*:/s);
});

function channelToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16));
  const [red, green, blue] = channels.map(channelToLinear);
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function cssColor(variable) {
  const match = styles.match(new RegExp(`--${variable}:\\s*(#[a-f\\d]{6})`, "i"));
  assert.ok(match, `missing CSS color --${variable}`);
  return match[1];
}

test("uses a focus indicator with at least 3:1 contrast", () => {
  assert.match(
    styles,
    /\*:focus-visible\s*\{[^}]*outline:\s*3px\s+solid\s+var\(--azul-enrutador\)/s,
  );
  const focus = cssColor("azul-enrutador");
  for (const background of [cssColor("niebla"), cssColor("papel")]) {
    assert.ok(contrast(focus, background) >= 3, "focus indicator contrast must be at least 3:1");
  }
});
