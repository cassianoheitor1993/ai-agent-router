import { SystemDesignerAgent } from "../agents/system-designer.js";
import { BackendBuilderAgent } from "../agents/backend-builder.js";
import { FrontendBuilderAgent } from "../agents/frontend-builder.js";
import { DatabaseDesignerAgent } from "../agents/db-designer.js";
import { ReviewerAgent } from "../agents/reviewer.js";
import { DocumenterAgent } from "../agents/documenter.js";
import { ProjectScaffolderAgent } from "../agents/project-scaffolder.js";
import { MobileBuilderAgent } from "../agents/mobile-builder.js";
import { ConsolidatorAgent } from "../agents/consolidator.js";
import { PlanningAgent } from "../agents/planning-agent.js";
import { debug, warn, info } from "../utils/logger.js";
import chalk from "chalk";

const AGENT_CLASSES = {
  planning: PlanningAgent,
  project_scaffold: ProjectScaffolderAgent,
  system_design: SystemDesignerAgent,
  architecture: SystemDesignerAgent,
  backend: BackendBuilderAgent,
  frontend: FrontendBuilderAgent,
  mobile: MobileBuilderAgent,
  database: DatabaseDesignerAgent,
  review: ReviewerAgent,
  docs: DocumenterAgent,
  testing: BackendBuilderAgent,
  consolidator: ConsolidatorAgent,
};

const _agentCache = {};

function getAgent(stepType) {
  const AgentClass = AGENT_CLASSES[stepType] || SystemDesignerAgent;
  if (!_agentCache[stepType]) {
    _agentCache[stepType] = new AgentClass();
  }
  return _agentCache[stepType];
}

export async function executePlan(plan, contextManager) {
  const { steps, parallelGroups } = plan;
  const results = [];

  console.error(chalk.bold.white(`\n${"═".repeat(50)}`));
  console.error(chalk.bold.cyan(`  EXECUTION  ·  ${steps.length} steps  ·  ${parallelGroups.length} waves`));
  console.error(chalk.bold.white(`${"═".repeat(50)}\n`));

  for (let waveIdx = 0; waveIdx < parallelGroups.length; waveIdx++) {
    const wave = parallelGroups[waveIdx];
    const waveSteps = wave
      .map((stepId) => steps.find((s) => s.id === stepId))
      .filter(Boolean);

    if (waveSteps.length === 0) continue;

    const waveLabel = waveSteps.map((s) => s.type.replace("_", " ")).join(", ");
    console.error(chalk.gray(`  ── Wave ${waveIdx + 1}/${parallelGroups.length}: ${waveLabel}`));

    const wavePromises = waveSteps.map(async (step) => {
      const agent = getAgent(step.type);
      const context = contextManager.getContextForInjection();
      const result = await agent.execute(step, context);

      step.status = result.status;
      step.output = result.output;
      step.artifacts = result.artifacts || [];
      step.error = result.error;
      step.model = result.model;
      step.durationMs = result.durationMs;

      contextManager.addStepOutput(result);
      results.push(result);
      return result;
    });

    await Promise.all(wavePromises);

    const waveResults = results.slice(-waveSteps.length);
    const failed = waveResults.filter((r) => r.status === "failed");

    if (failed.length > 0) {
      warn(`${failed.length} step(s) failed in wave ${waveIdx + 1}`);
      for (const fail of failed) {
        contextManager.addError(new Error(`Step ${fail.stepId}: ${fail.error}`));
      }
    }

    console.error();
  }

  return results;
}
