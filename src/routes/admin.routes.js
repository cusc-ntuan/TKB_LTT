import { isAdminAuthenticated, isAdminConfigured, loginAdmin, logoutAdmin } from '../lib/auth.js';

function registerAdminRoutes(app) {
  app.get('/api/admin/session', (req, res) => {
    res.json({
      authenticated: isAdminAuthenticated(req),
      configured: isAdminConfigured(),
    });
  });

  app.post('/api/admin/login', (req, res) => {
    return loginAdmin(req, res);
  });

  app.post('/api/admin/logout', (req, res) => {
    return logoutAdmin(req, res);
  });
}

export { registerAdminRoutes };
