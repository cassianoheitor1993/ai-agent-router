import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const installDir = resolve(__dirname, "..", "..");

const envPath = resolve(installDir, ".env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const DEFAULTS = {
  OPENAI_BASE_URL: "http://localhost:4096/v1",
  OPENAI_API_KEY: "sk-local-dev",
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  MAX_TOKENS_DEFAULT: 4096,
  TEMPERATURE_DEFAULT: 0.7,
};

const MAX_TOKENS_PER_STEP = {
  system_design: 4096,
  architecture: 4096,
  project_scaffold: 4096,
  backend_scaffold: 8192,
  backend_routes: 8192,
  backend_services: 8192,
  database_schema: 4096,
  frontend_scaffold: 8192,
  frontend_pages: 8192,
  frontend_integration: 8192,
  mobile_scaffold: 8192,
  mobile_screens: 8192,
  mobile_integration: 8192,
  testing: 4096,
  review: 4096,
  docs: 4096,
  consolidator: 4096,
};

export function getMaxTokensForStep(stepType) {
  return MAX_TOKENS_PER_STEP[stepType] || 4096;
}

const MODEL_DEFAULTS = {
  MODEL_SYSTEM_DESIGN: "opencode/deepseek-v4-pro",
  MODEL_ARCHITECTURE: "opencode/deepseek-v4-pro",
  MODEL_PROJECT_SCAFFOLD: "opencode/deepseek-v4-flash",
  MODEL_BACKEND: "opencode/deepseek-v4-flash",
  MODEL_FRONTEND: "opencode/deepseek-v4-flash",
  MODEL_MOBILE: "opencode/deepseek-v4-flash",
  MODEL_DATABASE: "opencode/deepseek-v4-flash",
  MODEL_TESTING: "opencode/deepseek-v4-flash",
  MODEL_REVIEW: "opencode/glm-5",
  MODEL_DOCS: "opencode/kimi-k2.6",
  MODEL_CONSOLIDATOR: "opencode/deepseek-v4-flash",
};

let _config = null;

export function getConfig() {
  if (_config) return _config;

  _config = {};
  for (const [key, def] of Object.entries({ ...DEFAULTS, ...MODEL_DEFAULTS })) {
    _config[key] = process.env[key] || def;
  }

  _config.installDir = installDir;
  _config.rootDir = process.cwd();
  _config.projectDir = process.cwd();
  return _config;
}

export function getModelConfig(stepType) {
  const config = getConfig();
  const key = `MODEL_${stepType.toUpperCase()}`;
  return config[key] || null;
}

export function validateConfig() {
  const config = getConfig();
  const errors = [];

  if (!config.OPENAI_BASE_URL) errors.push("OPENAI_BASE_URL is required");
  if (!config.OPENAI_API_KEY) errors.push("OPENAI_API_KEY is required");

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  return true;
}
