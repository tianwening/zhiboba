import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChatCompletionRequest,
  extractChatCompletionText,
  parseReviewTargets,
} from "./ai-review-providers.mjs";

test("parseReviewTargets defaults to MiniMax when no targets are configured", () => {
  assert.deepEqual(parseReviewTargets(""), [
    {
      name: "minimax-default",
      provider: "minimax",
      model: "MiniMax-M2.7-highspeed",
    },
  ]);
});

test("parseReviewTargets accepts a JSON array of model targets", () => {
  assert.deepEqual(
    parseReviewTargets(
      JSON.stringify([
        { name: "fast", provider: "minimax", model: "MiniMax-M2.7-highspeed" },
        { name: "main", provider: "openai", model: "gpt-5" },
      ])
    ),
    [
      { name: "fast", provider: "minimax", model: "MiniMax-M2.7-highspeed" },
      { name: "main", provider: "openai", model: "gpt-5" },
    ]
  );
});

test("buildChatCompletionRequest creates an OpenAI-compatible request", () => {
  const request = buildChatCompletionRequest(
    { provider: "minimax", model: "MiniMax-M2.7-highspeed" },
    "system prompt",
    "diff summary"
  );

  assert.equal(request.url, "https://api.minimaxi.com/v1/chat/completions");
  assert.deepEqual(request.body, {
    model: "MiniMax-M2.7-highspeed",
    messages: [
      { role: "system", content: "system prompt" },
      { role: "user", content: "diff summary" },
    ],
    max_tokens: 3000,
  });
});

test("extractChatCompletionText reads the first assistant message", () => {
  assert.equal(
    extractChatCompletionText({
      choices: [{ message: { content: "review result" } }],
    }),
    "review result"
  );
});

test("extractChatCompletionText removes leading think blocks", () => {
  assert.equal(
    extractChatCompletionText({
      choices: [{ message: { content: "<think>internal reasoning</think>\n\nreview result" } }],
    }),
    "review result"
  );
});
