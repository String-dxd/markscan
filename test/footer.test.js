import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pages = ["index.html", "metrics.html", "template-editor.html", "calibration.html"];

test("credits the original creators on every standalone page", () => {
  for (const page of pages) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /<footer class="app-credit">/);
    assert.match(html, /Original MarkScan by <strong>Tan Seng Kwang<\/strong> and <strong>Melvyn Lee<\/strong>/);
    assert.match(html, /href="https:\/\/github\.com\/physicstjc\/markscan"/);
  }
});
