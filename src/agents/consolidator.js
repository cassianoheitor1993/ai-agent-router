import { BaseAgent } from "./base-agent.js";

export class ConsolidatorAgent extends BaseAgent {
  constructor() {
    super("consolidator");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Consolidate and validate the generated project. Fix inconsistencies.\n\n`;

    prompt += `## Project Info
- Type: ${context.project?.type || "new"}
- Stack: ${context.stack?.primary?.backend || "N/A"}
- Monorepo: ${context.requirements?.productType === "fullstack" ? "Yes" : "No"}\n\n`;

    prompt += `## Generated Files Summary\n\n`;

    const allArtifacts = [];
    if (context.stepOutputs) {
      for (const [id, output] of Object.entries(context.stepOutputs)) {
        if (output.artifacts?.length) {
          allArtifacts.push(`### Step ${id} (${output.model}):`);
          for (const art of output.artifacts) {
            allArtifacts.push(`  - ${art}`);
          }
          allArtifacts.push("");
        }
      }
    }
    prompt += allArtifacts.join("\n");

    prompt += `\n## Your Task

1. **Remove duplicate files** — if the same path appears multiple times from different steps, keep the most complete version
2. **Merge package.json** — ensure the root package.json has ALL dependencies from ALL steps
3. **Fix missing imports** — ensure all imports reference files that exist
4. **Validate structure** — check that the directory tree matches the intended architecture
5. **Report gaps** — list any missing pieces

Generate a consolidated summary. If you need to fix any files, output them with // file: markers.

Do NOT generate new application code — only fix, merge, and validate.`;

    return prompt;
  }
}
