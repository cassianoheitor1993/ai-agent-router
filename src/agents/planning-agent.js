import { BaseAgent } from "./base-agent.js";

export class PlanningAgent extends BaseAgent {
  constructor() {
    super("planning");
  }

  buildUserPrompt(stepConfig, context) {
    let prompt = "";

    if (context.project?.exists) {
      prompt += `## EXISTING CODEBASE\n`;
      prompt += `- Type: ${context.project.type || "unknown"}\n`;
      prompt += `- Architecture: ${context.project.architecture || "unknown"}\n`;
      prompt += `- Language: ${context.project.language || "unknown"}\n`;
      prompt += `- Framework: ${context.project.framework || "none"}\n`;
      prompt += `- Modules: ${context.project.modules?.join(", ") || "none detected"}\n`;
      prompt += `- Database: ${context.project.database || "none"}\n`;
      prompt += `- Queue: ${context.project.queue || "none"}\n`;

      if (context.project.dependencies?.length) {
        prompt += `- Key dependencies: ${context.project.dependencies.slice(0, 15).join(", ")}\n`;
      }

      prompt += `\n### Project File Tree\n`;
      prompt += "```\n";
      prompt += formatTree(context.project.structure || [], "");
      prompt += "```\n\n";
    } else {
      prompt += `## NEW PROJECT (greenfield)\n`;
      prompt += `No existing codebase. Start from scratch.\n\n`;
    }

    if (context.requirements) {
      const req = context.requirements;
      prompt += `## REQUIREMENTS\n`;
      prompt += `- Product Type: ${req.productType}\n`;
      prompt += `- Goal: ${req.goal}\n`;
      if (req.features?.length) prompt += `- Features: ${req.features.join(", ")}\n`;
      if (req.needMobile) prompt += `- Mobile App: Yes\n`;
      if (req.scale) prompt += `- Scale: ${req.scale}\n`;
      if (req.projectName) prompt += `- Project Name: ${req.projectName}\n`;
      prompt += `\n`;
    }

    if (context.stack?.primary) {
      const s = context.stack.primary;
      prompt += `## TECH STACK\n`;
      if (s.backend) prompt += `- Backend: ${s.backend}\n`;
      if (s.frontend) prompt += `- Frontend: ${s.frontend}\n`;
      if (s.mobile) prompt += `- Mobile: ${s.mobile}\n`;
      if (s.database) prompt += `- Database: ${s.database}\n`;
      if (s.orm) prompt += `- ORM: ${s.orm}\n`;
      if (s.queue) prompt += `- Queue: ${s.queue}\n`;
      prompt += `- Language: ${s.language || "TypeScript"}\n\n`;
    }

    prompt += `## USER TASK\n${context.userTask}\n\n`;

    prompt += `## INSTRUCTIONS\n`;
    prompt += `Analyze the codebase and task above. Produce a detailed atomic execution plan in the EXACT format specified in your system prompt.\n`;
    prompt += `Each step must reference REAL file paths from the codebase (or paths that will be created).\n`;
    prompt += `For new projects, design the full file tree. Break the work into the smallest logical units.\n`;

    return prompt;
  }
}

function formatTree(items, indent) {
  let out = "";
  for (const item of (items || []).slice(0, 40)) {
    if (item.type === "dir") {
      out += `${indent}${item.name}/\n`;
      if (item.children) {
        out += formatTree(item.children.slice(0, 15), indent + "  ");
      }
    } else {
      out += `${indent}${item.name}\n`;
    }
  }
  if (items?.length > 40) {
    out += `${indent}... (${items.length - 40} more items)\n`;
  }
  return out;
}
