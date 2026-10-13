import { heartbeat } from '../lib/presence.js';

function registerPresenceRoutes(app) {
  app.post('/api/presence', (req, res) => {
    try {
      const clientId = req.body?.clientId;
      res.json({ online: heartbeat(clientId) });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}

export { registerPresenceRoutes };
