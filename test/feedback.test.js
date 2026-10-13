import test from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/config.js';
import { createFeedbackIssue, validateFeedback } from '../src/services/feedback.service.js';

test('validateFeedback trims and validates public feedback fields', () => {
  assert.deepEqual(validateFeedback({
    type: 'bug',
    title: '  Lỗi bộ lọc  ',
    message: '  Bộ lọc không hiển thị kết quả đúng.  ',
  }), {
    value: {
      type: 'bug',
      title: 'Lỗi bộ lọc',
      message: 'Bộ lọc không hiển thị kết quả đúng.',
    },
  });
  assert.match(validateFeedback({ type: 'unknown', title: 'Lỗi', message: 'Nội dung đủ dài.' }).error, /loại góp ý/);
  assert.match(validateFeedback({ type: 'bug', title: 'a', message: 'Nội dung đủ dài.' }).error, /Tiêu đề/);
  assert.match(validateFeedback({ type: 'bug', title: 'Lỗi hợp lệ', message: 'ngắn' }).error, /Nội dung/);
});

test('createFeedbackIssue sends feedback to the fixed GitHub issues API', async () => {
  let request;
  const issue = await createFeedbackIssue(
    { type: 'suggestion', title: 'Thêm bộ lọc', message: 'Mong có bộ lọc theo phòng học.' },
    {
      token: 'test-token',
      owner: 'cusc-ntuan',
      repo: 'TKB_LTT',
      fetchImpl: async (url, options) => {
        request = { url, options };
        return {
          ok: true,
          json: async () => ({ number: 42, html_url: 'https://github.com/cusc-ntuan/TKB_LTT/issues/42' }),
        };
      },
    }
  );

  assert.equal(request.url, 'https://api.github.com/repos/cusc-ntuan/TKB_LTT/issues');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(request.options.body), {
    title: '[Góp ý] Thêm bộ lọc',
    body: 'Mong có bộ lọc theo phòng học.\n\n---\nGửi từ chức năng góp ý trên website TKB.',
  });
  assert.deepEqual(issue, { number: 42, url: 'https://github.com/cusc-ntuan/TKB_LTT/issues/42' });
});

test('createFeedbackIssue reports missing configuration and GitHub failures', async () => {
  await assert.rejects(
    createFeedbackIssue({ type: 'other', title: 'Góp ý', message: 'Nội dung góp ý đầy đủ.' }, {
      owner: 'cusc-ntuan',
      repo: 'TKB_LTT',
    }),
    { status: 503 }
  );

  await assert.rejects(
    createFeedbackIssue({ type: 'other', title: 'Góp ý', message: 'Nội dung góp ý đầy đủ.' }, {
      token: 'test-token',
      owner: 'cusc-ntuan',
      repo: 'TKB_LTT',
      fetchImpl: async () => ({ ok: false, status: 403 }),
    }),
    { status: 502 }
  );
});

test('feedback configuration is passed to the GitHub issue service', async () => {
  let requestUrl;
  const issue = await createFeedbackIssue(
    { type: 'other', title: 'Góp ý', message: 'Nội dung góp ý đầy đủ.' },
    {
      ...config.feedback,
      token: 'test-token',
      fetchImpl: async (url) => {
        requestUrl = url;
        return {
          ok: true,
          json: async () => ({ number: 13, html_url: 'https://github.com/cusc-ntuan/TKB_LTT/issues/13' }),
        };
      },
    }
  );

  assert.equal(requestUrl, 'https://api.github.com/repos/cusc-ntuan/TKB_LTT/issues');
  assert.equal(issue.number, 13);
});
