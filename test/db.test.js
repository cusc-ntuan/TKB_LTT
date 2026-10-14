import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tkb-db-test-"));
process.env.NODE_ENV = "test";
process.env.TURSO_DATABASE_URL = pathToFileURL(path.join(testDataDir, "timetable.db")).href;
process.env.TURSO_AUTH_TOKEN = "";

const { filters, listLessons, stats } = await import("../src/lib/db.js");

test.after(() => {
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test("initializes the database from bundled data", async () => {
  const summary = await stats();

  assert.ok(summary.total > 0);
  assert.ok(summary.lop > 0);
  assert.ok(summary.giao_vien > 0);
});

test("filters lessons by class", async () => {
  const lessons = await listLessons({ lop: "10A" });

  assert.ok(lessons.length > 0);
  assert.ok(lessons.every((lesson) => lesson.lop === "10A"));
});

test("filters lessons by student name", async () => {
  const studentName = (await filters()).ho_va_ten[0];
  const lessons = studentName ? await listLessons({ ho_va_ten: studentName }) : [];

  if (!studentName) {
    assert.equal((await stats()).ho_va_ten, 0);
    assert.deepEqual(lessons, []);
    return;
  }
  assert.ok(lessons.length > 0);
  assert.ok(lessons.every((lesson) => lesson.ho_va_ten === studentName));
});

test("returns filter values for the frontend", async () => {
  const availableFilters = await filters();

  assert.ok(availableFilters.lop.length > 0);
  assert.ok(availableFilters.giao_vien.length > 0);
  assert.ok(Array.isArray(availableFilters.ho_va_ten));
  assert.ok(availableFilters.buoi.includes("Sáng"));
});
