import { getStepTemplatesForTask } from "./step-templates.js";
import { getModelForStep } from "../router/model-dispatcher.js";
import { parsePlanFromMarkdown, planStepsToDAG } from "./plan-parser.js";
import { getProvider } from "../providers/openai-provider.js";
import { getConfig } from "../utils/config.js";
import { debug, warn, info } from "../utils/logger.js";
import chalk from "chalk";

let stepCounter = 0;

export function createExecutionPlan(taskClassification, projectInfo, stackRecommendation, requirements = null) {
  stepCounter = 0;

  const { category, complexity, domains } = taskClassification;

  const features = [];

  if (requirements?.needMobile) {
    features.push("mobile");
  }

  if (requirements?.productType === "fullstack" || requirements?.productType === "web-app") {
    features.push("backend");
    features.push("frontend");
  } else if (projectInfo.exists) {
    features.push("backend");
    if (projectInfo.type?.includes("next") || projectInfo.type?.includes("react")) {
      features.push("frontend");
    }
  } else if (stackRecommendation) {
    if (stackRecommendation.primary?.backend) features.push("backend");
    if (stackRecommendation.primary?.frontend) features.push("frontend");
    if (stackRecommendation.primary?.mobile) features.push("mobile");
  }

  const templates = getStepTemplatesForTask(category, complexity, features);

  const keyToStepId = {};
  const steps = templates.map((template, idx) => {
    const stepId = `step_${++stepCounter}`;
    if (template._key) keyToStepId[template._key] = stepId;
    return {
      id: stepId,
      _idx: idx,
      _key: template._key,
      type: template.type,
      target: template.target,
      description: template.description,
      dependencies: (template.dependencies || []).map((depName) => {
        return keyToStepId[depName] || depName;
      }),
      model: getModelForStep(template.type, template.complexity),
      status: "pending",
      output: null,
      artifacts: [],
      error: null,
    };
  });

  for (const step of steps) {
    step.dependencies = step.dependencies.map((dep) => keyToStepId[dep] || dep);
  }

  const parallelGroups = computeParallelGroups(steps);

  debug(`DAG created: ${steps.length} steps, ${parallelGroups.length} waves`);

  return {
    steps,
    parallelGroups,
    metadata: {
      category,
      complexity,
      stepCount: steps.length,
      waveCount: parallelGroups.length,
    },
  };
}

export async function createAIPlan(context) {
  const provider = getProvider();
  const config = getConfig();

  const systemPrompt = `You are an AI Software Planning Specialist. Your job is to analyze a codebase and a user's task, then produce a DETAILED, ATOMIC execution plan.

CRITICAL RULES:
1. YOU DO NOT WRITE CODE. You only produce a plan.
2. Every step must reference EXACT file paths that exist or will be created.
3. Break the task into the smallest atomic units possible.
4. Steps that don't share dependencies should be marked for parallel execution.
5. For existing projects: analyze the current file structure and reference real files.
6. For new projects: design the complete file tree structure.
7. Each step should touch at most 5 files.

OUTPUT FORMAT (STRICT — follow exactly):

## ANALYSIS
[2-3 sentences summarizing: current codebase state, what's already implemented, what needs to change]

## PLAN
| # | Action | Files | Dependencies | Model | Est. Lines |
|---|--------|-------|-------------|-------|-----------|
| 1 | Create: auth DTO with Zod validation | \`src/auth/dto/login.dto.ts\` | — | deepseek-v4-flash | 45 |

## RISKS
- Risk description: mitigation strategy`;

  let userPrompt = "";

  if (context.project?.exists) {
    userPrompt += `## EXISTING CODEBASE\n`;
    userPrompt += `- Type: ${context.project.type || "unknown"}\n`;
    userPrompt += `- Architecture: ${context.project.architecture || "unknown"}\n`;
    userPrompt += `- Language: ${context.project.language || "unknown"}\n`;
    userPrompt += `- Framework: ${context.project.framework || "none"}\n`;
    userPrompt += `- Modules: ${context.project.modules?.join(", ") || "none"}\n`;
    userPrompt += `- Database: ${context.project.database || "none"}\n`;
    userPrompt += `- Queue: ${context.project.queue || "none"}\n`;

    if (context.project.structure?.length) {
      userPrompt += `\n### Project File Tree\n\`\`\`\n${buildTreeSummary(context.project.structure, "")}\`\`\`\n\n`;
    }
  } else {
    userPrompt += `## NEW PROJECT (greenfield)\nNo existing codebase. Design the file tree from scratch.\n\n`;
  }

  if (context.requirements) {
    const req = context.requirements;
    userPrompt += `## REQUIREMENTS\n- Type: ${req.productType}\n- Goal: ${req.goal}\n`;
    if (req.features?.length) userPrompt += `- Features: ${req.features.join(", ")}\n`;
    if (req.needMobile) userPrompt += `- Mobile App: Yes\n`;
    userPrompt += `\n`;
  }

  if (context.stack?.primary) {
    const s = context.stack.primary;
    userPrompt += `## TECH STACK (MUST USE — DO NOT SUBSTITUTE)\n`;
    if (s.backend) userPrompt += `- Backend: ${s.backend}\n`;
    if (s.frontend) userPrompt += `- Frontend: ${s.frontend}\n`;
    if (s.mobile) userPrompt += `- Mobile: ${s.mobile}\n`;
    if (s.database) userPrompt += `- Database: ${s.database}\n`;
    if (s.orm) userPrompt += `- ORM: ${s.orm}\n`;
    if (s.queue) userPrompt += `- Queue: ${s.queue}\n`;
    userPrompt += `- Language: ${s.language || "TypeScript"}\n\n`;
  }

  if (context.classification) {
    userPrompt += `## TASK CLASSIFICATION\n- Category: ${context.classification.category}\n- Complexity: ${context.classification.complexity}/5\n\n`;
  }

  userPrompt += `## USER TASK\n${context.userTask}\n\n`;

  userPrompt += `Analyze and produce the execution plan in the EXACT format specified. Use real file paths.`;

  const maxRetries = 2;
  let lastOutput = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const retryHint = attempt > 0
      ? `\n\n[RETRY] Previous output format was invalid. You MUST include ## ANALYSIS, ## PLAN with a markdown table, and ## RISKS sections.`
      : "";

    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt + retryHint },
      ];

      process.stderr.write(chalk.cyan(`  ▶ AI Planning        ${chalk.gray(`[deepseek-v4-pro]`)}  `));

      const startTime = Date.now();
      const response = await provider.chat(messages, {
        model: "opencode/deepseek-v4-pro",
        temperature: 0.3,
        max_tokens: 4096,
      });
      const durationMs = Date.now() - startTime;

      const content = response.choices?.[0]?.message?.content || "";
      lastOutput = content;

      const parsed = parsePlanFromMarkdown(content);

      if (parsed.steps.length > 0) {
        const steps = planStepsToDAG(parsed.steps);
        postProcessPlan(steps);

        const parallelGroups = computeParallelGroups(steps);

        process.stderr.write(
          `\r  ${chalk.green("✓")} AI Planning        ${chalk.gray(`[deepseek-v4-pro]`)}  ${chalk.white(`${steps.length} steps · ${parallelGroups.length} waves`.padEnd(45))} ${chalk.gray(formatDuration(durationMs))}  \n`
        );

        return {
          steps,
          parallelGroups,
          analysis: parsed.analysis,
          risks: parsed.risks,
          metadata: {
            category: context.classification?.category || "fullstack",
            complexity: context.classification?.complexity || 3,
            stepCount: steps.length,
            waveCount: parallelGroups.length,
            aiGenerated: true,
          },
        };
      }

      if (attempt < maxRetries) {
        warn(`AI plan had no parseable steps (attempt ${attempt + 1}). Retrying...`);
      }

    } catch (err) {
      if (attempt < maxRetries) {
        warn(`AI planning error (attempt ${attempt + 1}): ${err.message}. Retrying...`);
      } else {
        warn(`AI planning failed after ${maxRetries + 1} attempts: ${err.message}`);
      }
    }
  }

  process.stderr.write(`\r  ${chalk.yellow("⚠")} AI Planning        ${chalk.gray(`[fallback]`)}  using template-based plan\n`);

  return null;
}

const MODEL_RULES = {
  system_design: "opencode/deepseek-v4-pro",
  architecture: "opencode/deepseek-v4-pro",
  backend: "opencode/deepseek-v4-flash",
  frontend: "opencode/deepseek-v4-flash",
  mobile: "opencode/deepseek-v4-flash",
  database: "opencode/deepseek-v4-flash",
  testing: "opencode/deepseek-v4-flash",
  project_scaffold: "opencode/deepseek-v4-flash",
  review: "opencode/glm-5",
  docs: "opencode/kimi-k2.6",
};

function postProcessPlan(steps) {
  for (const step of steps) {
    const expected = MODEL_RULES[step.type];
    if (expected && step.model !== expected) {
      const currentModel = step.model?.split("/").pop();
      step.model = expected;
    }
  }

  const hasReview = steps.some((s) => s.type === "review");
  const hasDocs = steps.some((s) => s.type === "docs");

  if (!hasReview && steps.length > 1) {
    const codeSteps = steps.filter((s) =>
      ["backend", "frontend", "mobile", "database"].includes(s.type)
    );
    const deps = [
      ...new Set(
        ["backend", "mobile", "database", "frontend"]
          .map((cat) => codeSteps.filter((s) => s.type === cat).pop())
          .filter(Boolean)
          .map((s) => s.id)
      ),
    ];

    const newId = `step_${steps.length + 1}`;

    steps.push({
      id: newId,
      type: "review",
      target: "quality",
      description: "Review: code quality and security audit of all generated files",
      dependencies: deps,
      model: "opencode/glm-5",
      status: "pending",
      output: null,
      artifacts: [],
      error: null,
      files: [],
    });
  }

  if (!hasDocs) {
    const reviewStep = steps.find((s) => s.type === "review");
    const deps = reviewStep ? [reviewStep.id] : [];
    const newId = `step_${steps.length + 1}`;

    steps.push({
      id: newId,
      type: "docs",
      target: "documentation",
      description: "Docs: generate README, API documentation, and architecture docs",
      dependencies: deps,
      model: "opencode/kimi-k2.6",
      status: "pending",
      output: null,
      artifacts: [],
      error: null,
      files: [],
    });
  }
}

export { computeParallelGroups };

function computeParallelGroups(steps) {
  const completed = new Set();
  const groups = [];
  const remaining = new Set(steps.map((s) => s.id));

  while (remaining.size > 0) {
    const wave = [];

    for (const step of steps) {
      if (!remaining.has(step.id)) continue;

      const depsDone = step.dependencies.every(
        (depId) =>
          !remaining.has(depId) ||
          completed.has(depId)
      );

      if (depsDone) {
        wave.push(step.id);
      }
    }

    if (wave.length === 0) {
      for (const id of remaining) {
        wave.push(id);
      }
    }

    for (const id of wave) {
      remaining.delete(id);
      completed.add(id);
    }

    groups.push(wave);
  }

  return groups;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildTreeSummary(items, indent) {
  let out = "";
  for (const item of (items || []).slice(0, 40)) {
    if (item.type === "dir") {
      out += `${indent}${item.name}/\n`;
      if (item.children) {
        out += buildTreeSummary(item.children.slice(0, 10), indent + "  ");
      }
    } else {
      out += `${indent}${item.name}\n`;
    }
  }
  if (items?.length > 40) {
    out += `${indent}... (${items.length - 40} more)\n`;
  }
  return out;
}
