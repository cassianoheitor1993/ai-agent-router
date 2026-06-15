import { BaseAgent } from "./base-agent.js";

export class SystemDesignerAgent extends BaseAgent {
  constructor() {
    super("system_design");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = `Design a complete system architecture for the following project.\n\n`;

    if (context.requirements) {
      const req = context.requirements;
      prompt += `## Product Requirements
- **Type:** ${req.productType}
- **Goal:** ${req.goal}
- **Scale:** ${req.scale}
- **Team Size:** ${req.teamSize}
- **Features:** ${req.features?.join(", ")}
- **Mobile Needed:** ${req.needMobile ? "Yes" : "No"}
- **Project Name:** ${req.projectName}\n\n`;
    }

    if (context.stack?.primary) {
      const s = context.stack.primary;
      prompt += `## Recommended Stack
- **Backend:** ${s.backend || "N/A"}
- **Frontend:** ${s.frontend || "N/A"}
- **Mobile:** ${s.mobile || "N/A"}
- **Database:** ${s.database || "N/A"}
- **Queue:** ${s.queue || "N/A"}
- **Cache:** ${s.cache || "N/A"}
- **ORM:** ${s.orm || "N/A"}
- **Language:** ${s.language || "N/A"}
- **Why:** ${s.why || ""}\n\n`;
    }

    if (context.project?.exists) {
      const p = context.project;
      prompt += `## Existing Project
- **Type:** ${p.type || "unknown"}
- **Language:** ${p.language || "unknown"}
- **Modules:** ${p.modules?.join(", ") || "none detected"}
- **Database:** ${p.database || "none"}
- **Queue:** ${p.queue || "none"}\n\n`;
    }

    prompt += `## Your Task
1. Define the complete system architecture (pattern, modules, boundaries)
2. Create an ASCII architecture diagram
3. Specify each module's responsibility
4. Define data flow and API design
5. List all technical decisions with justification
6. Propose directory/file structure
7. Identify risks and mitigations

Format the output as a comprehensive architecture document.`;

    return prompt;
  }
}
