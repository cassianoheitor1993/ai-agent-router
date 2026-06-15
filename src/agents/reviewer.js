import { BaseAgent } from "./base-agent.js";

export class ReviewerAgent extends BaseAgent {
  constructor() {
    super("review");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Review the following code for security, quality, and architecture issues.\n\n`;

    prompt += `## Project Context\n`;
    prompt += `- Type: ${context.project?.type || "new project"}\n`;
    prompt += `- Stack: ${context.stack?.primary?.backend || "N/A"}\n\n`;

    prompt += `## Code to Review\n\n`;

    const allOutputs = [];

    if (context.stepOutputs) {
      for (const [id, output] of Object.entries(context.stepOutputs)) {
        if (output.output && output.artifacts) {
          allOutputs.push(`### Step: ${id}\n`);
          allOutputs.push(`Files: ${output.artifacts.join(", ")}\n`);

          const summary = output.output.slice(0, 3000);
          allOutputs.push(`${summary}\n\n`);
        }
      }
    }

    prompt += allOutputs.join("");

    prompt += `\n## Your Task: ${stepConfig.description}

Perform a comprehensive code review. Categorize findings:

**Critical Issues** (security vulnerabilities, data loss risks)
**Warnings** (code quality, maintainability)
**Suggestions** (improvements, optimizations)

For each finding, include:
- File/component reference
- Description of the issue
- Why it's a problem
- Recommended fix with code example

End with an overall quality score (1-10).`;

    return prompt;
  }
}
