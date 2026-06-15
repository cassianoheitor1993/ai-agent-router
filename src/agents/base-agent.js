import { getProvider } from "../providers/openai-provider.js";
import { getAgentPrompt } from "../prompts/system-prompts.js";
import { getFallbackChain } from "../router/model-dispatcher.js";
import { getConfig, getMaxTokensForStep } from "../utils/config.js";
import { step as logStep, debug, warn, info } from "../utils/logger.js";
import { writeOutputFile, extractCodeBlocks, extractEntityName } from "../utils/file-utils.js";
import chalk from "chalk";
import { existsSync } from "fs";
import { resolve } from "path";

const MAX_CONTINUE_RETRIES = 2;

let globalStreamMode = false;
export function setStreamMode(enabled) {
  globalStreamMode = enabled;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

class LiveStreamParser {
  constructor(stepType, shortModel, startTime) {
    this.stepType = stepType;
    this.shortModel = shortModel;
    this.startTime = startTime;
    this.buffer = "";
    this.parsedUpTo = 0;
    this.currentFile = null;
    this.currentLines = 0;
    this.filesGenerated = [];
    this.inCodeBlock = false;
    this.lastRefresh = 0;
    this.totalNarrativeLines = 0;
    this.finished = false;
  }

  feed(chunk, streamMode) {
    this.buffer += chunk;

    if (streamMode) {
      process.stdout.write(chunk);
      return;
    }

    this.parseNewContent();

    const now = Date.now();
    if (now - this.lastRefresh > 120 || this.currentFile) {
      this.refresh();
      this.lastRefresh = now;
    }
  }

  parseNewContent() {
    const newContent = this.buffer.slice(this.parsedUpTo);
    const lines = newContent.split("\n");

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      if (!this.inCodeBlock) {
        const fileMatch = trimmed.match(/^\s*(?:\/\/|#|--)\s*file\s*:\s*(\S+)/i);
        if (fileMatch) {
          if (this.currentFile) {
            this.filesGenerated.push({ path: this.currentFile, lines: this.currentLines });
          }
          this.currentFile = fileMatch[1];
          this.currentLines = 0;
          continue;
        }

        if (trimmed.startsWith("```")) {
          this.inCodeBlock = true;
          continue;
        }

        if (this.currentFile === null && this.filesGenerated.length === 0) {
          this.totalNarrativeLines++;
        }
      } else {
        if (trimmed.startsWith("```")) {
          this.inCodeBlock = false;
          if (this.currentFile) {
            this.filesGenerated.push({ path: this.currentFile, lines: this.currentLines });
            this.currentFile = null;
            this.currentLines = 0;
          }
          continue;
        }

        if (this.currentFile) {
          this.currentLines++;
        }
      }
    }

    this.parsedUpTo = this.buffer.length;
  }

  refresh() {
    const elapsed = Date.now() - this.startTime;
    const elapsedStr = formatDuration(elapsed);

    if (this.currentFile) {
      const shortPath = this.currentFile.length > 45
        ? "..." + this.currentFile.slice(-42)
        : this.currentFile.padEnd(45);
      process.stderr.write(
        `\r  ${chalk.cyan("▶")} ${this.stepType.padEnd(18)} ${chalk.gray(`[${this.shortModel}]`)}  ${chalk.white(shortPath)} ${chalk.green(`+${String(this.currentLines).padStart(4)} ln`)}  ${chalk.gray(elapsedStr)}  `
      );
    } else {
      const status = this.totalNarrativeLines > 0
        ? `${this.totalNarrativeLines} lines`
        : "thinking...";
      process.stderr.write(
        `\r  ${chalk.cyan("▶")} ${this.stepType.padEnd(18)} ${chalk.gray(`[${this.shortModel}]`)}  ${chalk.gray(status.padEnd(45))}      ${chalk.gray(elapsedStr)}  `
      );
    }
  }

  finalize() {
    if (this.currentFile) {
      this.filesGenerated.push({ path: this.currentFile, lines: this.currentLines });
    }
    this.finished = true;
    return this.filesGenerated;
  }
}

export class BaseAgent {
  constructor(type) {
    this.type = type;
    this.systemPrompt = getAgentPrompt(type);
  }

  async execute(stepConfig, context) {
    const provider = getProvider();
    const config = getConfig();
    const maxRetries = config.MAX_RETRIES || 3;
    const baseDelay = config.RETRY_DELAY_MS || 1000;
    const maxTokens = getMaxTokensForStep(stepConfig.type);
    const shortModel = stepConfig.model?.split("/").pop() || stepConfig.model;

    const fallbackChain = getFallbackChain(stepConfig.type);
    let lastError = null;

    for (let modelIdx = 0; modelIdx < fallbackChain.length; modelIdx++) {
      const currentModel = fallbackChain[modelIdx];

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const messages = this.buildMessages(stepConfig, context);

          const startTime = Date.now();
          let content = "";
          let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
          let finishReason = "";

          const liveParser = new LiveStreamParser(stepConfig.type, shortModel, startTime);

          await provider.streamChat(messages, {
            model: currentModel,
            temperature: config.TEMPERATURE_DEFAULT || 0.7,
            max_tokens: maxTokens,
          }, (chunk) => {
            const delta = chunk.choices?.[0]?.delta?.content || "";
            content += delta;

            if (chunk.choices?.[0]?.finish_reason) {
              finishReason = chunk.choices?.[0]?.finish_reason;
            }
            if (chunk.usage) {
              usage = chunk.usage;
            }

            liveParser.feed(delta, globalStreamMode);
          });

          const generatedFiles = liveParser.finalize();

          let continueRetries = 0;
          while (finishReason === "length" && continueRetries < MAX_CONTINUE_RETRIES) {
            continueRetries++;
            messages.push({ role: "assistant", content });
            messages.push({ role: "user", content: "Continue exactly where you left off." });

            const response = await provider.chat(messages, {
              model: currentModel,
              temperature: config.TEMPERATURE_DEFAULT || 0.7,
              max_tokens: maxTokens,
            });

            const continuation = response.choices?.[0]?.message?.content || "";
            content += continuation;
            finishReason = response.choices?.[0]?.finish_reason || "";

            const contUsage = response.usage || {};
            if (contUsage.total_tokens) {
              usage.prompt_tokens += contUsage.prompt_tokens || 0;
              usage.completion_tokens += contUsage.completion_tokens || 0;
              usage.total_tokens += contUsage.total_tokens || 0;
            }
          }

          const durationMs = Date.now() - startTime;

          const artifacts = await this.processOutput(content, stepConfig, context);

          const totalLines = generatedFiles.reduce((sum, f) => sum + f.lines, 0);
          const fileCount = generatedFiles.length || artifacts.length;
          const fileSummary = `${fileCount} files · ${totalLines} lines`;

          process.stderr.write(
            `\r  ${chalk.green("✓")} ${stepConfig.type.padEnd(18)} ${chalk.gray(`[${shortModel}]`)}  ${chalk.white(fileSummary.padEnd(45))} ${chalk.gray(formatDuration(durationMs))}  \n`
          );

          return {
            stepId: stepConfig.id,
            model: currentModel,
            modelAttempts: modelIdx + 1,
            retries: attempt,
            status: "completed",
            durationMs,
            output: content,
            artifacts,
            usage,
            error: null,
          };

        } catch (err) {
          process.stderr.write(`\r  ${chalk.red("✗")} ${stepConfig.type.padEnd(18)} ${chalk.gray(`[${shortModel}]`)}  ${chalk.red(err.message.slice(0, 60))}\n`);
          lastError = err;
          const delay = baseDelay * Math.pow(2, attempt);

          if (attempt < maxRetries - 1) {
            warn(`Retry ${attempt + 1}/${maxRetries} for ${stepConfig.id}: retrying in ${delay}ms`);
            await sleep(delay);
          } else {
            warn(`Model ${currentModel} failed after ${maxRetries} attempts`);
          }
        }
      }
    }

    process.stderr.write(`\r  ${chalk.red("✗")} ${stepConfig.type.padEnd(18)} ${chalk.gray("[FAILED]")}  all models exhausted\n`);

    return {
      stepId: stepConfig.id,
      model: fallbackChain[0],
      modelAttempts: fallbackChain.length,
      retries: maxRetries,
      status: "failed",
      durationMs: 0,
      output: null,
      artifacts: [],
      usage: null,
      error: lastError?.message || "All models and retries exhausted",
    };
  }

  buildMessages(stepConfig, context) {
    const userPrompt = this.buildUserPrompt(stepConfig, context);

    return [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Task: ${stepConfig.description}\n\n`;

    if (context.project) {
      prompt += `Project Context:\n${JSON.stringify(context.project, null, 2)}\n\n`;
    }

    if (context.stack) {
      prompt += `Technology Stack:\n${JSON.stringify(context.stack, null, 2)}\n\n`;
    }

    if (context.requirements) {
      prompt += `Requirements:\n${JSON.stringify(context.requirements, null, 2)}\n\n`;
    }

    if (context.stepOutputs) {
      for (const depId of stepConfig.dependencies || []) {
        if (context.stepOutputs[depId]) {
          const depOutput = context.stepOutputs[depId];
          prompt += `Output from ${depId}:\n${depOutput.output}\n\n`;
        }
      }
    }

    const isMonorepo = existsSync(resolve(config.projectDir, "packages")) ||
                       existsSync(resolve(config.projectDir, "apps"));

    prompt += `\nCRITICAL FILE OUTPUT RULES:
1. Every code block MUST have a file path marker: // file: path/to/file.ext
${isMonorepo ? `2. MONOREPO DETECTED: This project has a packages/ structure. ALL file paths MUST use the package prefix:
   - Backend code: packages/api/src/path/to/file.ts
   - Mobile code: packages/mobile/src/path/to/Screen.tsx
   - Frontend code: packages/web/src/path/to/Component.tsx
   - Config files: packages/api/package.json, packages/api/tsconfig.json` : `2. Use standard project paths (src/controllers/, src/services/, etc.)`}
3. Do NOT output code blocks without a preceding // file: marker.
4. Use descriptive kebab-case file names based on the class/function name.`;

    return prompt;
  }

  async processOutput(content, stepConfig, context) {
    const artifacts = [];
    const writtenPaths = new Set();
    const blocks = extractCodeBlocks(content);

    let missedMarkers = 0;

    for (const block of blocks) {
      if (block.code.length === 0) continue;

      if (block.language === "json" && block.code.length > 5) {
        try {
          JSON.parse(block.code);
        } catch {
          warn(`Skipping invalid JSON in block for ${block.filePath || "unknown"}`);
          continue;
        }
      }

      let path = block.filePath;

      if (!path) {
        missedMarkers++;
        path = this.guessFilePath(block, stepConfig);
        if (missedMarkers <= 3) {
          warn(`Missing // file: marker for block (${block.language}), guessed: ${path}`);
        }
      } else if (path.startsWith("src/")) {
        path = this.tryPrefixMonorepoPath(path);
      }

      if (!path) continue;
      if (writtenPaths.has(path)) continue;
      writtenPaths.add(path);

      try {
        const written = await writeOutputFile(path, block.code);
        if (written) artifacts.push(written);
      } catch (err) {
        debug(`Failed to write ${path}: ${err.message}`);
      }
    }

    if (missedMarkers > 0) {
      warn(`${missedMarkers} code block(s) lacked // file: markers in step ${stepConfig.id}`);
    }

    if (artifacts.length === 0 && blocks.length > 0) {
      const fallbackPath = `output/step_${stepConfig.id}.txt`;
      await writeOutputFile(fallbackPath, content);
      artifacts.push(fallbackPath);
    }

    return artifacts;
  }

  tryPrefixMonorepoPath(path) {
    if (!path.startsWith("src/")) return path;

    const config = getConfig();
    const packagesDir = resolve(config.projectDir, "packages");

    try {
      if (existsSync(packagesDir)) {
        const apiDir = resolve(packagesDir, "api", "src");
        const webDir = resolve(packagesDir, "web", "src");
        const mobileDir = resolve(packagesDir, "mobile", "src");

        if (existsSync(apiDir) && (path.includes("controller") || path.includes("service") || path.includes("middleware") || path.includes("module") || path.includes("dto"))) {
          return path.replace("src/", "packages/api/src/");
        }
        if (existsSync(webDir) && (path.includes("component") || path.includes("page") || path.includes("hook") || path.includes("tsx"))) {
          return path.replace("src/", "packages/web/src/");
        }
        if (existsSync(mobileDir)) {
          return path.replace("src/", "packages/mobile/src/");
        }
      }
    } catch {}

    return path;
  }

  guessFilePath(block, stepConfig) {
    const firstLine = block.code.split("\n")[0]?.trim() || "";
    const entityName = extractEntityName(block.code, block.language);

    if (block.language === "prisma") return this.monorepoPrefix("prisma/schema.prisma", "database");
    if (block.language === "sql") return this.monorepoPrefix(`db/migrations/migration_${Date.now()}.sql`, "database");
    if (block.language === "json") {
      if (firstLine.includes("\"name\"") && firstLine.includes("\"version\"")) return this.monorepoPrefix("package.json", "project_scaffold");
      if (firstLine.includes("\"compilerOptions\"")) return this.monorepoPrefix("tsconfig.json", "project_scaffold");
      return `output/config_${Date.now()}.json`;
    }

    switch (stepConfig.type) {
      case "system_design":
      case "architecture":
        return "docs/architecture.md";
      case "backend":
        return this.monorepoPrefix(this.guessBackendPath(firstLine, entityName), "backend");
      case "frontend":
        return this.monorepoPrefix(this.guessFrontendPath(firstLine, entityName), "frontend");
      case "mobile":
        return this.guessMobilePath(firstLine, entityName);
      case "docs":
        if (firstLine.toLowerCase().includes("readme")) return "README.md";
        if (firstLine.toLowerCase().includes("api")) return "docs/API.md";
        if (firstLine.toLowerCase().includes("architecture")) return "docs/ARCHITECTURE.md";
        return "docs/generated.md";
      default:
        return `output/step_${stepConfig.id}.txt`;
    }
  }

  monorepoPrefix(path, stepType) {
    if (!path) return path;
    const config = getConfig();

    try {
      if (existsSync(resolve(config.projectDir, "packages"))) {
        const apiDir = resolve(config.projectDir, "packages", "api");
        const mobileDir = resolve(config.projectDir, "packages", "mobile");
        const webDir = resolve(config.projectDir, "packages", "web");

        if (existsSync(apiDir) && (stepType === "backend" || stepType === "database" || stepType === "project_scaffold")) {
          if (path.startsWith("src/")) return path.replace("src/", "packages/api/src/");
          if (path === "package.json" || path === "tsconfig.json" || path.startsWith("prisma/")) return `packages/api/${path}`;
        }
        if (existsSync(mobileDir) && stepType === "mobile") {
          if (path.startsWith("src/")) return path.replace("src/", "packages/mobile/src/");
        }
        if (existsSync(webDir) && stepType === "frontend") {
          if (path.startsWith("src/")) return path.replace("src/", "packages/web/src/");
        }
      }
    } catch {}

    return path;
  }

  guessBackendPath(firstLine, entityName) {
    if (entityName) {
      const lower = entityName.toLowerCase();

      if (firstLine.includes("controller") || lower.endsWith("controller"))
        return fileByEntity(entityName, "controller", "controllers");
      if (firstLine.includes("service") || lower.endsWith("service"))
        return fileByEntity(entityName, "service", "services");
      if (firstLine.includes("module") || lower.endsWith("module"))
        return fileByEntity(entityName, "module", "modules");
      if (firstLine.includes("dto") || firstLine.includes("DTO") || firstLine.includes("Dto") || lower.endsWith("dto"))
        return fileByEntity(entityName, "dto", "dto");
      if (firstLine.includes("middleware") || lower.endsWith("middleware"))
        return fileByEntity(entityName, "middleware", "middleware");
      if (firstLine.includes("guard") || lower.endsWith("guard"))
        return fileByEntity(entityName, "guard", "guards");
      if (firstLine.includes("pipe") || lower.endsWith("pipe"))
        return fileByEntity(entityName, "pipe", "pipes");
      if (firstLine.includes("interface") || firstLine.includes("type ") || lower.includes("interface"))
        return `src/types/${entityName}.ts`;
      if (firstLine.includes("enum") || lower.endsWith("enum"))
        return `src/enums/${entityName}.enum.ts`;
      return `src/${entityName}.ts`;
    }

    if (firstLine.includes("controller") || firstLine.includes("Controller"))
      return "src/controllers/generated.controller.ts";
    if (firstLine.includes("service") || firstLine.includes("Service"))
      return "src/services/generated.service.ts";
    if (firstLine.includes("module") || firstLine.includes("Module"))
      return "src/modules/generated.module.ts";
    if (firstLine.includes("dto") || firstLine.includes("DTO") || firstLine.includes("Dto"))
      return "src/dto/generated.dto.ts";
    if (firstLine.includes("middleware"))
      return "src/middleware/generated.middleware.ts";
    return "src/generated.ts";
  }

  guessMobilePath(firstLine, entityName) {
    if (entityName) {
      const name = entityName;
      if (firstLine.toLowerCase().includes("screen"))
        return this.monorepoPrefix(`src/screens/${name}.tsx`, "mobile");
      if (firstLine.toLowerCase().includes("navigation") || firstLine.toLowerCase().includes("navigator"))
        return this.monorepoPrefix(`src/navigation/${name}.tsx`, "mobile");
      if (firstLine.toLowerCase().includes("component"))
        return this.monorepoPrefix(`src/components/${name}.tsx`, "mobile");
      if (firstLine.toLowerCase().includes("service") || firstLine.toLowerCase().includes("api"))
        return this.monorepoPrefix(`src/services/${name}.ts`, "mobile");
      return this.monorepoPrefix(`src/${name}.tsx`, "mobile");
    }
    return this.monorepoPrefix("src/screens/GeneratedScreen.tsx", "mobile");
  }

  guessFrontendPath(firstLine, entityName) {
    if (entityName) {
      const name = entityName;
      if (firstLine.includes("interface") || firstLine.includes("type ") || firstLine.includes("Interface"))
        return `src/types/${name}.ts`;
      if (firstLine.includes("use"))
        return `src/hooks/use${name.charAt(0).toUpperCase() + name.slice(1)}.ts`;
      if (firstLine.includes("export") && (firstLine.includes("function") || firstLine.includes("const") || firstLine.includes("class")))
        return `src/components/${name}.tsx`;
      return `src/pages/${name}.tsx`;
    }

    if (firstLine.includes("export") && (firstLine.includes("function") || firstLine.includes("const")))
      return "src/components/GeneratedComponent.tsx";
    if (firstLine.includes("interface") || firstLine.includes("type "))
      return "src/types/generated.ts";
    if (firstLine.includes("use"))
      return "src/hooks/generated.hook.ts";
    return "src/pages/GeneratedPage.tsx";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fileByEntity(entityName, suffix, dir) {
  const lower = entityName.toLowerCase();
  const suffixLower = suffix.toLowerCase();

  if (lower.endsWith(suffixLower)) {
    const base = entityName.slice(0, -suffix.length);
    const kebab = base.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    return `src/${dir}/${kebab}.${suffixLower}.ts`;
  }

  const kebab = entityName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  return `src/${dir}/${kebab}.${suffixLower}.ts`;
}
