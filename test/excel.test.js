import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ExcelJS from "exceljs";
import { parseExcelBuffer } from "../src/lib/excel.js";

async function writeWorkbook(rows, sheetNames) {
  const workbook = new ExcelJS.Workbook();
  for (const [sheetName, data] of Object.entries(sheetNames)) {
    const sheet = workbook.addWorksheet(sheetName);
    if (Array.isArray(data[0])) {
      data.forEach((row) => sheet.addRow(row));
    } else {
      sheet.addRow(data);
    }
  }

  if (rows) {
    const sheet = workbook.addWorksheet("TKB");
    rows.forEach((row) => sheet.addRow(row));
  }

  return workbook.xlsx.writeBuffer();
}

test("parses the bundled workbook data sheet", async () => {
  const rows = await parseExcelBuffer(fs.readFileSync("data/TKB.xlsx"));

  assert.ok(rows.length > 0);
  assert.deepEqual(Object.keys(rows[0]), [
    "ho_va_ten", "lop", "thu", "buoi", "tiet", "mon_hoc",
    "phong_hoc", "giao_vien", "loai_tiet", "ghi_chu",
  ]);
  assert.ok(rows[0].lop);
  assert.ok(rows[0].thu);
});

test("selects a valid data sheet instead of relying on sheet order", async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Tổng hợp");
  const dataSheet = workbook.addWorksheet("TKB");
  dataSheet.addRow(["Họ và Tên", "Lớp", "Thứ"]);
  dataSheet.addRow(["Nguyễn Văn A", "10A1", "Thứ 2"]);

  const rows = await parseExcelBuffer(await workbook.xlsx.writeBuffer());

  assert.deepEqual(rows[0], {
    ho_va_ten: "Nguyễn Văn A",
    lop: "10A1",
    thu: "Thứ 2",
    buoi: "",
    tiet: "",
    mon_hoc: "",
    phong_hoc: "",
    giao_vien: "",
    loai_tiet: "",
    ghi_chu: "",
  });
});

test("fills down student names in the bundled student timetable", async () => {
  const rows = await parseExcelBuffer(fs.readFileSync("data/TKB.xlsx"));
  const studentNames = rows.map((row) => row.ho_va_ten).filter(Boolean);

  if (!studentNames.length) {
    assert.ok(rows.every((row) => row.ho_va_ten === ""));
    return;
  }
  assert.ok(studentNames.length > 0);
});

test("adds missing QPAN lessons from the class matrix to every student", async () => {
  const workbook = new ExcelJS.Workbook();
  const students = workbook.addWorksheet("TKB_Theo_Hoc_Sinh");
  students.addRow(["Họ và Tên", "Lớp", "Thứ", "Buổi", "Tiết", "Môn Học"]);
  students.addRow(["Nguyễn Văn A", "10A", "Thứ 2", "Sáng", "Tiết 1", "Toán"]);
  students.addRow(["Trần Thị B", "10A", "Thứ 2", "Sáng", "Tiết 1", "Toán"]);

  const classes = workbook.addWorksheet("TKB");
  classes.addRow(["Thứ", "Buổi", "Tiết", "10A"]);
  classes.addRow(["2", "S", 1, "Toán-GV"]);
  classes.addRow(["", "", 2, "QPAN-Sáu.TV"]);

  const rows = await parseExcelBuffer(await workbook.xlsx.writeBuffer());
  const studentsInClass = new Set(rows.filter((row) => row.lop === "10A").map((row) => row.ho_va_ten));
  const qpanLessons = rows.filter((row) =>
    row.lop === "10A" && row.thu === "Thứ 2" && row.buoi === "Sáng" &&
    row.tiet === "Tiết 2" && row.mon_hoc === "QPAN" && row.giao_vien === "Sáu.TV"
  );

  assert.equal(qpanLessons.length, studentsInClass.size);
  assert.ok(qpanLessons.every((row) => row.phong_hoc === "10A" && row.loai_tiet === "Chính khóa"));
});
