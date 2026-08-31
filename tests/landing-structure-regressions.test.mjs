import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertLandingStructure } from "./helpers/landing-structure.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/page.tsx");
const widget = read("app/components/retell-voice-widget.tsx");
const envExample = read(".env.example");

const validate = (pageSource = page, widgetSource = widget) =>
  assertLandingStructure({ pageSource, widgetSource, envExampleSource: envExample });

const addRoute = (route) => page.replace(
  "] as const;",
  `  ${JSON.stringify(route)},\n] as const;`,
);

const wrapExamples = (opening, closing) => page
  .replace('<dl className="example-list">', `${opening}<dl className="example-list">`)
  .replace("        </dl>", `        </dl>${closing}`);

test("regression: rejects more than five routes", () => {
  const sixRoutes = addRoute({ family: "Queja", business: "Clínica Sur" });
  assert.throws(() => validate(sixRoutes), /exactly five routes/);
});

test("regression: rejects duplicate routes", () => {
  const duplicateRoute = addRoute({ family: "Agenda", business: "Estética Camelia" });
  assert.throws(() => validate(duplicateRoute), /unique routes/);
});

test("regression: rejects route rows below interactive ancestors", async (t) => {
  const fixtures = [
    ["button", '<button type="button">', "</button>"],
    ["link", '<a href="#familias">', "</a>"],
    ["role", '<div role="button">', "</div>"],
    ["tabindex", '<div tabIndex={0}>', "</div>"],
  ];

  for (const [name, opening, closing] of fixtures) {
    await t.test(name, () => {
      assert.throws(
        () => validate(wrapExamples(opening, closing)),
        /interactive ancestor/,
      );
    });
  }
});

test("regression: rejects multiple widget instances", () => {
  const twoWidgets = page.replace(
    '        />\n      </section>',
    '        />\n        <RetellVoiceWidget demoEnabled={false} turnstileSiteKey="fixture" />\n      </section>',
  );
  assert.throws(() => validate(twoWidgets), /exactly one widget/);
});

test("regression: rejects multiple call buttons", () => {
  const twoButtons = widget.replace(
    '        <button\n          className=',
    '        <button type="button">Extra</button>\n        <button\n          className=',
  );
  assert.throws(() => validate(page, twoButtons), /exactly one call button/);
});

test("regression: rejects multiple session endpoints", () => {
  const twoSessionCalls = widget.replace(
    'fetch("/api/lucia/session",',
    'fetch("/api/lucia/session",\n      // /api/lucia/session\n',
  );
  assert.throws(() => validate(page, twoSessionCalls));
});
