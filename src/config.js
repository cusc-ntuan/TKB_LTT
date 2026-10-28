import 'dotenv/config';

const env = process.env || {};

const config = {
  env,
  port: Number.parseInt(env.PORT || '3000', 10) || 3000,
  host: env.HOST || '0.0.0.0',
  database: {
    turso: {
      url: env.TURSO_DATABASE_URL?.trim() || null,
      authToken: env.TURSO_AUTH_TOKEN?.trim() || null,
    },
  },
  vercel: {
    token: env.VERCEL_TOKEN || env.VERCEL_ACCESS_TOKEN || env.VERCEL_ANALYTICS_TOKEN || null,
    projectId: env.VERCEL_PROJECT_ID || env.VERCEL_ANALYTICS_PROJECT_ID || env.PROJECT_ID || null,
    teamId: env.VERCEL_TEAM_ID || env.VERCEL_ANALYTICS_TEAM_ID || env.TEAM_ID || null,
  },
  feedback: {
    token: env.GITHUB_FEEDBACK_TOKEN || null,
    owner: 'cusc-ntuan',
    repo: 'TKB_LTT',
  },
  admin: {
    username: env.ADMIN_USERNAME || null,
    password: env.ADMIN_PASSWORD || null,
    sessionSecret: env.ADMIN_SESSION_SECRET || 'tkb_secret',
    cookieName: env.ADMIN_COOKIE_NAME || 'tkb_session',
  },
};

export { config, env };
