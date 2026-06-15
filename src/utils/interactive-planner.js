import inquirer from "inquirer";
import chalk from "chalk";

export async function requestPlanApproval(plan, context) {
  showPlan(plan);

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Review the execution plan above. What would you like to do?",
      choices: [
        { name: chalk.green("✓ Execute now") + " — run all steps as planned", value: "execute" },
        { name: chalk.yellow("✎ Adjust plan") + " — enable/disable steps, change models", value: "adjust" },
        { name: chalk.blue("↺ Reorder steps") + " — change execution order", value: "reorder" },
        { name: chalk.red("✗ Cancel") + " — abort", value: "cancel" },
      ],
    },
  ]);

  if (action === "cancel") {
    console.error(chalk.red("\n  Execution cancelled.\n"));
    return null;
  }

  if (action === "execute") {
    console.error(chalk.green("\n  Executing...\n"));
    return plan;
  }

  if (action === "adjust") {
    return await adjustPlan(plan);
  }

  if (action === "reorder") {
    return await reorderSteps(plan);
  }

  return plan;
}

function showPlan(plan) {
  console.error(chalk.bold.white(`\n  Execution Plan — ${plan.steps.length} steps in ${plan.parallelGroups.length} waves\n`));
  console.error(chalk.gray("  #  Step                 Model                       Depends on"));
  console.error(chalk.gray("  ── ───────────────────  ─────────────────────────  ──────────"));

  for (let i = 0; i < plan.steps.length; i++) {
    const s = plan.steps[i];
    const num = String(i + 1).padStart(2);
    const type = s.type.replace(/_/g, " ").padEnd(19);
    const model = s.model?.split("/").pop()?.padEnd(25) || "unknown".padEnd(25);
    const deps = s.dependencies?.map((d) => {
      const dep = plan.steps.find((st) => st.id === d);
      return dep ? `#${plan.steps.indexOf(dep) + 1}` : d.slice(0, 8);
    }).join(", ") || "—";

    const wave = plan.parallelGroups.findIndex((g) => g.includes(s.id));
    const waveTag = chalk.gray(`[w${wave + 1}]`);

    console.error(`  ${num} ${waveTag} ${chalk.white(type)} ${chalk.cyan(model)} ${chalk.gray(deps)}`);
  }

  console.error();
  console.error(chalk.gray("  Waves: ") + plan.parallelGroups.map((g, i) => `W${i + 1}: ${g.length} steps`).join("  "));
  console.error();
}

async function adjustPlan(plan) {
  const stepChoices = plan.steps.map((s, i) => ({
    name: `${String(i + 1).padEnd(3)} ${s.type.replace(/_/g, " ").padEnd(19)} [${s.model?.split("/").pop()}]`,
    value: s.id,
    checked: true,
  }));

  const { enabled } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "enabled",
      message: "Select steps to KEEP in the plan (uncheck to remove):",
      choices: stepChoices,
      pageSize: 15,
    },
  ]);

  const keptSteps = plan.steps.filter((s) => enabled.includes(s.id));

  if (keptSteps.length === 0) {
    console.error(chalk.red("\n  No steps selected. Using original plan.\n"));
    return plan;
  }

  const { changeModels } = await inquirer.prompt([
    {
      type: "confirm",
      name: "changeModels",
      message: "Do you want to change the AI model for any step?",
      default: false,
    },
  ]);

  if (changeModels) {
    await adjustModels(keptSteps);
  }

  const filteredPlan = {
    ...plan,
    steps: keptSteps,
    parallelGroups: recomputeWaves(keptSteps),
    metadata: { ...plan.metadata, stepCount: keptSteps.length },
  };

  console.error(chalk.green(`\n  Plan adjusted: ${keptSteps.length} steps kept.\n`));

  return filteredPlan;
}

async function adjustModels(steps) {
  const modelChoices = [
    { name: "DeepSeek V4 Pro (best quality)", value: "opencode/deepseek-v4-pro" },
    { name: "DeepSeek V4 Flash (fast, good quality)", value: "opencode/deepseek-v4-flash" },
    { name: "GLM-5 (review/security specialist)", value: "opencode/glm-5" },
    { name: "Kimi K2.6 (documentation specialist)", value: "opencode/kimi-k2.6" },
  ];

  for (const step of steps) {
    const { newModel } = await inquirer.prompt([
      {
        type: "list",
        name: "newModel",
        message: `Model for "${step.type.replace(/_/g, " ")}" (currently: ${step.model?.split("/").pop()}):`,
        choices: [
          { name: chalk.gray("— Keep current —"), value: step.model },
          ...modelChoices,
        ],
      },
    ]);

    if (newModel !== step.model) {
      step.model = newModel;
      console.error(chalk.green(`  ✓ Updated to ${newModel.split("/").pop()}`));
    }
  }
}

function recomputeWaves(steps) {
  const completed = new Set();
  const groups = [];
  const remaining = new Set(steps.map((s) => s.id));

  while (remaining.size > 0) {
    const wave = [];
    for (const step of steps) {
      if (!remaining.has(step.id)) continue;
      const depsDone = step.dependencies.every(
        (depId) => !remaining.has(depId) || completed.has(depId)
      );
      if (depsDone) wave.push(step.id);
    }
    if (wave.length === 0) {
      for (const id of remaining) wave.push(id);
    }
    for (const id of wave) {
      remaining.delete(id);
      completed.add(id);
    }
    groups.push(wave);
  }
  return groups;
}

async function reorderSteps(plan) {
  console.error(chalk.yellow("\n  Reorder mode: enter the new sequence of step numbers.\n"));

  console.error("  Current order:");
  plan.steps.forEach((s, i) => {
    console.error(`    ${i + 1}. ${s.type.replace(/_/g, " ")}`);
  });

  const { sequence } = await inquirer.prompt([
    {
      type: "input",
      name: "sequence",
      message: "Enter new order (e.g. 1,3,2,5,4 or 1-3 to keep, 5-6 to skip):",
      validate: (v) => {
        if (!v.trim()) return "Enter at least one number";
        return true;
      },
    },
  ]);

  const order = parseSequence(sequence, plan.steps.length);

  if (order.length > 0) {
    const reordered = order.map((i) => plan.steps[i - 1]).filter(Boolean);
    return {
      ...plan,
      steps: reordered,
      parallelGroups: recomputeWaves(reordered),
      metadata: { ...plan.metadata, stepCount: reordered.length },
    };
  }

  return plan;
}

function parseSequence(input, max) {
  const result = [];
  const parts = input.split(/[,;\s]+/);

  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (start && end && start > 0 && end <= max) {
        for (let i = start; i <= end; i++) result.push(i);
      }
    } else {
      const num = Number(part);
      if (num && num > 0 && num <= max) result.push(num);
    }
  }

  return [...new Set(result)];
}
