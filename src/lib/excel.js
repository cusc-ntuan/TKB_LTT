import ExcelJS from "exceljs";
import { Readable } from "node:stream";

const FIELD_ALIASES = {
  ho_va_ten: ["ho va ten", "ho_va_ten", "hoten", "ho ten", "ten", "name", "student", "hoc sinh"],
  lop: ["lop", "lop hoc", "class", "classroom"],
  thu: ["thu", "thu trong tuan", "ngay", "day", "weekday"],
  buoi: ["buoi", "session", "ca"],
  tiet: ["tiet", "tiet hoc", "period", "tiet so"],
  mon_hoc: ["mon hoc", "mon", "subject", "hoc phan"],
  phong_hoc: ["phong hoc", "phong", "room", "phong so", "phong hoc lop"],
  giao_vien: ["giao vien", "gv", "teacher", "giang vien", "giao vien giang day"],
  loai_tiet: ["loai tiet", "loai", "type", "hinh thuc"],
  ghi_chu: ["ghi chu", "note", "notes", "ghichu"],
};

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapHeaders(headers) {
  const mapping = {};
  for (const header of headers) {
    const norm = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(norm) && mapping[field] === undefined) {
        mapping[field] = header;
      }
    }
  }
  return mapping;
}

function cell(row, header) {
  if (!header) return "";
  const value = row[header];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function removeRepeatedFinalNameWord(value) {
  const words = String(value ?? "").trim().split(/\s+/);
  if (words.length > 1 && words.at(-1).toLocaleLowerCase("vi") === words.at(-2).toLocaleLowerCase("vi")) {
    words.pop();
  }
  return words.join(" ");
}

function sheetToRows(sheet) {
  const rows = [];
  if (!sheet) return rows;

  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values = (row.values || []).slice(1).map((value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "object" && "text" in value) return String(value.text ?? "");
      return String(value);
    });
    rows.push(values);
  });

  return rows;
}

function sheetToJson(sheet) {
  const rows = sheetToRows(sheet);
  if (!rows.length) return [];

  const headers = rows[0].map((value) => String(value ?? ""));
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? "";
    });
    return obj;
  });
}

function addMissingQpanLessons(rows, workbook) {
  const classLessons = workbook.worksheets
    .flatMap((sheet) => parseClassMatrix(sheet) || [])
    .filter((lesson) => lesson.mon_hoc === "QPAN" && lesson.giao_vien === "Sáu.TV");
  if (!classLessons.length) return rows;

  const studentsByClass = new Map();
  const existingLessons = new Set();
  const lessonKey = (lesson) => [
    lesson.ho_va_ten,
    lesson.lop,
    lesson.thu,
    lesson.buoi,
    lesson.tiet,
    lesson.mon_hoc,
    lesson.giao_vien,
  ].join("\u0000");

  for (const row of rows) {
    if (!row.ho_va_ten || !row.lop) continue;
    if (!studentsByClass.has(row.lop)) studentsByClass.set(row.lop, new Set());
    studentsByClass.get(row.lop).add(row.ho_va_ten);
    existingLessons.add(lessonKey(row));
  }

  for (const lesson of classLessons) {
    const period = /^\d+$/.test(lesson.tiet) ? `Tiết ${lesson.tiet}` : lesson.tiet;
    for (const student of studentsByClass.get(lesson.lop) || []) {
      const row = {
        ...lesson,
        ho_va_ten: student,
        tiet: period,
        phong_hoc: lesson.lop,
        loai_tiet: "Chính khóa",
      };
      const key = lessonKey(row);
      if (existingLessons.has(key)) continue;
      rows.push(row);
      existingLessons.add(key);
    }
  }

  return rows;
}

function parseClassMatrix(sheet) {
  const matrix = sheetToRows(sheet);
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.slice(0, 3).map(normalizeHeader);
    return headers[0] === "thu" && headers[1] === "buoi" && headers[2] === "tiet";
  });
  if (headerIndex < 0) return null;

  const header = matrix[headerIndex];
  const classColumns = header
    .map((value, index) => ({ lop: String(value || "").trim(), index }))
    .filter(({ lop, index }) => index >= 3 && lop !== "");
  if (!classColumns.length) return null;

  let thu = "";
  let buoi = "";
  const rows = [];
  for (const sourceRow of matrix.slice(headerIndex + 1)) {
    if (String(sourceRow[0] || "").trim() !== "") {
      thu = `Thứ ${String(sourceRow[0]).trim()}`;
    }
    if (String(sourceRow[1] || "").trim() !== "") {
      const session = String(sourceRow[1]).trim().toUpperCase();
      buoi = session === "S" ? "Sáng" : session === "C" ? "Chiều" : session;
    }
    const tiet = String(sourceRow[2] || "").trim();
    if (!thu || !buoi || !tiet) continue;

    for (const { lop, index } of classColumns) {
      const value = String(sourceRow[index] || "").trim();
      if (!value) continue;
      const separator = value.lastIndexOf("-");
      const monHoc = separator >= 0 ? value.slice(0, separator).trim() : value;
      const giaoVien = separator >= 0 ? value.slice(separator + 1).trim() : "";
      rows.push({
        ho_va_ten: "",
        lop,
        thu,
        buoi,
        tiet,
        mon_hoc: monHoc,
        phong_hoc: "",
        giao_vien: giaoVien,
        loai_tiet: "",
        ghi_chu: "",
      });
    }
  }
  return rows;
}

async function parseExcelBuffer(buffer, filename = "") {
  const workbook = new ExcelJS.Workbook();
  if (/\.csv$/i.test(filename)) {
    await workbook.csv.read(Readable.from(buffer));
  } else if (/\.xls$/i.test(filename)) {
    throw new Error("Định dạng .xls cũ chưa được hỗ trợ. Hãy lưu file thành .xlsx hoặc .csv.");
  } else {
    await workbook.xlsx.load(buffer);
  }

  let rows;
  let mapping;
  for (const sheet of workbook.worksheets) {
    const candidateRows = sheetToJson(sheet);
    if (!candidateRows.length) continue;
    const candidateMapping = mapHeaders(Object.keys(candidateRows[0]));
    if (candidateMapping.ho_va_ten && candidateMapping.lop && candidateMapping.thu && candidateMapping.tiet) {
      rows = candidateRows;
      mapping = candidateMapping;
      break;
    }
  }

  if (!rows) {
    for (const sheet of workbook.worksheets) {
      const matrixRows = parseClassMatrix(sheet);
      if (matrixRows) return matrixRows;
    }
  }

  if (!rows) {
    for (const sheet of workbook.worksheets) {
      const candidateRows = sheetToJson(sheet);
      if (!candidateRows.length) continue;
      const candidateMapping = mapHeaders(Object.keys(candidateRows[0]));
      if (candidateMapping.ho_va_ten || candidateMapping.lop) {
        rows = candidateRows;
        mapping = candidateMapping;
        break;
      }
    }
  }

  if (!rows) {
    if (!workbook.worksheets.length) throw new Error("File Excel không có sheet nào.");
    throw new Error("Không tìm thấy cột Họ và Tên hoặc Lớp trong file Excel.");
  }

  let name = "";
  for (const row of rows) {
    if (cell(row, mapping.ho_va_ten) !== "") {
      name = cell(row, mapping.ho_va_ten).trim();
    }
    if (mapping.ho_va_ten) row[mapping.ho_va_ten] = name;
  }

  const parsedRows = rows.map((row) => ({
    ho_va_ten: removeRepeatedFinalNameWord(cell(row, mapping.ho_va_ten)),
    lop: cell(row, mapping.lop),
    thu: cell(row, mapping.thu),
    buoi: cell(row, mapping.buoi),
    tiet: cell(row, mapping.tiet),
    mon_hoc: cell(row, mapping.mon_hoc),
    phong_hoc: cell(row, mapping.phong_hoc),
    giao_vien: cell(row, mapping.giao_vien),
    loai_tiet: cell(row, mapping.loai_tiet),
    ghi_chu: cell(row, mapping.ghi_chu),
  }));
  return addMissingQpanLessons(parsedRows, workbook);
}

export { parseExcelBuffer };
