import { BaseAgent } from "./base-agent.js";

export class BackendBuilderAgent extends BaseAgent {
  constructor() {
    super("backend");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Implement the backend for this project.\n\n`;

    const stack = context.stack?.primary || {};
    const framework = stack.backend || "Express";
    const language = stack.language || "TypeScript";
    const orm = stack.orm || "Prisma";
    const database = stack.database || "PostgreSQL";

    prompt += `## Tech Stack
- **Framework:** ${framework}
- **Language:** ${language}
- **ORM:** ${orm}
- **Database:** ${database}\n\n`;

    if (context.stepOutputs) {
      for (const [id, output] of Object.entries(context.stepOutputs)) {
        if (output.output) {
          const summary = output.output.slice(0, 1500);
          prompt += `## ${id} Output\n${summary}\n\n`;
        }
      }
    }

    prompt += `## Your Task: ${stepConfig.description}

Generate the following files with complete, production-quality code:

1. **Project setup** - package.json, tsconfig.json, environment config
2. **Entry point** - main server file with middleware setup
3. **Routes** - REST API routes for all resources
4. **Controllers** - Request handlers with validation
5. **Services** - Business logic layer
6. **DTOs/Types** - Request/response type definitions
7. **Middleware** - Auth, error handling, logging, CORS
8. **Configuration** - Environment-based config module

Use this format for each file:
// file: path/to/file.ts
\`\`\`typescript
// code
\`\`\`

Make sure all code is complete and runnable. Handle errors properly. Use async/await.`;

    return prompt;
  }
}
