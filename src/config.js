import 'dotenv/config';

const env = process.env || {};

const config = {
  env,
  port: Number.parseInt(env.PORT || '3000', 10) || 3000,
  host: env.HOST || '0.0.0.0',
  vercel: {
    token: env.VERCEL_TOKEN || env.VERCEL_ACCESS_TOKEN || env.VERCEL_ANALYTICS_TOKEN || null,
    projectId: env.VERCEL_PROJECT_ID || env.VERCEL_ANALYTICS_PROJECT_ID || env.PROJECT_ID || null,
    teamId: env.VERCEL_TEAM_ID || env.VERCEL_ANALYTICS_TEAM_ID || env.TEAM_ID || null,
  },
  feedback: {
    githubToken: env.GITHUB_FEEDBACK_TOKEN || null,
    githubOwner: 'cusc-ntuan',
    githubRepo: 'TKB_LTT',
  },
};

export { config, env };
