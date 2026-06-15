import { BaseAgent } from "./base-agent.js";

export class FrontendBuilderAgent extends BaseAgent {
  constructor() {
    super("frontend");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Implement the frontend for this project.\n\n`;

    const stack = context.stack?.primary || {};
    const framework = stack.frontend || "React + Vite";
    const language = stack.language || "TypeScript";

    prompt += `## Tech Stack
- **Framework:** ${framework}
- **Language:** ${language}\n\n`;

    if (context.stepOutputs) {
      for (const [id, output] of Object.entries(context.stepOutputs)) {
        if (output.output) {
          const summary = output.output.slice(0, 1500);
          prompt += `## ${id} Output\n${summary}\n\n`;
        }
      }
    }

    prompt += `## Your Task: ${stepConfig.description}

Generate the following frontend files with complete, production-quality code:

1. **Project setup** - package.json, vite.config.ts, index.html
2. **App entry** - Main App component with routing
3. **Pages** - Page components for each route
4. **Components** - Reusable UI components
5. **Hooks** - Custom React hooks (useAuth, useApi, etc.)
6. **API client** - Typed API client for backend communication
7. **Types** - Shared TypeScript types/interfaces
8. **Styles** - CSS/Tailwind styles
9. **State management** - Context or store setup

Use this format for each file:
// file: src/path/to/Component.tsx
\`\`\`tsx
// code
\`\`\`

Make all code complete and runnable. Handle loading, error, and empty states. Ensure responsive design.`;

    return prompt;
  }
}
