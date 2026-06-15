import { BaseAgent } from "./base-agent.js";

export class MobileBuilderAgent extends BaseAgent {
  constructor() {
    super("mobile");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Implement the React Native / Expo mobile application for this project.\n\n`;

    const stack = context.stack?.primary || {};
    const mobileFramework = stack.mobile || "React Native Expo";
    const language = stack.language || "TypeScript";

    prompt += `## Tech Stack
- Framework: ${mobileFramework}
- Language: ${language}
- Backend API: ${stack.backend || "REST API"}\n\n`;

    if (context.requirements) {
      const req = context.requirements;
      prompt += `## Features to implement:
${req.features?.map((f) => `- ${f}`).join("\n")}
Goal: ${req.goal}\n\n`;
    }

    if (context.stepOutputs) {
      for (const [id, output] of Object.entries(context.stepOutputs)) {
        if (output.output) {
          const summary = output.output.slice(0, 1500);
          prompt += `## ${id} Output\n${summary}\n\n`;
        }
      }
    }

    prompt += `## Your Task: ${stepConfig.description}

Generate the following React Native / Expo files with complete, production-quality code:

1. **App entry** — packages/mobile/App.tsx with navigation setup (Expo Router)
2. **Screens** — Login, Register, Dashboard, and feature-specific screens
3. **Components** — Reusable UI components (Button, Input, Card, etc.)
4. **Hooks** — Custom hooks (useAuth, useApi, useTransactions, etc.)
5. **API Client** — Typed API client for backend communication  
6. **Auth Flow** — Auth context, secure token storage, protected routes
7. **Types** — Shared TypeScript types/interfaces
8. **Navigation** — Expo Router file-based routing structure

Use this format for each file:
// file: packages/mobile/src/screens/ScreenName.tsx
\`\`\`tsx
// complete code
\`\`\`

Make all code complete and runnable. Handle loading, error, and empty states.
Use Expo Router for navigation. Use React Native's built-in components (View, Text, TextInput, etc.).`;

    return prompt;
  }
}
