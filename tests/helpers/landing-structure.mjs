import assert from "node:assert/strict";
import ts from "typescript";

const requiredRoutes = [
  { family: "Agenda", business: "Estética Camelia" },
  { family: "Reserva", business: "Restaurante La Terraza" },
  { family: "Cotización", business: "Inmobiliaria Punto" },
  { family: "Pedido", business: "Tienda Nube" },
  { family: "Técnico", business: "Taller Norte" },
];

const interactiveTags = new Set([
  "a",
  "button",
  "input",
  "select",
  "summary",
  "textarea",
]);

const interactiveRoles = new Set([
  "button",
  "checkbox",
  "link",
  "menuitem",
  "option",
  "radio",
  "switch",
  "tab",
]);

function parseTsx(source, filename) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  assert.equal(
    file.parseDiagnostics.length,
    0,
    `${filename} must contain valid TSX`,
  );
  return file;
}

function visit(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node);
  ts.forEachChild(node, (child) => {
    visit(child, predicate, matches);
  });
  return matches;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyName(property) {
  return property.name && ts.isIdentifier(property.name)
    ? property.name.text
    : property.name?.text;
}

function stringProperty(object, name) {
  const property = object.properties.find(
    (candidate) => ts.isPropertyAssignment(candidate) && propertyName(candidate) === name,
  );
  assert.ok(property, `route must define ${name}`);
  const value = unwrapExpression(property.initializer);
  assert.ok(ts.isStringLiteral(value), `route ${name} must be a string literal`);
  return value.text;
}

function readRoutes(pageFile) {
  const declarations = visit(
    pageFile,
    (node) => ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === "routes",
  );
  assert.equal(declarations.length, 1, "expected one routes declaration");

  const initializer = unwrapExpression(declarations[0].initializer);
  assert.ok(ts.isArrayLiteralExpression(initializer), "routes must be an array literal");

  const routes = initializer.elements.map((element) => {
    const route = unwrapExpression(element);
    assert.ok(ts.isObjectLiteralExpression(route), "each route must be an object literal");
    return {
      family: stringProperty(route, "family"),
      business: stringProperty(route, "business"),
    };
  });

  const families = routes.map(({ family }) => family);
  const pairs = routes.map(({ family, business }) => `${family}\u0000${business}`);
  assert.equal(new Set(families).size, routes.length, "expected unique routes");
  assert.equal(new Set(pairs).size, routes.length, "expected unique routes");
  assert.equal(routes.length, 5, "expected exactly five routes");
  assert.deepEqual(routes, requiredRoutes, "routes must match the five approved families and businesses");

  return routes;
}

function jsxOpening(node) {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return null;
}

function jsxTagName(node) {
  return node.tagName.getText().toLowerCase();
}

function jsxAttributes(node) {
  return node.attributes.properties.filter(ts.isJsxAttribute);
}

function attributeName(attribute) {
  return attribute.name.getText().toLowerCase();
}

function findAttributes(node, name) {
  return jsxAttributes(node).filter((attribute) => attributeName(attribute) === name.toLowerCase());
}

function stringAttribute(node, name) {
  const attributes = findAttributes(node, name);
  if (attributes.length !== 1) return null;
  const initializer = attributes[0].initializer;
  return initializer && ts.isStringLiteral(initializer) ? initializer.text : null;
}

function hasClass(node, className) {
  const value = stringAttribute(node, "className");
  return value?.split(/\s+/).includes(className) ?? false;
}

function assertNonInteractiveAncestors(node) {
  let current = node;
  while (current) {
    const opening = jsxOpening(current);
    if (opening) {
      const tag = jsxTagName(opening);
      const role = stringAttribute(opening, "role")?.toLowerCase();
      const names = new Set(jsxAttributes(opening).map(attributeName));
      const interactive = interactiveTags.has(tag)
        || (names.has("role") && (!role || interactiveRoles.has(role)))
        || names.has("href")
        || names.has("onclick")
        || names.has("tabindex");
      assert.ok(!interactive, `route has interactive ancestor <${tag}>`);
    }
    current = current.parent;
  }
}

function assertInformationalRouteMarkup(pageFile) {
  const routeRows = visit(
    pageFile,
    (node) => {
      const opening = jsxOpening(node);
      return opening && hasClass(opening, "example-row");
    },
  );
  assert.equal(routeRows.length, 1, "expected one compact example-row template");
  routeRows.forEach(assertNonInteractiveAncestors);

  const routeMaps = visit(
    pageFile,
    (node) => ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === "routes"
      && node.expression.name.text === "map",
  );
  assert.equal(routeMaps.length, 1, "expected exactly one compact route renderer");
}

function tagMatches(node, name) {
  const opening = jsxOpening(node);
  return opening && opening.tagName.getText() === name;
}

function assertSingleWidget(pageFile) {
  const widgets = visit(pageFile, (node) => tagMatches(node, "RetellVoiceWidget"));
  assert.equal(widgets.length, 1, "expected exactly one widget");
}

function assertSingleWidgetConfiguration(pageFile, widgetFile, envExampleSource) {
  const scripts = visit(widgetFile, (node) => tagMatches(node, "Script"));
  assert.equal(scripts.length, 1, "expected exactly one Turnstile script");
  const script = jsxOpening(scripts[0]);
  assert.equal(
    stringAttribute(script, "src"),
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  );

  const buttons = visit(widgetFile, (node) => tagMatches(node, "button"));
  assert.equal(buttons.length, 1, "expected exactly one call button");
  assert.match(widgetFile.text, /Probar con Lucía/);
  assert.match(widgetFile.text, /\/api\/lucia\/session/);
  assert.equal((widgetFile.text.match(/\/api\/lucia\/session/g) ?? []).length, 1);

  const pageSource = pageFile.text;
  assert.equal(
    (pageSource.match(/process\.env\.NEXT_PUBLIC_TURNSTILE_SITE_KEY/g) ?? []).length,
    1,
    "expected one public Turnstile setting",
  );
  assert.equal(
    (envExampleSource.match(/^NEXT_PUBLIC_TURNSTILE_SITE_KEY=/gm) ?? []).length,
    1,
    "expected exactly one Turnstile site-key setting",
  );
  assert.doesNotMatch(pageSource + widgetFile.text + envExampleSource, /NEXT_PUBLIC_RETELL/i);
}

export function assertLandingStructure({
  pageSource,
  widgetSource,
  envExampleSource,
}) {
  const pageFile = parseTsx(pageSource, "app/page.tsx");
  const widgetFile = parseTsx(widgetSource, "app/components/retell-voice-widget.tsx");

  readRoutes(pageFile);
  assertInformationalRouteMarkup(pageFile);
  assertSingleWidget(pageFile);
  assertSingleWidgetConfiguration(pageFile, widgetFile, envExampleSource);
}
