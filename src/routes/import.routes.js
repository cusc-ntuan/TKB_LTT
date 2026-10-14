import multer from 'multer';
import { parseExcelBuffer } from '../lib/excel.js';
import { replaceAll } from '../lib/db.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Chỉ nhận file Excel (.xlsx, .xls) hoặc CSV.'), ok);
  },
});

function registerImportRoutes(app) {
  app.post('/api/import', upload.single('file'), async (req, res) => {
    let stage = 'parse';
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Chưa chọn file Excel.' });
      }

      const startedAt = Date.now();
      console.info('[database] Bắt đầu nhập dữ liệu');
      const rows = await parseExcelBuffer(req.file.buffer);
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
