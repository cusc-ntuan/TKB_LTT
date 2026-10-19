import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function registerPageRoutes(app) {
  app.get('/import', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
  });
}

export { registerPageRoutes };
