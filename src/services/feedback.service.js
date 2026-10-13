const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 4000;
const FEEDBACK_TYPES = new Set(['suggestion', 'bug', 'other']);
const TYPE_LABELS = {
  suggestion: 'Góp ý',
  bug: 'Báo lỗi',
  other: 'Khác',
};

function validateFeedback(input) {
  const type = typeof input?.type === 'string' ? input.type : '';
  const title = typeof input?.title === 'string' ? input.title.trim() : '';
  const message = typeof input?.message === 'string' ? input.message.trim() : '';

  if (!FEEDBACK_TYPES.has(type)) {
    return { error: 'Vui lòng chọn loại góp ý hợp lệ.' };
  }
  if (title.length < 3 || title.length > MAX_TITLE_LENGTH) {
    return { error: `Tiêu đề phải có từ 3 đến ${MAX_TITLE_LENGTH} ký tự.` };
  }
  if (message.length < 10 || message.length > MAX_MESSAGE_LENGTH) {
    return { error: `Nội dung phải có từ 10 đến ${MAX_MESSAGE_LENGTH} ký tự.` };
  }

  return { value: { type, title, message } };
}

async function createFeedbackIssue(feedback, { token, owner, repo, fetchImpl = fetch }) {
  if (!token) {
    const error = new Error('Chức năng góp ý chưa được cấu hình.');
    error.status = 503;
    throw error;
  }

  const response = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: `[${TYPE_LABELS[feedback.type]}] ${feedback.title}`,
      body: `${feedback.message}\n\n---\nGửi từ chức năng góp ý trên website TKB.`,
    }),
  });

  if (!response.ok) {
    const error = new Error(
      response.status === 401 || response.status === 403 || response.status === 404
        ? 'Không thể ghi nhận góp ý vào GitHub. Vui lòng thử lại sau.'
        : 'GitHub chưa thể ghi nhận góp ý. Vui lòng thử lại sau.'
    );
    error.status = 502;
    throw error;
  }

  const issue = await response.json();
  if (!Number.isInteger(issue.number) || typeof issue.html_url !== 'string') {
    throw new Error('GitHub trả về phản hồi không hợp lệ khi tạo góp ý.');
  }

  return { number: issue.number, url: issue.html_url };
}

export { createFeedbackIssue, validateFeedback };
