import { BaseAgent } from "./base-agent.js";

export class ProjectScaffolderAgent extends BaseAgent {
  constructor() {
    super("project_scaffold");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Create the complete project scaffolding and directory structure.\n\n`;

    const stack = context.stack?.primary || {};

    prompt += `## Technology Stack
- Backend: ${stack.backend || "N/A"}
- Frontend: ${stack.frontend || "N/A"}
- Mobile: ${stack.mobile || "N/A"}
- Database: ${stack.database || "PostgreSQL"}
- ORM: ${stack.orm || "Prisma"}
- Language: ${stack.language || "TypeScript"}\n\n`;

    if (context.requirements) {
      const req = context.requirements;
      prompt += `## Product Info
- Type: ${req.productType}
- Name: ${req.projectName || "my-project"}
- Need Mobile: ${req.needMobile ? "Yes" : "No"}
- Features: ${req.features?.join(", ") || "crud"}\n\n`;
    }

    const isMonorepo = context.requirements?.productType === "fullstack" &&
      (context.requirements?.needMobile ||
       stack.backend?.includes("Next.js") ||
       context.requirements?.goal?.includes("monorepo"));

    if (isMonorepo) {
      prompt += `## MONOREPO STRUCTURE REQUIRED

Create a monorepo with these packages:
- Root: package.json with "workspaces": ["packages/*"]
- packages/api/ — backend API\n`;

      if (stack.frontend) {
        prompt += `- packages/web/ — frontend web app\n`;
      }

      if (context.requirements?.needMobile || stack.mobile) {
        prompt += `- packages/mobile/ — React Native Expo mobile app\n`;
      }
    } else {
      prompt += `## SINGLE PROJECT STRUCTURE

Create a single project with standard directories (src/, docs/, prisma/).\n`;
    }

    prompt += `\nGenerate these files with COMPLETE, valid content:

1. Root package.json — with ALL dependencies (not just placeholders), scripts, and workspaces if monorepo
2. tsconfig.json — strict TypeScript config
3. .env.example — database URL and other env vars
4. .gitignore — appropriate ignores
5. Sub-package.json files (if monorepo) — each with their own dependencies

For Next.js backend, also include:
6. next.config.js

For Vite frontend, also include:
7. vite.config.ts
8. index.html

For React Native/Expo, also include:
9. app.json
10. babel.config.js

CRITICAL: Every file MUST start with // file: path/to/file.ext marker.`;

    return prompt;
  }
}
