import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../string-theme.css", import.meta.url), "utf8");

test("renders only the first workflow stage before JavaScript initializes", () => {
  const stages = [...html.matchAll(/<(?:details|section)[^>]+data-workflow-stage="(\d)"[^>]*>/g)];

  assert.equal(stages.length, 5);
  assert.doesNotMatch(stages[0][0], /\shidden(?:\s|>)/);
  for (const stage of stages.slice(1)) assert.match(stage[0], /\shidden(?:\s|>)/);
});

test("keeps privacy detail compact and the workflow navigation sticky", () => {
  assert.doesNotMatch(html, /data-safety-note/);
  assert.match(html, /id="privacyInfoButton"/);
  assert.match(html, /id="localProcessingInfo"[^>]+role="tooltip"/);
  assert.match(css, /\.scanner-page \.workflow-progress \{[^}]*position: sticky;[^}]*top: 72px;/s);
});
