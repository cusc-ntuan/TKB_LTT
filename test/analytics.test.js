import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveTotalVisitors, extractVercelVisitorCount, fetchVercelAnalyticsSnapshot } from '../src/lib/analytics.js';

test('resolveTotalVisitors reads a numeric Vercel count from env', () => {
  assert.equal(resolveTotalVisitors({ VERCEL_ANALYTICS_TOTAL: '128' }), 128);
  assert.equal(resolveTotalVisitors({ VERCEL_TOTAL_VISITORS: ' 256 ' }), 256);
});

test('extractVercelVisitorCount reads the visitors value from a Vercel API payload', () => {
  assert.equal(extractVercelVisitorCount({ data: { visitors: 128 } }), 128);
  assert.equal(extractVercelVisitorCount({ data: [{ visitors: 256 }] }), 256);
  assert.equal(extractVercelVisitorCount({ data: { total: 999 } }), 999);
});

test('fetchVercelAnalyticsSnapshot collects today and total visitors from Vercel range queries', async () => {
  const originalFetch = global.fetch;
  const responses = {
    today: { ok: true, status: 200, text: async () => JSON.stringify({ data: { visitors: 21 } }) },
    total: { ok: true, status: 200, text: async () => JSON.stringify({ data: { visitors: 315 } }) },
  };

  global.fetch = async (url) => {
    const u = String(url);
    if (!u.includes('since=') && !u.includes('until=')) return responses.total;
    return responses.today;
  };

  try {
    const result = await fetchVercelAnalyticsSnapshot({
      VERCEL_TOKEN: 'token',
      VERCEL_PROJECT_ID: 'prj_123',
    });

    assert.equal(result.ok, true);
    assert.equal(result.todayVisitors, 21);
    assert.equal(result.totalVisitors, 315);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchVercelAnalyticsSnapshot avoids overly wide total queries that Vercel rejects with HTTP 400', async () => {
  const originalFetch = global.fetch;
  const responses = {
    today: { ok: true, status: 200, text: async () => JSON.stringify({ data: { visitors: 8 } }) },
    total: { ok: true, status: 200, text: async () => JSON.stringify({ data: { visitors: 142 } }) },
  };

  global.fetch = async (url) => {
    const u = String(url);
    assert.ok(!u.includes('2100-12-31'), 'Vercel total query should not contain an impossible future end date');
    if (!u.includes('since=') && !u.includes('until=')) return responses.total;
    return responses.today;
  };

  try {
    const result = await fetchVercelAnalyticsSnapshot({
      VERCEL_TOKEN: 'token',
      VERCEL_PROJECT_ID: 'prj_123',
    });

    assert.equal(result.ok, true);
    assert.equal(result.todayVisitors, 8);
    assert.equal(result.totalVisitors, 142);
  } finally {
    global.fetch = originalFetch;
  }
});

test('resolveTotalVisitors returns null when no Vercel count is configured', () => {
  assert.equal(resolveTotalVisitors({}), null);
});
