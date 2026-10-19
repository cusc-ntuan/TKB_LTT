import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSchoolTimetable } from "../src/lib/normalization.js";
import { schoolDateToISO } from "../src/lib/json.js";

test("normalizes class, teacher, and student JSON schedules", () => {
  const rows = normalizeSchoolTimetable({
    classes: {
      "10A": [["2", "S", 1, "Toán", "GV A"]],
    },
    teachers: {
      "GV A": [["2", "S", 1, "10A", "Toán"]],
    },
    students: {
      meta: { types: ["Chính khóa", "Tự chọn"] },
      students: {
        "Nguyễn An An": {
          c: "10A",
          s: [
            ["2", "S", 1, "Toán", "GV A"],
            ["3", "C", 2, "Ngoại ngữ", "GV B", { t: 1, r: "10D1", n: "Nhóm ghép" }],
          ],
        },
      },
    },
  });

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    ho_va_ten: "",
    lop: "10A",
    thu: "Thứ 2",
    buoi: "Sáng",
    tiet: "1",
    mon_hoc: "Toán",
    phong_hoc: "",
    giao_vien: "GV A",
    loai_tiet: "Chính khóa",
    ghi_chu: "",
  });
  assert.equal(rows[2].ho_va_ten, "Nguyễn An");
  assert.equal(rows[2].buoi, "Chiều");
  assert.equal(rows[2].phong_hoc, "10D1");
  assert.equal(rows[2].loai_tiet, "Tự chọn");
  assert.equal(rows[2].ghi_chu, "Nhóm ghép");
});

test("rejects invalid school schedules", () => {
  assert.throws(
    () => normalizeSchoolTimetable({ classes: {}, teachers: {}, students: { students: { A: { c: "10A", s: [["8", "S", 1, "Toán", "GV"]] } } } }),
    /thứ hoặc buổi không hợp lệ/
  );
});

test("converts the school's effective date and rejects invalid dates", () => {
  assert.equal(schoolDateToISO("19/10/2026"), "2026-10-19");
  assert.throws(() => schoolDateToISO("31/02/2026"), /không hợp lệ/);
});
