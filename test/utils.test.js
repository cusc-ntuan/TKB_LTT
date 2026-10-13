import assert from "node:assert/strict";
import test from "node:test";
import resolveDefaultDayDefault, { resolveDefaultDay } from "../public/js/utils.js";

test("resolveDefaultDay is available via both default and named imports", () => {
  assert.equal(resolveDefaultDayDefault, resolveDefaultDay);
});

test("resolveDefaultDay keeps Sunday as a valid timetable day", () => {
  const sunday = new Date("2026-09-27T12:00:00");
  assert.equal(resolveDefaultDay(sunday), "CN");
});

test("resolveDefaultDay advances past 18:00 to the next day", () => {
  const evening = new Date("2026-09-25T19:00:00");
  assert.equal(resolveDefaultDay(evening), "Thứ 7");
});
