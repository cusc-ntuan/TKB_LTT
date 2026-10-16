import multer from 'multer';
import { parseExcelBuffer } from '../lib/excel.js';
import { replaceAll } from '../lib/db.js';

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

function registerImportRoutes(app) {
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

      const startedAt = Date.now();
      console.info('[database] Bắt đầu nhập dữ liệu');
      const rows = await parseExcelBuffer(req.file.buffer, req.file.originalname);
      summarizeRows(rows);
      stage = 'write';
      const result = await replaceAll(rows);
      console.info('[database] Nhập dữ liệu hoàn tất', {
        imported: result.imported,
        durationMs: Date.now() - startedAt,
      });
      res.json({
        ...result,
        filename: req.file.originalname,
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
