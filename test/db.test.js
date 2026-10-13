import assert from "node:assert/strict";
import test from "node:test";
import { filters, listLessons, stats } from "../src/lib/db.js";

test("initializes the database from bundled data", () => {
  const summary = stats();

  assert.ok(summary.total > 0);
  assert.ok(summary.lop > 0);
  assert.ok(summary.giao_vien > 0);
});

test("filters lessons by class", () => {
  const lessons = listLessons({ lop: "10A" });

  assert.ok(lessons.length > 0);
  assert.ok(lessons.every((lesson) => lesson.lop === "10A"));
});

test("filters lessons by student name", () => {
  const studentName = filters().ho_va_ten[0];
  const lessons = studentName ? listLessons({ ho_va_ten: studentName }) : [];

  if (!studentName) {
    assert.equal(stats().ho_va_ten, 0);
    assert.deepEqual(lessons, []);
    return;
  }
  assert.ok(lessons.length > 0);
  assert.ok(lessons.every((lesson) => lesson.ho_va_ten === studentName));
});

test("returns filter values for the frontend", () => {
  const availableFilters = filters();

  assert.ok(availableFilters.lop.length > 0);
  assert.ok(availableFilters.giao_vien.length > 0);
  assert.ok(Array.isArray(availableFilters.ho_va_ten));
  assert.ok(availableFilters.buoi.includes("Sáng"));
});
