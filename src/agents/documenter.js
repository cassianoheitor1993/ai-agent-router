import { BaseAgent } from "./base-agent.js";

export class DocumenterAgent extends BaseAgent {
  constructor() {
    super("docs");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Generate comprehensive technical documentation for this project.\n\n`;

    if (context.project) {
      prompt += `## Project Info
- Type: ${context.project.type || "new"}
- Language: ${context.project.language || "unknown"}
- Modules: ${context.project.modules?.join(", ") || "N/A"}\n\n`;
    }

    if (context.stack?.primary) {
      const s = context.stack.primary;
      prompt += `## Technology Stack
- Backend: ${s.backend || "N/A"}
- Frontend: ${s.frontend || "N/A"}
- Database: ${s.database || "N/A"}
- Queue: ${s.queue || "N/A"}\n\n`;
    }

    if (context.requirements) {
      prompt += `## Requirements\n${context.requirements.goal}\n\n`;
    }

    if (context.stepOutputs) {
      for (const [id, output] of Object.entries(context.stepOutputs)) {
        if (output.output) {
          const summary = output.output.slice(0, 2000);
          prompt += `## ${id} Summary\n${summary}\n\n`;
        }
      }
    }

    prompt += `## Your Task: ${stepConfig.description}

Generate the following documentation files:

1. **README.md** - Project title, description, tech stack, setup instructions, usage, API overview, contributing
2. **ARCHITECTURE.md** - Architecture decisions, patterns, module map, data flow, deployment
3. **API.md** - All endpoints with request/response examples, authentication, error codes
4. **DEVELOPMENT.md** - Local setup, environment variables, scripts, conventions, testing

Use this format:
// file: README.md
\`\`\`markdown
# Project Title
...
\`\`\`

Make sure documentation is developer-friendly with clear code examples.`;

    return prompt;
  }
}
