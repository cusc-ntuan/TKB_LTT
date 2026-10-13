import {
  resolveTotalVisitors,
  fetchVercelAnalyticsSnapshot,
  getVercelAnalyticsConfigStatus,
} from '../services/analytics.service.js';

function registerAnalyticsRoutes(app) {
  app.get('/api/analytics', async (_req, res) => {
    const fallback = resolveTotalVisitors(process.env) ?? null;

    try {
      const snapshot = await fetchVercelAnalyticsSnapshot(process.env);
      if (snapshot.ok) {
        res.json({
          todayVisitors: snapshot.todayVisitors,
          totalVisitors: snapshot.totalVisitors,
          reason: snapshot.reason,
          status: snapshot.status,
        });
        return;
      }

      res.json({
        todayVisitors: snapshot.todayVisitors ?? null,
        totalVisitors: snapshot.totalVisitors ?? fallback,
        reason: snapshot.reason || getVercelAnalyticsConfigStatus(process.env),
        status: snapshot.status || (fallback !== null ? 'env-fallback' : 'missing-config'),
      });
    } catch (_err) {
      res.json({
        todayVisitors: null,
        totalVisitors: fallback,
        reason: getVercelAnalyticsConfigStatus(process.env),
        status: 'api-error',
      });
    }
  });
}

export { registerAnalyticsRoutes };
