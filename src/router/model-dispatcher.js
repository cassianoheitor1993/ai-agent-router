import { getConfig, getModelConfig } from "../utils/config.js";
import { debug, warn } from "../utils/logger.js";
import { getProvider } from "../providers/openai-provider.js";

let _availableModels = null;

export async function discoverModels() {
  if (_availableModels) return _availableModels;

  try {
    debug("Discovering available models...");
    const provider = getProvider();
    const res = await provider.models();
    _availableModels = (res.data || res.models || []).map((m) => m.id || m);
    debug(`Found ${_availableModels.length} models`);
    return _availableModels;
  } catch (err) {
    warn(`Model discovery failed: ${err.message}. Using defaults.`);
    _availableModels = [];
    return _availableModels;
  }
}

const DEFAULT_MODEL_MAP = {
  project_scaffold: {
    primary: "opencode/deepseek-v4-flash",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  system_design: {
    primary: "opencode/deepseek-v4-pro",
    fallback: ["opencode/deepseek-v4-flash"],
  },
  architecture: {
    primary: "opencode/deepseek-v4-pro",
    fallback: ["opencode/deepseek-v4-flash"],
  },
  backend: {
    primary: "opencode/deepseek-v4-flash",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  frontend: {
    primary: "opencode/deepseek-v4-flash",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  mobile: {
    primary: "opencode/deepseek-v4-flash",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  database: {
    primary: "opencode/deepseek-v4-flash",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  testing: {
    primary: "opencode/deepseek-v4-flash",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  review: {
    primary: "opencode/glm-5",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  docs: {
    primary: "opencode/kimi-k2.6",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  consolidator: {
    primary: "opencode/deepseek-v4-flash",
    fallback: ["opencode/deepseek-v4-pro"],
  },
  fullstack: {
    primary: "opencode/deepseek-v4-pro",
    fallback: ["opencode/deepseek-v4-flash"],
  },
};

export function getModelForStep(stepType, complexity = 3) {
  const available = _availableModels || [];

  const mapped = DEFAULT_MODEL_MAP[stepType] || {
    primary: "deepseek/deepseek-v4-pro",
    fallback: ["deepseek/deepseek-v4-flash"],
  };

  let candidates = [mapped.primary, ...mapped.fallback];

  candidates = candidates.filter((m) => {
    if (available.length === 0) return true;
    return available.some((a) => a.includes(m) || m.includes(a));
  });

  if (candidates.length === 0) {
    candidates = [mapped.primary];
  }

  const resolvedModel = candidates[0];

  const designSteps = ["system_design", "architecture", "review", "fullstack"];
  if (complexity >= 4 && designSteps.includes(stepType) && !resolvedModel.includes("pro")) {
    const proFallback = candidates.find((c) =>
      c.includes("pro") || c.includes("v4-pro")
    );
    if (proFallback) return proFallback;
  }

  return resolvedModel;
}

export function getFallbackChain(stepType) {
  const mapped = DEFAULT_MODEL_MAP[stepType] || {
    primary: "deepseek/deepseek-v4-pro",
    fallback: ["deepseek/deepseek-v4-flash"],
  };
  return [mapped.primary, ...mapped.fallback];
}
