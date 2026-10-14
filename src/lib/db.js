import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { config, env } from "../config.js";
import { parseExcelBuffer } from "./excel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tursoUrl = config.database.turso.url;
const tursoToken = config.database.turso.authToken;
const isTestFileDatabase = env.NODE_ENV === "test" && tursoUrl?.startsWith("file:");

if (!tursoUrl || (!tursoToken && !isTestFileDatabase)) {
  throw new Error("Cần cấu hình TURSO_DATABASE_URL và TURSO_AUTH_TOKEN để kết nối Turso.");
}

if (!isTestFileDatabase && !/^https:\/\/|^libsql:\/\//.test(tursoUrl)) {
  throw new Error("TURSO_DATABASE_URL phải là URL Turso (libsql:// hoặc https://).");
}

const client = createClient(
  isTestFileDatabase
    ? { url: tursoUrl }
    : { url: tursoUrl, authToken: tursoToken }
);
const MAX_LESSONS_CACHE_ENTRIES = 100;
const INSERT_BATCH_SIZE = 500;
const CACHE_TTL_MS = 30_000;
const LESSON_FIELDS = [
  "ho_va_ten",
  "lop",
  "thu",
  "buoi",
  "tiet",
  "mon_hoc",
  "phong_hoc",
  "giao_vien",
  "loai_tiet",
  "ghi_chu",
];
const lessonsCache = new Map();
let filtersCache;
let statsCache;
let initialization;

function clearCache() {
  lessonsCache.clear();
  filtersCache = undefined;
  statsCache = undefined;
}

function setLessonsCache(key, value) {
  if (lessonsCache.size >= MAX_LESSONS_CACHE_ENTRIES) {
    lessonsCache.delete(lessonsCache.keys().next().value);
  }
  lessonsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getCache(cache) {
  if (!cache || cache.expiresAt <= Date.now()) return undefined;
  return cache.value;
}

function rowToObject(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

async function insertRows(transaction, rows) {
  const sql = `INSERT INTO lessons (${LESSON_FIELDS.join(", ")})
    VALUES (${LESSON_FIELDS.map(() => "?").join(", ")})`;

  for (let start = 0; start < rows.length; start += INSERT_BATCH_SIZE) {
    const statements = rows.slice(start, start + INSERT_BATCH_SIZE).map((row) => [
      sql,
      LESSON_FIELDS.map((field) => row[field] ?? ""),
    ]);
    await transaction.batch(statements);
  }
}

async function replaceRows(rows) {
  const transaction = await client.transaction("write");
  try {
    await transaction.execute("DELETE FROM lessons");
    await insertRows(transaction, rows);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function initialize() {
  if (!initialization) {
    const startedAt = Date.now();
    console.info("[database] Bắt đầu khởi tạo", {
      provider: isTestFileDatabase ? "test" : "Turso",
    });
    initialization = (async () => {
      await client.batch([
        [`CREATE TABLE IF NOT EXISTS lessons (
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
        )`],
        ["CREATE INDEX IF NOT EXISTS idx_lessons_lop ON lessons(lop)"],
        ["CREATE INDEX IF NOT EXISTS idx_lessons_gv ON lessons(giao_vien)"],
        ["CREATE INDEX IF NOT EXISTS idx_lessons_phong ON lessons(phong_hoc)"],
        ["CREATE INDEX IF NOT EXISTS idx_lessons_ten ON lessons(ho_va_ten)"],
        ["CREATE INDEX IF NOT EXISTS idx_lessons_thu ON lessons(thu)"],
      ], "write");

      const workbookPath = path.join(__dirname, "..", "..", "data", "TKB.xlsx");
      const currentTotal = Number(
        (await client.execute("SELECT COUNT(*) AS total FROM lessons")).rows[0].total
      );
      let imported = 0;
      let seededFromWorkbook = false;
      if (currentTotal === 0 && fs.existsSync(workbookPath)) {
        const rows = await parseExcelBuffer(fs.readFileSync(workbookPath));
        await replaceRows(rows);
        imported = rows.length;
        seededFromWorkbook = true;
      }
      const total = currentTotal || imported;
      console.info("[database] Khởi tạo hoàn tất", {
        rows: total,
        seededFromWorkbook,
        durationMs: Date.now() - startedAt,
      });
    })().catch((error) => {
      console.error("[database] Khởi tạo thất bại", {
        error: error?.name || "Error",
        durationMs: Date.now() - startedAt,
      });
      throw error;
    });
  }

  await initialization;
}

async function replaceAll(rows) {
  await initialize();
  await replaceRows(rows);
  clearCache();
  return { imported: rows.length };
}

async function listLessons(filters = {}) {
  await initialize();
  const cacheKey = JSON.stringify({
    lop: filters.lop || "",
    giao_vien: filters.giao_vien || "",
    ho_va_ten: filters.ho_va_ten || "",
    thu: filters.thu || "",
    buoi: filters.buoi || "",
    mon_hoc: filters.mon_hoc || "",
    q: filters.q || "",
  });
  const cachedLessons = getCache(lessonsCache.get(cacheKey));
  if (cachedLessons) return cachedLessons;

  const where = [];
  const args = [];

  for (const key of ["lop", "giao_vien", "ho_va_ten", "thu", "buoi", "mon_hoc"]) {
    if (filters[key]) {
      where.push(`${key} = ?`);
      args.push(filters[key]);
    }
  }

  if (filters.q) {
    where.push(`(
      ho_va_ten LIKE ? OR lop LIKE ? OR mon_hoc LIKE ? OR
      phong_hoc LIKE ? OR giao_vien LIKE ? OR ghi_chu LIKE ?
    )`);
    const searchTerm = `%${filters.q}%`;
    args.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const result = await client.execute({
    sql: `
      SELECT * FROM lessons
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY lop, thu, buoi, CAST(tiet AS INTEGER), tiet, ho_va_ten
    `,
    args,
  });
  const lessons = result.rows.map((row) => rowToObject(row, ["id", ...LESSON_FIELDS]));
  setLessonsCache(cacheKey, lessons);
  return lessons;
}

async function stats() {
  await initialize();
  const cachedStats = getCache(statsCache);
  if (cachedStats) return cachedStats;

  const result = await client.execute(`
    SELECT
      COUNT(*) AS total,
      COUNT(DISTINCT CASE WHEN TRIM(lop) != '' THEN lop END) AS lop,
      COUNT(DISTINCT CASE WHEN TRIM(giao_vien) != '' THEN giao_vien END) AS giao_vien,
      COUNT(DISTINCT CASE WHEN TRIM(ho_va_ten) != '' THEN ho_va_ten END) AS ho_va_ten
    FROM lessons
  `);
  statsCache = {
    value: {
      total: Number(result.rows[0].total),
      lop: Number(result.rows[0].lop),
      giao_vien: Number(result.rows[0].giao_vien),
      ho_va_ten: Number(result.rows[0].ho_va_ten),
    },
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return statsCache.value;
}

async function filters() {
  await initialize();
  const cachedFilters = getCache(filtersCache);
  if (cachedFilters) return cachedFilters;

  const columns = ["lop", "giao_vien", "ho_va_ten", "thu", "buoi", "mon_hoc"];
  const results = await client.batch(
    columns.map((column) => [
      `SELECT DISTINCT ${column} AS value FROM lessons
       WHERE TRIM(${column}) != ''
       ORDER BY value COLLATE NOCASE`,
    ]),
    "read"
  );
  const values = results.map((result) => result.rows.map((row) => row.value));
  const [lop, giao_vien, ho_va_ten, thu, buoi, mon_hoc] = values;
  filtersCache = {
    value: { lop, giao_vien, ho_va_ten, thu, buoi, mon_hoc },
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return filtersCache.value;
}

export { replaceAll, listLessons, filters, stats };
