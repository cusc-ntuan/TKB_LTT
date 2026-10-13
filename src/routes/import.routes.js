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
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Chưa chọn file Excel.' });
      }

      const rows = await parseExcelBuffer(req.file.buffer);
      const result = replaceAll(rows);
      res.json({
        ...result,
        filename: req.file.originalname,
        message: `Đã nhập ${result.imported} dòng vào SQLite.`,
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Không đọc được file Excel.' });
    }
  });
}

export { registerImportRoutes };
