import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { parseExcelBuffer } from "./excel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? path.join("/tmp", "tkb-data") : path.join(__dirname, "..", "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "timetable.db");
const db = new Database(dbPath);
const MAX_LESSONS_CACHE_ENTRIES = 100;
const lessonsCache = new Map();
let filtersCache;
let statsCache;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ho_va_ten TEXT NOT NULL DEFAULT '',
    lop TEXT NOT NULL DEFAULT '',
    thu TEXT NOT NULL DEFAULT '',
    buoi TEXT NOT NULL DEFAULT '',
    tiet TEXT NOT NULL DEFAULT '',
    mon_hoc TEXT NOT NULL DEFAULT '',
    phong_hoc TEXT NOT NULL DEFAULT '',
    giao_vien TEXT NOT NULL DEFAULT '',
    loai_tiet TEXT NOT NULL DEFAULT '',
    ghi_chu TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_lessons_lop ON lessons(lop);
  CREATE INDEX IF NOT EXISTS idx_lessons_gv ON lessons(giao_vien);
  CREATE INDEX IF NOT EXISTS idx_lessons_phong ON lessons(phong_hoc);
  CREATE INDEX IF NOT EXISTS idx_lessons_ten ON lessons(ho_va_ten);
  CREATE INDEX IF NOT EXISTS idx_lessons_thu ON lessons(thu);
`);

function clearCache() {
  lessonsCache.clear();
  filtersCache = undefined;
  statsCache = undefined;
}

function setLessonsCache(key, value) {
  if (lessonsCache.size >= MAX_LESSONS_CACHE_ENTRIES) {
    lessonsCache.delete(lessonsCache.keys().next().value);
  }
  lessonsCache.set(key, value);
}

function replaceAll(rows) {
  console.log(`Replacing all lessons with ${rows.length} new rows...`);
  const insert = db.prepare(`
    INSERT INTO lessons (
      ho_va_ten, lop, thu, buoi, tiet, mon_hoc, phong_hoc, giao_vien, loai_tiet, ghi_chu
    ) VALUES (
      @ho_va_ten, @lop, @thu, @buoi, @tiet, @mon_hoc, @phong_hoc, @giao_vien, @loai_tiet, @ghi_chu
    )
  `);

  const tx = db.transaction((items) => {
    db.exec("DELETE FROM lessons");
    for (const row of items) insert.run(row);
  });

  tx(rows);
  clearCache();
  return { imported: rows.length };
}

function listLessons(filters = {}) {
  const cacheKey = JSON.stringify({
    lop: filters.lop || "",
    giao_vien: filters.giao_vien || "",
    ho_va_ten: filters.ho_va_ten || "",
    thu: filters.thu || "",
    buoi: filters.buoi || "",
    mon_hoc: filters.mon_hoc || "",
    q: filters.q || "",
  });
  if (lessonsCache.has(cacheKey)) return lessonsCache.get(cacheKey);

  const where = [];
  const params = {};

  for (const key of ["lop", "giao_vien", "ho_va_ten", "thu", "buoi", "mon_hoc"]) {
    if (filters[key]) {
      where.push(`${key} = @${key}`);
      params[key] = filters[key];
    }
  }

  if (filters.q) {
    where.push(`(
      ho_va_ten LIKE @q OR lop LIKE @q OR mon_hoc LIKE @q OR
      phong_hoc LIKE @q OR giao_vien LIKE @q OR ghi_chu LIKE @q
    )`);
    params.q = `%${filters.q}%`;
  }

  const sql = `
    SELECT * FROM lessons
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY lop, thu, buoi, CAST(tiet AS INTEGER), tiet, ho_va_ten
  `;
  const lessons = db.prepare(sql).all(params);
  setLessonsCache(cacheKey, lessons);
  return lessons;
}

function distinct(column) {
  return db
    .prepare(
      `SELECT DISTINCT ${column} AS value FROM lessons
       WHERE TRIM(${column}) != ''
       ORDER BY value COLLATE NOCASE`
    )
    .all()
    .map((r) => r.value);
}

function stats() {
  if (statsCache) return statsCache;
  const row = db.prepare("SELECT COUNT(*) AS total FROM lessons").get();
  statsCache = {
    total: row.total,
    lop: distinct("lop").length,
    giao_vien: distinct("giao_vien").length,
    ho_va_ten: distinct("ho_va_ten").length,
  };
  return statsCache;
}

function filters() {
  if (filtersCache) return filtersCache;
  filtersCache = {
    lop: distinct("lop"),
    giao_vien: distinct("giao_vien"),
    ho_va_ten: distinct("ho_va_ten"),
    thu: distinct("thu"),
    buoi: distinct("buoi"),
    mon_hoc: distinct("mon_hoc"),
  };
  return filtersCache;
}

async function loadBundledData() {
  const workbookPath = path.join(__dirname, "..", "..", "data", "TKB.xlsx");
  if (!fs.existsSync(workbookPath)) return false;

  const rows = await parseExcelBuffer(fs.readFileSync(workbookPath));
  replaceAll(rows);
  return true;
}

if (db.prepare("SELECT COUNT(*) AS total FROM lessons").get().total === 0) {
  loadBundledData().catch((error) => {
    console.error("Không thể nạp dữ liệu bundled:", error);
  });
}

export { db, replaceAll, listLessons, filters, stats, dbPath };
