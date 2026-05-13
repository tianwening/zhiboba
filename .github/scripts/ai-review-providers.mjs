const defaultTargets = [
  {
    name: "minimax-default",
    provider: "minimax",
    model: "MiniMax-M2.7",
  },
];

export const providers = {
  minimax: {
    apiKeyEnv: "MINIMAX_API_KEY",
    baseUrl: "https://api.minimaxi.com/v1",
  },
  openai: {
    apiKeyEnv: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
  },
};

export function parseReviewTargets(rawTargets) {
  if (!rawTargets || !rawTargets.trim()) {
    return defaultTargets;
  }

  let parsed;

  try {
    parsed = JSON.parse(rawTargets);
  } catch (error) {
    throw new Error(`AI_REVIEW_TARGETS must be valid JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI_REVIEW_TARGETS must be a non-empty JSON array.");
  }

  return parsed.map((target, index) => normalizeTarget(target, index));
}

export function getProvider(target) {
  const provider = providers[target.provider];

  if (!provider) {
    throw new Error(
      `Unsupported AI review provider "${target.provider}". Supported providers: ${Object.keys(
        providers
      ).join(", ")}.`
    );
  }

  return provider;
}

export function buildChatCompletionRequest(target, systemPrompt, userPrompt) {
  const provider = getProvider(target);

  return {
    url: `${provider.baseUrl}/chat/completions`,
    body: {
      model: target.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3000,
    },
  };
}

export function extractChatCompletionText(response) {
  const content = response?.choices?.[0]?.message?.content || "";
  return stripThinkBlocks(content).trim();
}

function stripThinkBlocks(content) {
  return content.replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, "");
}

function normalizeTarget(target, index) {
  if (!target || typeof target !== "object") {
    throw new Error(`AI_REVIEW_TARGETS[${index}] must be an object.`);
  }

  const provider = normalizeText(target.provider);
  const model = normalizeText(target.model);
  const name = normalizeText(target.name) || `${provider}-${index + 1}`;

  if (!provider) {
    throw new Error(`AI_REVIEW_TARGETS[${index}].provider is required.`);
  }

  if (!model) {
    throw new Error(`AI_REVIEW_TARGETS[${index}].model is required.`);
  }

  getProvider({ provider });

  return {
    name,
    provider,
    model,
  };
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}
