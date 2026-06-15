import { detectProject } from "./detectors/project-detector.js";
import { scanRepository } from "./detectors/repo-scanner.js";
import { collectRequirements } from "./detectors/interactive-collector.js";
import { extractRequirements } from "./detectors/requirement-extractor.js";
import { recommendStack } from "./recommenders/stack-recommender.js";
import { classifyTask } from "./router/task-classifier.js";
import { discoverModels } from "./router/model-dispatcher.js";
import { createExecutionPlan, createAIPlan } from "./planner/dag-planner.js";
import { executePlan } from "./execution/execution-engine.js";
import { ContextManager } from "./execution/context-manager.js";
import { validateConfig } from "./utils/config.js";
import {
  section,
  result,
  info,
  warn,
  error as logError,
} from "./utils/logger.js";
import { requestPlanApproval } from "./utils/interactive-planner.js";
import chalk from "chalk";

export async function orchestrate(userTask) {
  const ctx = new ContextManager();
  const startTime = Date.now();

  try {
    validateConfig();

    section("Phase 1: Project Detection");
    const project = await detectProject();

    if (project.exists) {
      info(`Project detected: ${project.language} / ${project.framework || "unknown"}`);
      result("Language", project.language || "unknown");
      result("Framework", project.framework || "unknown");

      section("Phase 1b: Repository Scan");
      const scan = await scanRepository();
      Object.assign(project, scan);
      ctx.setProject(project);

      result("Type", scan.type);
      result("Architecture", scan.architecture);
      result("Modules", scan.modules?.join(", ") || "none");
      result("Database", scan.database || "none");
      result("Queue", scan.queue || "none");
    } else {
      section("Phase 1b: Requirements Analysis");

      const extracted = extractRequirements(userTask);
      info(`Auto-extracted requirements (confidence: ${extracted.confidence}%)`);

      if (extracted.confidence >= 70) {
        result("Product Type", extracted.productType || "unknown");
        if (extracted.goal) result("Goal", extracted.goal);
        if (extracted.features?.length) result("Features", extracted.features.join(", "));
        if (extracted.stackHints?.backend) result("Stack Hint", extracted.stackHints.backend);
      }

      const requirements = await collectRequirements(extracted);
      ctx.setRequirements(requirements);

      section("Phase 1c: Stack Recommendation");

      let stackRec;

      if (extracted.stackHints && (extracted.stackHints.backend || extracted.stackHints.frontend || extracted.stackHints.mobile)) {
        stackRec = buildStackFromHints(extracted.stackHints, requirements);
        info("Using stack hints extracted from your prompt");
      } else {
        stackRec = recommendStack(requirements);
      }

      ctx.setStack(stackRec);

      result("Recommended", stackRec.primary.name);
      result("Backend", stackRec.primary.backend || "N/A");
      result("Frontend", stackRec.primary.frontend || "N/A");
      result("Database", stackRec.primary.database || "N/A");
      result("Queue", stackRec.primary.queue || "N/A");
      result("ORM", stackRec.primary.orm || "N/A");

      const altText = stackRec.recommendations
        ?.slice(1)
        .map((s) => `${s.name} (score: ${s.score})`)
        .join(", ");
      if (altText) result("Alternatives", altText);

      ctx.setProject({
        exists: false,
        language: stackRec.primary.language || "typescript",
        framework: stackRec.primary.backend,
        type: "new",
      });
    }

    section("Phase 2: Task Classification");
    const classification = classifyTask(userTask);
    ctx.setClassification(classification);

    result("Category", classification.category);
    result("Complexity", `${classification.complexity}/5`);
    result("Domains", classification.domains?.join(", "));

    section("Phase 2b: Model Discovery");
    try {
      await discoverModels();
    } catch (err) {
      warn(`Model discovery skipped: ${err.message}`);
    }

    section("Phase 2c: AI-Powered Planning");

    const aiContext = {
      project: ctx.project,
      stack: ctx.stack,
      requirements: ctx.requirements,
      classification,
      userTask,
    };

    let plan = await createAIPlan(aiContext);

    if (!plan) {
      info("AI planning returned no plan. Falling back to template-based planning.");
    }

    if (!plan) {
      section("Phase 3: Template-Based Planning (fallback)");
      plan = createExecutionPlan(classification, ctx.project, ctx.stack, ctx.requirements);
    }

    ctx.setPlan(plan);

    if (plan.analysis) {
      result("Analysis", plan.analysis.slice(0, 200) + (plan.analysis.length > 200 ? "..." : ""));
    }
    result("Steps", plan.steps.length);
    result("Waves", plan.parallelGroups.length);
    if (plan.metadata?.aiGenerated) {
      result("Planner", "AI (deepseek-v4-pro)");
    }

    for (let i = 0; i < plan.steps.length; i++) {
      const s = plan.steps[i];
      const files = s.files?.length ? `  → ${s.files.slice(0, 3).join(", ")}${s.files.length > 3 ? "..." : ""}` : "";
      console.error(`  ${i + 1}. ${s.description.padEnd(52)} model: ${(s.model || "").split("/").pop()?.padEnd(24) || ""} deps: [${(s.dependencies || []).join(", ")}]${files}`);
    }

    if (plan.risks?.length) {
      console.error(chalk.yellow(`\n  Risks:`));
      for (const r of plan.risks) {
        console.error(chalk.gray(`    ⚠ ${r}`));
      }
    }

    const approvedPlan = await requestPlanApproval(plan, ctx);
    if (!approvedPlan) {
      return { meta: { task: userTask, durationMs: Date.now() - startTime, cancelled: true, timestamp: new Date().toISOString() } };
    }

    section("Phase 4: Execution");
    const execResults = await executePlan(approvedPlan, ctx);

    const totalDuration = Date.now() - startTime;
    const summary = ctx.getSummary();

    section("Phase 5: Results");

    console.error(chalk.gray("  Step               Model                    Duration   Tokens  Files"));
    console.error(chalk.gray("  ─────────────────  ───────────────────────  ────────  ──────  ─────"));

    let totalTokens = 0;
    let totalFiles = 0;

    for (const r of execResults) {
      const stepType = (r.stepId + " " + approvedPlan.steps.find((s) => s.id === r.stepId)?.type || "").slice(0, 18).padEnd(18);
      const model = (r.model || "-").split("/").pop().slice(0, 23).padEnd(23);
      const dur = formatDuration(r.durationMs || 0).padEnd(8);
      const tokens = r.usage?.total_tokens || r.usage?.completion_tokens || 0;
      const tok = (tokens > 0 ? String(tokens) : "~" + Math.round((r.output?.length || 0) / 4)).padEnd(6);
      const files = String(r.artifacts?.length || 0);

      const icon = r.status === "completed" ? chalk.green("✓") : chalk.red("✗");
      console.error(`  ${icon} ${stepType} ${model} ${dur} ${tok} ${files}`);

      if (r.usage?.total_tokens) totalTokens += r.usage.total_tokens;
      else if (r.output) totalTokens += Math.round(r.output.length / 4);
      totalFiles += r.artifacts?.length || 0;
    }

    console.error(chalk.gray("  ─────────────────  ───────────────────────  ────────  ──────  ─────"));
    console.error(`  ${chalk.bold.white("TOTAL")}  ${stepsCompleted(execResults)}/${execResults.length} steps  ${chalk.white(formatDuration(totalDuration))}  ${chalk.white(totalTokens.toLocaleString())} tokens  ${chalk.white(totalFiles)} files\n`);

    if (summary.errors?.length > 0) {
      warn("Errors:");
      for (const e of summary.errors) {
        console.error(`    - ${e}`);
      }
    }

    function stepsCompleted(results) {
      return results.filter((r) => r.status === "completed").length;
    }

    function formatDuration(ms) {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
    }

    return {
      meta: {
        task: userTask,
        durationMs: totalDuration,
        timestamp: new Date().toISOString(),
      },
      project: ctx.project,
      stack: ctx.stack,
      requirements: ctx.requirements,
      classification: ctx.classification,
      plan: {
        steps: approvedPlan.steps.map((s) => ({
          id: s.id,
          type: s.type,
          description: s.description,
          model: s.model,
          status: s.status,
          artifacts: s.artifacts,
        })),
        parallelGroups: approvedPlan.parallelGroups,
      },
      execution: execResults.map((r) => ({
        step: r.stepId,
        model: r.model,
        status: r.status,
        durationMs: r.durationMs,
        artifacts: r.artifacts,
        error: r.error,
      })),
      summary: ctx.getSummary(),
      suggestions: generateSuggestions(ctx),
    };
  } catch (err) {
    logError(`Orchestration failed: ${err.message}`);
    throw err;
  }
}

function buildStackFromHints(stackHints, requirements) {
  const backend = stackHints.backend || null;
  const frontend = stackHints.frontend || inferFrontendFromBackend(backend);
  const mobile = stackHints.mobile || null;

  const primary = {
    name: "Custom (from prompt)",
    backend,
    frontend,
    mobile,
    database: stackHints.database || "PostgreSQL",
    queue: stackHints.queue || null,
    cache: stackHints.queue ? "Redis" : null,
    orm: inferOrm(stackHints),
    language: inferLanguage(stackHints),
    why: `Stack specified in your prompt: ${[
      backend, frontend, mobile, stackHints.database, stackHints.queue,
    ].filter(Boolean).join(", ")}`,
    scaleFit: { min: "small", max: "large", description: "User-specified stack" },
    teamFit: "small-team",
    tags: requirements.features || [],
    featureScore: () => 1,
  };

  return {
    primary,
    recommendations: [primary],
    reasoning: primary.why,
    all: [primary],
  };
}

function inferFrontendFromBackend(backend) {
  if (!backend) return null;
  const lower = backend.toLowerCase();
  if (lower.includes("next.js") || lower.includes("nextjs")) return "Next.js (full-stack)";
  if (lower.includes("remix")) return "Remix (full-stack)";
  if (lower.includes("nuxt")) return "Nuxt (full-stack)";
  return null;
}

function inferOrm(stackHints) {
  const backend = (stackHints.backend || "").toLowerCase();
  if (backend.includes("nestjs") || backend.includes("express") || backend.includes("fastify")) return "Prisma";
  if (backend.includes("django")) return "Django ORM";
  if (backend.includes("fastapi")) return "SQLAlchemy";
  return "Prisma";
}

function inferLanguage(stackHints) {
  const backend = (stackHints.backend || "").toLowerCase();
  if (backend.includes("nestjs") || backend.includes("express") || backend.includes("fastify") || backend.includes("next")) return "TypeScript";
  if (backend.includes("django") || backend.includes("fastapi") || backend.includes("flask")) return "Python";
  if (backend.includes(".net") || backend.includes("dotnet")) return "C#";
  return "TypeScript";
}

function generateSuggestions(ctx) {
  const suggestions = [];

  if (ctx.stack?.primary) {
    const s = ctx.stack.primary;
    if (s.cache && !s.queue) {
      suggestions.push("Consider adding a message queue (BullMQ/Redis) for async processing");
    }
    if (s.backend && !s.cache) {
      suggestions.push("Add Redis for caching and session management");
    }
  }

  if (ctx.classification?.complexity >= 4) {
    suggestions.push("Consider adding monitoring (Prometheus/Grafana) for this complexity level");
    suggestions.push("Implement circuit breakers and retry policies for external dependencies");
  }

  if (ctx.requirements?.features?.includes("auth")) {
    suggestions.push("Use JWT with refresh tokens. Consider OAuth2 for social login.");
  }

  if (ctx.requirements?.features?.includes("payments")) {
    suggestions.push("Use Stripe for payments. Implement idempotency keys for safety.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Consider adding automated CI/CD pipeline");
    suggestions.push("Set up linting and formatting (ESLint + Prettier)");
  }

  return suggestions;
}
