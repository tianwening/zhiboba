import {
  buildChatCompletionRequest,
  extractChatCompletionText,
  getProvider,
  parseReviewTargets,
} from "./ai-review-providers.mjs";

const githubToken = process.env.GITHUB_TOKEN;
const repoName = process.env.GITHUB_REPOSITORY;
const eventPath = process.env.GITHUB_EVENT_PATH;
const reviewTargets = parseReviewTargets(process.env.AI_REVIEW_TARGETS || "");

const reviewMarker = "<!-- ai-pr-review:multi-model -->";
const maxPatchChars = 120000;
const systemPrompt = `你是资深代码审计工程师，正在审查一个中文体育赛事聚合站的 GitHub PR。

只根据给定 diff 输出审计结论，不要臆测未展示代码。优先发现会导致线上缺陷、安全问题、数据损坏、Next.js/React 运行时问题、PostgreSQL SQL 注入或参数绑定错误、Netlify 部署问题、密钥泄露、测试缺口的内容。

输出中文 Markdown，结构固定为：
1. **结论**：一句话说明是否有阻塞问题。
2. **必须处理**：列出高置信度阻塞问题；如果没有，写“未发现”。
3. **建议处理**：列出非阻塞但值得修的事项；如果没有，写“未发现”。
4. **验证建议**：列出应该运行的命令或手动验证点。

每条问题都必须包含文件路径和原因。避免泛泛而谈，避免对纯样式偏好给出阻塞意见。`;

if (!githubToken) {
  throw new Error("GITHUB_TOKEN is required.");
}

if (!repoName) {
  throw new Error("GITHUB_REPOSITORY is required.");
}

if (!eventPath) {
  throw new Error("GITHUB_EVENT_PATH is required.");
}

const event = await readJson(eventPath);
const pullRequest = event.pull_request;

if (!pullRequest) {
  throw new Error("This workflow must run on a pull_request event.");
}

const [owner, repo] = repoName.split("/");
const prNumber = pullRequest.number;

const missingApiKeyMessages = getMissingApiKeyMessages(reviewTargets);

if (missingApiKeyMessages.length > 0) {
  await upsertPrComment(
    `${reviewMarker}
## AI 代码审计未运行

缺少以下 GitHub Actions secrets：

${missingApiKeyMessages.map((message) => `- ${message}`).join("\n")}

请在 GitHub 仓库 Settings -> Secrets and variables -> Actions 中补齐后重新触发 PR。`
  );
  process.exit(0);
}

const files = await listPullRequestFiles();
const diffSummary = buildDiffSummary(files);
const reviewResults = await runAiReviews(diffSummary);

await upsertPrComment(`${reviewMarker}
## AI 代码审计

${formatReviewResults(reviewResults)}`);

if (reviewResults.every((result) => !result.ok)) {
  throw new Error("All configured AI review targets failed.");
}


async function readJson(path) {
  const fs = await import("node:fs/promises");
  return JSON.parse(await fs.readFile(path, "utf8"));
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "User-Agent": "zhiboba-ai-pr-review",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function listPullRequestFiles() {
  const results = [];

  for (let page = 1; page <= 10; page += 1) {
    const batch = await githubRequest(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`
    );

    results.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  return results;
}

function buildDiffSummary(files) {
  let remaining = maxPatchChars;
  const sections = [];
  const omitted = [];

  for (const file of files) {
    const patch = file.patch || "";
    const header = [
      `File: ${file.filename}`,
      `Status: ${file.status}`,
      `Changes: +${file.additions} -${file.deletions}`,
    ].join("\n");
    const patchBlock = patch ? `\n\`\`\`diff\n${patch}\n\`\`\`` : "\n[Patch unavailable from GitHub API.]";
    const section = `${header}${patchBlock}`;

    if (section.length > remaining) {
      omitted.push(`${file.filename} (+${file.additions} -${file.deletions})`);
      continue;
    }

    sections.push(section);
    remaining -= section.length;
  }

  const changedFiles = files
    .map((file) => `- ${file.filename} (${file.status}, +${file.additions} -${file.deletions})`)
    .join("\n");

  const omittedText = omitted.length
    ? `\n\nOmitted because of size limits:\n${omitted.map((file) => `- ${file}`).join("\n")}`
    : "";

  return `Repository: ${repoName}
Pull request: #${prNumber} ${pullRequest.title}
Base branch: ${pullRequest.base.ref}
Head branch: ${pullRequest.head.ref}
Author: ${pullRequest.user?.login || "unknown"}

PR body:
${pullRequest.body || "[empty]"}

Changed files:
${changedFiles || "[none]"}

Diff:
${sections.join("\n\n---\n\n") || "[empty]"}${omittedText}`;
}

async function runAiReviews(diffSummary) {
  const results = [];

  for (const target of reviewTargets) {
    try {
      const text = await requestAiReview(target, diffSummary);
      results.push({
        ...target,
        ok: true,
        text,
      });
    } catch (error) {
      results.push({
        ...target,
        ok: false,
        text: error.message,
      });
    }
  }

  return results;
}

async function requestAiReview(target, diffSummary) {
  const provider = getProvider(target);
  const apiKey = process.env[provider.apiKeyEnv];
  const { url, body } = buildChatCompletionRequest(target, systemPrompt, diffSummary);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `${target.name} API ${response.status} ${response.statusText}: ${errorBody}`
    );
  }

  const data = await response.json();
  const text = extractChatCompletionText(data);

  if (!text) {
    throw new Error(`${target.name} response did not contain output text.`);
  }

  return text.trim();
}

function getMissingApiKeyMessages(targets) {
  const seen = new Set();
  const messages = [];

  for (const target of targets) {
    const provider = getProvider(target);

    if (process.env[provider.apiKeyEnv] || seen.has(provider.apiKeyEnv)) {
      continue;
    }

    seen.add(provider.apiKeyEnv);
    messages.push(`\`${provider.apiKeyEnv}\`，用于 \`${target.provider}\` provider。`);
  }

  return messages;
}

function formatReviewResults(results) {
  return results
    .map((result) => {
      const heading = `### ${result.name}\n\nProvider：\`${result.provider}\`  \n模型：\`${result.model}\``;

      if (!result.ok) {
        return `${heading}\n\n调用失败：\n\n\`\`\`text\n${result.text}\n\`\`\``;
      }

      return `${heading}\n\n${result.text}`;
    })
    .join("\n\n---\n\n");
}

async function upsertPrComment(body) {
  const comments = await githubRequest(
    `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`
  );

  const previous = comments.find(
    (comment) => comment.user?.type === "Bot" && comment.body?.includes(reviewMarker)
  );

  if (previous) {
    await githubRequest(`/repos/${owner}/${repo}/issues/comments/${previous.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });
    return;
  }

  await githubRequest(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
}
