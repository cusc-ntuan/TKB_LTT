import { listLessons, filters, stats, dataStatus } from '../lib/db.js';

function registerLessonRoutes(app) {
  app.get('/api/stats', async (_req, res) => {
    res.json(await stats());
  });

  app.get('/api/data-status', async (_req, res) => {
    res.json(await dataStatus());
  });

  app.get('/api/filters', async (_req, res) => {
    res.json(await filters());
  });

  app.get('/api/lessons', async (req, res) => {
    res.json(await listLessons(req.query));
  });
}

export { registerLessonRoutes };
