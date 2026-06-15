import { warn, debug } from "../utils/logger.js";

export function parsePlanFromMarkdown(content) {
  const result = {
    analysis: "",
    steps: [],
    risks: [],
    raw: content,
  };

  const analysisMatch = content.match(/##\s*ANALYSIS\s*\n([\s\S]*?)(?=##\s*PLAN|$)/i);
  if (analysisMatch) {
    result.analysis = analysisMatch[1].trim();
  }

  const risksMatch = content.match(/##\s*RISKS\s*\n([\s\S]*?)$/i);
  if (risksMatch) {
    result.risks = risksMatch[1]
      .trim()
      .split("\n")
      .filter((l) => l.trim().startsWith("-"))
      .map((l) => l.replace(/^-\s*/, "").trim());
  }

  const tableMatch = content.match(/\|\s*#\s*\|[\s\S]*?\n([\s\S]*?)(?=\n\n|##|$)/);
  if (!tableMatch && !content.includes("| # |")) {
    debug("No plan table found in AI output");
    return result;
  }

  const lines = content.split("\n");
  let inTable = false;
  let headerFound = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.includes("| # |") && trimmed.includes("Action") && trimmed.includes("Files")) {
      inTable = true;
      headerFound = true;
      continue;
    }

    if (headerFound && trimmed.startsWith("|---")) {
      continue;
    }

    if (!inTable) continue;

    if (!trimmed.startsWith("|") || trimmed.startsWith("|-")) {
      if (headerFound && !trimmed.startsWith("|")) {
        inTable = false;
        headerFound = false;
      }
      continue;
    }

    const step = parseTableRow(trimmed);
    if (step) {
      result.steps.push(step);
    }
  }

  return result;
}

function parseTableRow(row) {
  const cells = row
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (cells.length < 4) return null;

  const stepNum = cells[0];
  if (!/^\d+$/.test(stepNum)) return null;

  const action = cells[1] || "";
  if (!action || action.length < 3) return null;

  const rawFiles = cells[2] || "";
  const files = extractFiles(rawFiles);

  const actionType = classifyAction(action, files);
  const depsRaw = cells[3] || "";
  const deps = parseDependencies(depsRaw);
  const model = (cells[4] || "deepseek-v4-flash").trim();
  const estLines = cells[5] ? parseInt(cells[5], 10) || 0 : 0;

  return {
    type: actionType,
    target: actionType,
    description: action,
    files,
    dependencies: deps,
    model: normalizeModel(model),
    estimatedLines: estLines,
  };
}

function classifyAction(action, files = []) {
  const lower = action.toLowerCase();
  const allFiles = files.join(" ").toLowerCase();
  const scores = {};

  const patterns = {
    project_scaffold: [
      "monorepo", "workspace", "initialize package.json", "scaffold root",
      "root directory", "root monorepo", "root `.gitignore`", "root `.env",
      "initialize nestjs project", "initialize next",
      "create root", "add root", "setup root", "bootstrap root",
    ],
    system_design: [
      "architecture document", "design document", "system overview",
      "architecture diagram", "module boundaries",
    ],
    database: [
      "prisma", "schema", "database model", "migration",
      "entity", "relation", "datasource", "generator",
      "initialize schema", "seed",
    ],
    backend: [
      "controller", "service", "middleware", "route",
      "endpoint", "api", "nestjs", "express", "fastify",
      "module", "dto", "guard", "pipe", "interceptor",
      "exception filter", "validation", "auth module",
      "app module", "database config", "configuration module",
      "feature module", "business logic", "crud",
      "create auth", "create user", "implement auth",
    ],
    mobile: [
      "expo router", "react native expo", "react-native",
      "navigation", "navigator", "stack navigator",
      "tab navigator", "expo", "mobile", "ios", "android",
    ],
    frontend: [
      "component", "page", "ui component", "style",
      "tailwind", "css", "layout", "spa", "vite",
      "react component", "hook", "context",
      "next.js page", "client component", "screen",
    ],
    review: [
      "review", "audit", "security audit", "code quality",
      "vulnerability", "performance review",
    ],
    docs: [
      "documentation", "readme", "api docs", "changelog",
      "architecture decision", "contributing",
    ],
    testing: [
      "test", "unit test", "integration test", "e2e",
      "jest", "vitest", "pytest", "mock",
    ],
  };

  for (const [type, keywords] of Object.entries(patterns)) {
    scores[type] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[type] += kw.split(" ").length;
      }
    }
  }

  if (allFiles.includes("packages/mobile") || allFiles.includes("/mobile/") || allFiles.includes("app.json")) {
    scores.mobile = (scores.mobile || 0) + 10;
  }
  if (allFiles.includes("prisma/schema") || allFiles.includes("migration")) {
    scores.database = (scores.database || 0) + 5;
  }
  if (allFiles.includes("package.json") || allFiles.includes(".gitignore") || allFiles.includes("tsconfig")) {
    scores.project_scaffold = (scores.project_scaffold || 0) + 3;
  }

  let best = "backend";
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }

  if (bestScore === 0 && lower.includes("expo") && (lower.includes("init") || lower.includes("create"))) {
    return "project_scaffold";
  }

  return best;
}

function extractFiles(raw) {
  const paths = [];
  const matches = raw.match(/`([^`]+)`/g);
  if (matches) {
    for (const m of matches) {
      paths.push(m.replace(/`/g, "").trim());
    }
  }
  if (paths.length === 0 && raw.trim() && raw.trim() !== "—" && raw.trim() !== "-") {
    paths.push(...raw.split(",").map((p) => p.trim()).filter((p) => p && p !== "—" && p !== "-"));
  }
  return paths;
}

function parseDependencies(raw) {
  if (!raw || raw.trim() === "—" || raw.trim() === "-" || raw.trim() === "none") {
    return [];
  }
  const nums = raw.match(/\d+/g);
  if (!nums) return [];
  return nums.map((n) => `step_${n}`);
}

function normalizeModel(model) {
  const m = model.toLowerCase().trim();
  if (m.includes("pro") || m.includes("v4-pro")) return "opencode/deepseek-v4-pro";
  if (m.includes("flash") || m.includes("v4-flash")) return "opencode/deepseek-v4-flash";
  if (m.includes("glm") || m.includes("glm-5")) return "opencode/glm-5";
  if (m.includes("kimi") || m.includes("kimi-k2")) return "opencode/kimi-k2.6";
  return `opencode/${m}`;
}

export function planStepsToDAG(parsedSteps) {
  const steps = [];
  const idMap = {};
  let counter = 0;

  for (let i = 0; i < parsedSteps.length; i++) {
    const ps = parsedSteps[i];
    const stepNum = i + 1;
    const stepId = `step_${++counter}`;
    idMap[`#${stepNum}`] = stepId;
    idMap[`step_${stepNum}`] = stepId;

    steps.push({
      id: stepId,
      type: ps.type,
      target: ps.target || ps.type,
      description: ps.description,
      dependencies: [],
      _rawDeps: ps.dependencies,
      model: ps.model,
      estimatedLines: ps.estimatedLines || 0,
      files: ps.files || [],
      status: "pending",
      output: null,
      artifacts: [],
      error: null,
    });
  }

  for (const step of steps) {
    step.dependencies = (step._rawDeps || [])
      .map((d) => {
        const resolved = idMap[d];
        if (resolved) return resolved;

        const numMatch = String(d).match(/\d+/);
        if (numMatch) {
          const n = parseInt(numMatch[0], 10);
          for (const [key, val] of Object.entries(idMap)) {
            if (key.includes(String(n))) return val;
          }
        }
        return null;
      })
      .filter(Boolean);
    delete step._rawDeps;
  }

  return steps;
}
