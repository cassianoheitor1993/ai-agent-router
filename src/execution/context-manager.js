import { debug } from "../utils/logger.js";

export class ContextManager {
  constructor() {
    this.project = null;
    this.stack = null;
    this.requirements = null;
    this.classification = null;
    this.plan = null;
    this.stepOutputs = {};
    this.timeline = [];
    this.errors = [];
  }

  setProject(project) {
    this.project = project;
    debug("Context: project set", project);
  }

  setStack(stack) {
    this.stack = stack;
    debug("Context: stack set", stack.primary?.name);
  }

  setRequirements(requirements) {
    this.requirements = requirements;
    debug("Context: requirements set");
  }

  setClassification(classification) {
    this.classification = classification;
    debug("Context: classification set", classification);
  }

  setPlan(plan) {
    this.plan = plan;
    debug("Context: plan set", `${plan.steps?.length} steps`);
  }

  addStepOutput(result) {
    this.stepOutputs[result.stepId] = result;
    this.timeline.push({
      stepId: result.stepId,
      model: result.model,
      status: result.status,
      durationMs: result.durationMs,
      timestamp: Date.now(),
    });
  }

  addError(error) {
    this.errors.push({
      message: error.message,
      stack: error.stack?.slice(0, 500),
      timestamp: Date.now(),
    });
  }

  getContextForInjection() {
    return {
      project: this.project,
      stack: this.stack,
      requirements: this.requirements,
      classification: this.classification,
      stepOutputs: this.stepOutputs,
    };
  }

  getSummary() {
    const completed = this.timeline.filter((t) => t.status === "completed");
    const failed = this.timeline.filter((t) => t.status === "failed");
    const totalDuration = this.timeline.reduce((sum, t) => sum + (t.durationMs || 0), 0);

    return {
      totalSteps: this.timeline.length,
      completed: completed.length,
      failed: failed.length,
      totalDurationMs: totalDuration,
      modelsUsed: [...new Set(this.timeline.map((t) => t.model))],
      artifacts: Object.values(this.stepOutputs)
        .flatMap((s) => s.artifacts || [])
        .filter(Boolean),
      errors: this.errors.length > 0 ? this.errors.map((e) => e.message) : null,
    };
  }

  toJSON() {
    return {
      project: this.project,
      stack: this.stack,
      requirements: this.requirements,
      classification: this.classification,
      plan: this.plan,
      execution: this.timeline,
      stepOutputs: this.stepOutputs,
      summary: this.getSummary(),
    };
  }
}
