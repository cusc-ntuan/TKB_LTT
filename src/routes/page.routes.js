import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAdminAuthenticated, renderAdminLoginPage } from '../lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function registerPageRoutes(app) {
  app.get('/import', (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return res.type('html').send(renderAdminLoginPage('Vui lòng đăng nhập để truy cập chức năng nhập dữ liệu.'));
    }

    return res.sendFile(path.join(__dirname, '..', '..', 'public', 'import.html'));
  });
}

export { registerPageRoutes };
