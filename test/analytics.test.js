import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { sanitizeEvent } from "../api/_analytics.js";

const clientAnalyticsSource = readFileSync(new URL("../analytics.js", import.meta.url), "utf8");

function runClientAnalytics(hostname) {
  const headChildren = [];
  const bodyChildren = [];
  const fetchCalls = [];
  const createElement = (tagName) => ({
    tagName: tagName.toUpperCase(),
    addEventListener() {},
    setAttribute() {},
    querySelector() { return null; },
    remove() {}
  });
  const storage = {
    getItem(key) { return key === "markscan.analytics-consent" ? "granted" : null; },
    setItem() {}
  };
  const context = {
    console,
    crypto: { randomUUID: () => "1f3577ac-1d52-4b70-a05c-bf6d9003390d" },
    document: {
      readyState: "complete",
      createElement,
      getElementById() { return null; },
      addEventListener() {},
      head: { appendChild(element) { headChildren.push(element); } },
      body: { appendChild(element) { bodyChildren.push(element); } }
    },
    fetch(...args) { fetchCalls.push(args); return Promise.resolve({ ok: true }); },
    localStorage: storage,
    location: {
      protocol: "https:",
      hostname,
      origin: `https://${hostname}`,
      pathname: "/scan",
      search: "?student=1234",
      hash: "#private"
    },
    sessionStorage: storage,
    window: {}
  };
  vm.runInNewContext(clientAnalyticsSource, context);
  return { context, headChildren, bodyChildren, fetchCalls };
}

const baseEvent = {
  event_id: "1f3577ac-1d52-4b70-a05c-bf6d9003390d",
  session_id: "92e3185e-62d7-4e78-83f5-420b58077691",
  page_path: "/index.html"
};

test("accepts an allowed aggregate event", () => {
  const event = sanitizeEvent({
    ...baseEvent,
    event_name: "processing_completed",
    properties: { sheet_count: 12, successful_sheet_count: 11, failed_sheet_count: 1, duration_ms: 1234 }
  });
  assert.deepEqual(event.properties, { sheet_count: 12, successful_sheet_count: 11, failed_sheet_count: 1, duration_ms: 1234 });
});

test("drops unknown fields that could contain private data", () => {
  const event = sanitizeEvent({
    ...baseEvent,
    event_name: "student_directory_configured",
    properties: { student_count: 30, student_name: "Private name", filename: "class-list.csv" }
  });
  assert.deepEqual(event.properties, { student_count: 30 });
});

test("rejects unknown events and malformed identifiers", () => {
  assert.equal(sanitizeEvent({ ...baseEvent, event_name: "student_score_saved" }), null);
  assert.equal(sanitizeEvent({ ...baseEvent, event_id: "not-a-uuid", event_name: "pdf_selected" }), null);
});

test("rejects page paths containing query data", () => {
  assert.equal(sanitizeEvent({ ...baseEvent, page_path: "/?student=1234", event_name: "pdf_selected" }), null);
});

test("loads GA only on the production hostname and sends one sanitized page view", () => {
  const { context, headChildren } = runClientAnalytics("markscan.string.sg");
  const calls = context.window.dataLayer.map((entry) => Array.from(entry));
  const config = calls.find(([command]) => command === "config");
  const pageView = calls.find(([command, eventName]) => command === "event" && eventName === "page_view");

  assert.equal(config[1], "G-7VK5RL8WPN");
  assert.equal(config[2].send_page_view, false);
  assert.deepEqual({ ...pageView[2] }, {
    page_title: "MarkScan",
    page_location: "https://markscan.string.sg/scan",
    page_path: "/scan"
  });
  assert.equal(headChildren.filter((element) => element.tagName === "SCRIPT").length, 1);
});

test("does not initialize or send events from Vercel preview hosts", () => {
  const { context, headChildren, bodyChildren, fetchCalls } = runClientAnalytics("markscan-git-feature-string-labs.vercel.app");

  context.window.markscanAnalytics.track("pdf_selected", { pdf_count: 1 });
  assert.equal(context.window.dataLayer, undefined);
  assert.equal(headChildren.length, 0);
  assert.equal(bodyChildren.length, 0);
  assert.equal(fetchCalls.length, 0);
});
