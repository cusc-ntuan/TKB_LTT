import { config } from '../config.js';

const VISITOR_ENV_KEYS = [
  'VERCEL_ANALYTICS_TOTAL',
  'VERCEL_TOTAL_VISITORS',
  'VERCEL_VISITOR_COUNT',
  'VERCEL_VIEWERS_TOTAL',
];

function parseVisitorCount(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number.parseInt(String(raw).replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(value) ? null : value;
}

function resolveTotalVisitors(env = process.env) {
  for (const key of VISITOR_ENV_KEYS) {
    const raw = env[key];
    const value = parseVisitorCount(raw);
    if (value !== null) return value;
  }
  return null;
}

function extractVercelVisitorCount(payload) {
  const data = payload?.data;
  if (data && typeof data === 'object') {
    const direct = parseVisitorCount(data.visitors ?? data.total ?? data.count ?? data.value);
    if (direct !== null) return direct;
  }
  if (Array.isArray(data) && data.length) {
    const first = data[0];
    const fallback = parseVisitorCount(first.visitors ?? first.total ?? first.count ?? first.value);
    if (fallback !== null) return fallback;
  }
  return null;
}

function getVercelProjectId(env = config.env) {
  return env.VERCEL_PROJECT_ID || env.VERCEL_ANALYTICS_PROJECT_ID || env.PROJECT_ID || null;
}

function getVercelToken(env = config.env) {
  return env.VERCEL_TOKEN || env.VERCEL_ACCESS_TOKEN || env.VERCEL_ANALYTICS_TOKEN || null;
}

function getVercelTeamId(env = config.env) {
  return env.VERCEL_TEAM_ID || env.VERCEL_ANALYTICS_TEAM_ID || env.TEAM_ID || null;
}

function getVercelAnalyticsConfigStatus(env = process.env) {
  const token = getVercelToken(env);
  const projectId = getVercelProjectId(env);
  const teamId = getVercelTeamId(env);

  if (!token || !projectId) {
    return 'Thiếu VERCEL_TOKEN hoặc VERCEL_PROJECT_ID';
  }

  if (!teamId && env.VERCEL_TEAM_ID === undefined && env.VERCEL_ANALYTICS_TEAM_ID === undefined) {
    return 'Sẵn sàng: projectId và token đã có, teamId là tùy chọn cho project thuộc team';
  }

  return 'Cấu hình Vercel Analytics đã có đủ thông tin';
}

async function fetchVercelAnalyticsRange(env = process.env, since, until) {
  const token = getVercelToken(env);
  const projectId = getVercelProjectId(env);
  if (!token || !projectId) {
    return {
      ok: false,
      totalVisitors: null,
      status: 'missing-config',
      reason: 'Thiếu VERCEL_TOKEN hoặc VERCEL_PROJECT_ID',
      httpStatus: null,
    };
  }

  const url = new URL('https://api.vercel.com/v1/query/web-analytics/visits/count');
  url.searchParams.set('projectId', projectId);
  const teamId = getVercelTeamId(env);
  if (teamId) url.searchParams.set('teamId', teamId);
  if (since) url.searchParams.set('since', since);
  if (until) url.searchParams.set('until', until);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch (_err) {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        totalVisitors: null,
        status: 'api-error',
        reason: payload?.error?.message || payload?.message || `Vercel API trả về HTTP ${response.status}`,
        httpStatus: response.status,
      };
    }

    const totalVisitors = extractVercelVisitorCount(payload);
    if (totalVisitors === null) {
      return {
        ok: false,
        totalVisitors: null,
        status: 'invalid-response',
        reason: 'Vercel API trả về payload không có trường visitors/total/count.',
        httpStatus: response.status,
      };
    }

    return {
      ok: true,
      totalVisitors,
      time: payload.query,
      status: 'ok',
      reason: 'vercel-api',
      httpStatus: response.status,
    };
  } catch (err) {
    return {
      ok: false,
      totalVisitors: null,
      status: 'api-error',
      reason: err?.message || 'Không thể kết nối tới Vercel Analytics API.',
      httpStatus: null,
    };
  }
}

async function fetchVercelAnalyticsSnapshot(env = process.env) {
  const teamId = getVercelTeamId(env);
  const token = getVercelToken(env);
  const projectId = getVercelProjectId(env);
  if (!token || !projectId) {
    return {
      ok: false,
      todayVisitors: null,
      totalVisitors: resolveTotalVisitors(env),
      status: 'missing-config',
      reason: 'Thiếu VERCEL_TOKEN hoặc VERCEL_PROJECT_ID',
    };
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const safeEnv = { ...env, VERCEL_TEAM_ID: teamId };
  const todayQuery = fetchVercelAnalyticsRange(safeEnv, todayStart.toISOString(), todayEnd.toISOString());
  const totalQuery = fetchVercelAnalyticsRange(safeEnv);

  let todayResult;
  let totalResult;

  try {
    [todayResult, totalResult] = await Promise.all([todayQuery, totalQuery]);
  } catch (error) {
    return {
      ok: false,
      todayVisitors: null,
      totalVisitors: resolveTotalVisitors(env),
      status: 'api-error',
      reason: error?.message || 'Không thể truy vấn Vercel Analytics.',
    };
  }

  if (todayResult.ok && totalResult.ok) {
    return {
      ok: true,
      todayVisitors: todayResult.totalVisitors,
      totalVisitors: totalResult.totalVisitors,
      status: 'ok',
      reason: 'vercel-api',
    };
  }

  if (!totalResult.ok && totalResult.httpStatus === 400) {
    const fallbackSince = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const fallbackUntil = new Date().toISOString();
    const fallbackTotal = await fetchVercelAnalyticsRange(safeEnv, fallbackSince, fallbackUntil);

    if (fallbackTotal.ok) {
      return {
        ok: true,
        todayVisitors: todayResult.totalVisitors ?? null,
        totalVisitors: fallbackTotal.totalVisitors,
        status: 'ok',
        reason: 'vercel-api',
      };
    }
  }

  return {
    ok: false,
    todayVisitors: todayResult.totalVisitors ?? null,
    totalVisitors: totalResult.totalVisitors ?? resolveTotalVisitors(env),
    status: totalResult.status === 'ok' || todayResult.status === 'ok' ? 'partial-data' : 'api-error',
    reason: todayResult.status === 'ok' ? todayResult.reason : totalResult.reason || 'Không có dữ liệu Vercel Analytics.',
  };
}

export {
  VISITOR_ENV_KEYS,
  parseVisitorCount,
  resolveTotalVisitors,
  extractVercelVisitorCount,
  getVercelProjectId,
  getVercelToken,
  getVercelTeamId,
  getVercelAnalyticsConfigStatus,
  fetchVercelAnalyticsRange,
  fetchVercelAnalyticsSnapshot,
};
