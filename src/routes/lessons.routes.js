import { listLessons, filters, stats } from '../lib/db.js';

function registerLessonRoutes(app) {
  app.get('/api/stats', (_req, res) => {
    res.json(stats());
  });

  app.get('/api/filters', (_req, res) => {
    res.json(filters());
  });

  app.get('/api/lessons', (req, res) => {
    res.json(listLessons(req.query));
  });
}

export { registerLessonRoutes };
