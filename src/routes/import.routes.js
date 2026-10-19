import multer from 'multer';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { parseExcelBuffer } from '../lib/excel.js';
import { replaceAll } from '../lib/db.js';
import { normalizeSchoolTimetable } from '../lib/normalization.js';
import { schoolDateToISO } from '../lib/json.js';

const SCHOOL_VERSION_ID_PATTERN = /^v\d+$/;
const PRIVATE_IPV4_NETWORKS = new BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([address, prefix]) => PRIVATE_IPV4_NETWORKS.addSubnet(address, prefix, 'ipv4'));
const PRIVATE_IPV6_NETWORKS = new BlockList();
[
  ['::', 128], ['::1', 128], ['::ffff:0:0', 96], ['64:ff9b:1::', 48],
  ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['2002::', 16],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
].forEach(([address, prefix]) => PRIVATE_IPV6_NETWORKS.addSubnet(address, prefix, 'ipv6'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xls$/i.test(file.originalname)) {
      cb(new Error('Định dạng .xls cũ chưa được hỗ trợ. Hãy lưu file thành .xlsx hoặc .csv.'));
      return;
    }
    if (!/\.(xlsx|csv)$/i.test(file.originalname)) {
      cb(new Error('Chỉ nhận file Excel .xlsx hoặc CSV .csv.'));
      return;
    }
    cb(null, true);
  },
});

function summarizeRows(rows) {
  if (!rows.length) {
    throw new Error('File không có dòng thời khóa biểu hợp lệ; dữ liệu hiện tại được giữ nguyên.');
  }
  const invalidRows = rows.filter((row) =>
    ['lop', 'thu', 'tiet', 'mon_hoc'].some((field) => !String(row[field] ?? '').trim())
  );
  if (invalidRows.length) {
    throw new Error(
      `Có ${invalidRows.length} dòng thiếu Lớp, Thứ, Tiết hoặc Môn học; dữ liệu hiện tại được giữ nguyên.`
    );
  }
  const classes = [...new Set(rows.map((row) => row.lop).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'vi')
  );
  const days = [...new Set(rows.map((row) => row.thu).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'vi')
  );
  return {
    rowCount: rows.length,
    classCount: classes.length,
    dayCount: days.length,
    classes: classes.slice(0, 8),
    sample: rows.slice(0, 5),
  };
}

function isValidEffectiveDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function validateSchoolDataBaseUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    throw new Error('Vui lòng nhập URL dữ liệu của trường.');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('URL dữ liệu của trường không hợp lệ.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('URL dữ liệu phải dùng HTTPS và không chứa thông tin đăng nhập hoặc query.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/versions\.json$/i, '');

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')
    || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('URL dữ liệu phải trỏ đến máy chủ công khai.');
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => {
    const family = isIP(address);
    if (family === 4) return PRIVATE_IPV4_NETWORKS.check(address, 'ipv4');
    if (family === 6) return PRIVATE_IPV6_NETWORKS.check(address, 'ipv6');
    return true;
  })) {
    throw new Error('Máy chủ trong URL phải phân giải về địa chỉ IP công khai.');
  }
  return url.toString().replace(/\/$/, '');
}

async function fetchSchoolJson(baseUrl, path) {
  const url = await validateSchoolDataBaseUrl(baseUrl);
  const response = await fetch(`${url}/${path}`, {
    signal: AbortSignal.timeout(20_000),
    redirect: 'manual',
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error('Máy chủ dữ liệu không được chuyển hướng yêu cầu.');
  }
  if (!response.ok) {
    throw new Error(`Không tải được dữ liệu từ trường (HTTP ${response.status}).`);
  }
  return response.json();
}

async function getSchoolVersions(baseUrl) {
  const versions = await fetchSchoolJson(baseUrl, 'versions.json');
  if (!Array.isArray(versions) || !versions.length) {
    throw new Error('Danh sách phiên bản thời khóa biểu từ trường không hợp lệ.');
  }
  const validVersions = versions.filter((version) =>
    version && typeof version.id === 'string'
    && SCHOOL_VERSION_ID_PATTERN.test(version.id)
    && typeof version.label === 'string'
  );
  if (!validVersions.length) {
    throw new Error('Danh sách phiên bản thời khóa biểu từ trường không có phiên bản hợp lệ.');
  }
  return validVersions;
}

async function loadSchoolVersion(baseUrl, versionId) {
  if (typeof versionId !== 'string' || !SCHOOL_VERSION_ID_PATTERN.test(versionId)) {
    throw new Error('Mã phiên bản thời khóa biểu không hợp lệ.');
  }
  const versions = await getSchoolVersions(baseUrl);
  const version = versions.find((item) => item.id === versionId);
  if (!version) throw new Error('Không tìm thấy phiên bản thời khóa biểu đã chọn.');
  const [classes, teachers, students] = await Promise.all([
    fetchSchoolJson(baseUrl, `${versionId}/data_classes.json`),
    fetchSchoolJson(baseUrl, `${versionId}/data_teachers.json`),
    fetchSchoolJson(baseUrl, `${versionId}/data_students.json`),
  ]);
  const rows = normalizeSchoolTimetable({ classes, teachers, students });
  const summary = summarizeRows(rows);
  const studentSamples = rows.filter((row) => row.ho_va_ten).slice(0, 5);
  return {
    version: {
      id: version.id,
      label: version.label,
      date: version.date,
      effectiveDate: schoolDateToISO(version.date),
    },
    rows,
    summary: {
      ...summary,
      sample: studentSamples.length ? studentSamples : summary.sample,
    },
  };
}

function registerImportRoutes(app) {
  app.get('/api/import/versions', async (req, res) => {
    try {
      const versions = await getSchoolVersions(req.query.baseUrl);
      res.json({
        versions: versions.map((version) => ({
          id: version.id,
          label: version.label,
          date: version.date,
          default: version.default === true,
        })),
      });
    } catch (err) {
      console.error('[database] Không thể tải danh sách phiên bản từ trường', {
        error: err?.name || 'Error',
      });
      res.status(502).json({ error: err.message || 'Không thể tải danh sách phiên bản từ trường.' });
    }
  });

  app.get('/api/import/preview', async (req, res) => {
    try {
      const { version, summary } = await loadSchoolVersion(req.query.baseUrl, req.query.version);
      res.json({ version, ...summary });
    } catch (err) {
      console.error('[database] Không thể xem trước dữ liệu từ trường', {
        error: err?.name || 'Error',
      });
      res.status(502).json({ error: err.message || 'Không thể tải dữ liệu thời khóa biểu từ trường.' });
    }
  });

  app.post('/api/import/json', async (req, res) => {
    try {
      const { version, rows } = await loadSchoolVersion(req.body.baseUrl, req.body.version);
      const result = await replaceAll(rows, version.effectiveDate);
      console.info('[database] Nhập dữ liệu từ trường hoàn tất', {
        version: version.id,
        imported: result.imported,
      });
      res.json({
        ...result,
        version,
        message: `Đã nhập ${result.imported} dòng thời khóa biểu từ ${version.label}.`,
      });
    } catch (err) {
      console.error('[database] Nhập dữ liệu từ trường thất bại', {
        error: err?.name || 'Error',
      });
      res.status(400).json({ error: err.message || 'Không thể nhập dữ liệu thời khóa biểu từ trường.' });
    }
  });

  app.post('/api/import/preview', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Chưa chọn file Excel.' });
      }
      const rows = await parseExcelBuffer(req.file.buffer, req.file.originalname);
      res.json({
        filename: req.file.originalname,
        ...summarizeRows(rows),
      });
    } catch (err) {
      console.error('[database] Không thể xem trước file nhập', {
        error: err?.name || 'Error',
      });
      res.status(400).json({ error: err.message || 'Không đọc được file Excel.' });
    }
  });

  app.post('/api/import', upload.single('file'), async (req, res) => {
    let stage = 'parse';
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Chưa chọn file Excel.' });
      }
      if (!isValidEffectiveDate(req.body.effectiveDate || '')) {
        return res.status(400).json({ error: 'Ngày áp dụng không hợp lệ.' });
      }

      const startedAt = Date.now();
      console.info('[database] Bắt đầu nhập dữ liệu');
      const rows = await parseExcelBuffer(req.file.buffer, req.file.originalname);
      summarizeRows(rows);
      stage = 'write';
      const result = await replaceAll(rows, req.body.effectiveDate);
      console.info('[database] Nhập dữ liệu hoàn tất', {
        imported: result.imported,
        durationMs: Date.now() - startedAt,
      });
      res.json({
        ...result,
        filename: req.file.originalname,
        effectiveDate: req.body.effectiveDate,
        message: `Đã nhập ${result.imported} dòng vào database.`,
      });
    } catch (err) {
      console.error('[database] Nhập dữ liệu thất bại', {
        stage,
        error: err?.name || 'Error',
      });
      res.status(400).json({ error: err.message || 'Không đọc được file Excel.' });
    }
  });
}

export { registerImportRoutes };
