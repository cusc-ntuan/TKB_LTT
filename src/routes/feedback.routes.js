import { config } from '../config.js';
import { createFeedbackIssue, validateFeedback } from '../services/feedback.service.js';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const MAX_RATE_LIMIT_ENTRIES = 5000;
const submissionsByIp = new Map();

function checkRateLimit(ip, now = Date.now()) {
  const submissions = (submissionsByIp.get(ip) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (submissions.length >= RATE_LIMIT_MAX) {
    submissionsByIp.set(ip, submissions);
    return false;
  }

  submissions.push(now);
  submissionsByIp.delete(ip);
  submissionsByIp.set(ip, submissions);
  if (submissionsByIp.size > MAX_RATE_LIMIT_ENTRIES) {
    submissionsByIp.delete(submissionsByIp.keys().next().value);
  }
  return true;
}

function registerFeedbackRoutes(app) {
  app.post('/api/feedback', async (req, res) => {
    const validation = validateFeedback(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    if (!checkRateLimit(req.ip || req.socket.remoteAddress || 'unknown')) {
      return res.status(429).json({ error: 'Bạn đã gửi nhiều góp ý. Vui lòng thử lại sau ít phút.' });
    }

    try {
      const issue = await createFeedbackIssue(validation.value, config.feedback);
      return res.status(201).json({
        ...issue,
        message: 'Đã ghi nhận góp ý. Cảm ơn bạn!',
      });
    } catch (error) {
      if (error.status === 503) {
        return res.status(503).json({ error: error.message });
      }
      console.error('Không thể ghi nhận góp ý lên GitHub:', error.message);
      return res.status(502).json({ error: error.message || 'Không thể ghi nhận góp ý.' });
    }
  });
}

export { registerFeedbackRoutes };
