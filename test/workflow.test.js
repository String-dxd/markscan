import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("renders only the first workflow stage before JavaScript initializes", () => {
  const stages = [...html.matchAll(/<(?:details|section)[^>]+data-workflow-stage="(\d)"[^>]*>/g)];

  assert.equal(stages.length, 5);
  assert.doesNotMatch(stages[0][0], /\shidden(?:\s|>)/);
  for (const stage of stages.slice(1)) assert.match(stage[0], /\shidden(?:\s|>)/);
});
