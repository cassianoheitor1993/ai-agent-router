import { Command } from "commander";
import { orchestrate } from "./orchestrator.js";
import { setLogLevel } from "./utils/logger.js";
import { setStreamMode } from "./agents/base-agent.js";

const program = new Command();

program
  .name("ai-router")
  .description("AI Router Agent - Dynamic System Designer")
  .version("1.0.0")
  .argument("[task]", "Task description in natural language")
  .option("-v, --verbose", "Enable verbose/debug logging")
  .option("-j, --json", "Output raw JSON (no formatting)")
  .option("-q, --quiet", "Minimal output — only errors and final table")
  .option("--stream", "Show raw AI output as it streams (verbose)")
  .action(async (task, options) => {
    if (options.verbose) {
      setLogLevel("debug");
    } else if (options.quiet) {
      setLogLevel("warn");
    }

    if (!task) {
      console.error("Usage: ai-router \"your task description\"");
      console.error("\nExamples:");
      console.error('  ai-router "Build a REST API for task management"');
      console.error('  ai-router "Add user authentication to this project"');
      console.error('  ai-router "Review the codebase for security issues"');
      console.error("\nOptions:");
      console.error("  -v, --verbose   Enable debug logging");
      console.error("  -j, --json      Output JSON result");
      console.error("  -q, --quiet     Minimal output — summary table only");
      console.error("  --stream        Show AI output as it's generated");
      process.exit(1);
    }

    try {
      setStreamMode(options.stream);
      const result = await orchestrate(task);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (err) {
      console.error(`Fatal error: ${err.message}`);
      process.exit(1);
    }
  });

export async function runCLI(argv = process.argv) {
  return program.parseAsync(argv);
}
