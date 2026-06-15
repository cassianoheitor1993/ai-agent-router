import { BaseAgent } from "./base-agent.js";

export class DatabaseDesignerAgent extends BaseAgent {
  constructor() {
    super("database");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Design and generate the database schema for this project.\n\n`;

    const stack = context.stack?.primary || {};
    const orm = stack.orm || "Prisma";
    const database = stack.database || "PostgreSQL";

    prompt += `## Tech Stack
- **ORM:** ${orm}
- **Database:** ${database}\n\n`;

    if (context.requirements) {
      const req = context.requirements;
      prompt += `## Features to support:
${req.features?.map((f) => `- ${f}`).join("\n")}\n\n`;
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

Generate the complete database schema using ${orm} for ${database}:

1. **Schema file** - Complete schema with all models
2. **Enums** - All enum types
3. **Relations** - Proper foreign keys and relations
4. **Indexes** - Performance indexes
5. **Timestamps** - createdAt, updatedAt on all models
6. **Migrations** - Initial migration (if applicable)

Models to consider based on features:
- User/Auth tables
- CRUD resource tables
- File/upload metadata
- Payment/subscription tables
- Notification tables
- Audit/log tables

Use this format:
// file: prisma/schema.prisma
\`\`\`prisma
// complete schema
\`\`\`

Ensure referential integrity with proper cascade rules.`;

    return prompt;
  }
}
