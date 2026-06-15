import inquirer from "inquirer";
import chalk from "chalk";

const QUESTIONS = [
  {
    type: "list",
    name: "productType",
    message: "What type of product are you building?",
    choices: [
      { name: "Web Application (SaaS, dashboard, platform)", value: "web-app" },
      { name: "REST API / Backend Service", value: "api" },
      { name: "Mobile App (iOS/Android)", value: "mobile" },
      { name: "Full-Stack Application (web + API)", value: "fullstack" },
      { name: "CLI Tool", value: "cli" },
      { name: "Library / SDK / Package", value: "library" },
      { name: "Microservices System", value: "microservices" },
      { name: "Data Pipeline / ETL", value: "data" },
    ],
  },
  {
    type: "input",
    name: "goal",
    message: "What is the main goal / problem this product solves?",
    validate: (v) => v.length > 5 || "Please provide at least a brief description",
  },
  {
    type: "list",
    name: "scale",
    message: "What is the expected scale?",
    choices: [
      { name: "MVP / Prototype (< 100 users)", value: "mvp" },
      { name: "Small (100 - 1,000 users)", value: "small" },
      { name: "Medium (1,000 - 100,000 users)", value: "medium" },
      { name: "Large (100,000 - 1M+ users)", value: "large" },
      { name: "Enterprise (millions, multi-region)", value: "enterprise" },
    ],
  },
  {
    type: "checkbox",
    name: "features",
    message: "What are the main features? (select all that apply)",
    choices: [
      { name: "User Authentication / Authorization", value: "auth" },
      { name: "CRUD Operations", value: "crud" },
      { name: "Real-time (WebSockets / SSE)", value: "realtime" },
      { name: "File Uploads / Storage", value: "files" },
      { name: "Payments / Billing", value: "payments" },
      { name: "Email / Notifications", value: "notifications" },
      { name: "Search / Full-text", value: "search" },
      { name: "Background Jobs / Queues", value: "jobs" },
      { name: "Admin Dashboard", value: "admin" },
      { name: "API Integrations (3rd party)", value: "integrations" },
      { name: "Reporting / Analytics", value: "analytics" },
      { name: "Multi-tenancy", value: "multitenant" },
    ],
  },
  {
    type: "list",
    name: "teamSize",
    message: "How many developers will work on this?",
    choices: [
      { name: "Solo developer", value: "solo" },
      { name: "Small team (2-5)", value: "small-team" },
      { name: "Medium team (5-20)", value: "medium-team" },
      { name: "Large team (20+)", value: "large-team" },
    ],
  },
  {
    type: "confirm",
    name: "needMobile",
    message: "Do you need a mobile app (in addition to web)?",
    default: false,
  },
  {
    type: "input",
    name: "projectName",
    message: "Project name (kebab-case):",
    default: "my-project",
    validate: (v) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) || "Use kebab-case (e.g. my-cool-app)",
  },
];

function getQuestionDefaults(defaults) {
  const defs = {};
  if (defaults.productType) defs.productType = defaults.productType;
  if (defaults.goal) defs.goal = defaults.goal;
  if (defaults.scale) defs.scale = defaults.scale;
  if (defaults.features?.length) defs.features = defaults.features;
  if (defaults.teamSize) defs.teamSize = defaults.teamSize;
  if (defaults.needMobile) defs.needMobile = true;
  if (defaults.projectName) defs.projectName = defaults.projectName;
  return defs;
}

function questionsWithDefaults(defaults) {
  const defs = getQuestionDefaults(defaults);
  return QUESTIONS.map((q) => {
    if (defs[q.name] !== undefined) {
      return { ...q, default: defs[q.name] };
    }
    return q;
  });
}

export async function confirmExtracted(extracted) {
  const { stackHints, confidence } = extracted;

  const productTypeLabels = {
    "web-app": "Web Application (SaaS, dashboard)",
    api: "REST API / Backend Service",
    mobile: "Mobile App (iOS/Android)",
    fullstack: "Full-Stack Application (web + API)",
    cli: "CLI Tool",
    library: "Library / SDK",
    microservices: "Microservices System",
    data: "Data Pipeline / ETL",
  };

  console.log(chalk.cyan("\n  Auto-detected from your prompt:"));
  console.log();

  if (extracted.productType) {
    console.log(`  ${chalk.gray("Type:")}    ${chalk.white(productTypeLabels[extracted.productType] || extracted.productType)}`);
  }
  if (extracted.goal) {
    console.log(`  ${chalk.gray("Goal:")}    ${chalk.white(extracted.goal)}`);
  }
  if (extracted.projectName) {
    console.log(`  ${chalk.gray("Name:")}    ${chalk.white(extracted.projectName)}`);
  }
  if (extracted.features?.length) {
    console.log(`  ${chalk.gray("Features:")} ${chalk.white(extracted.features.join(", "))}`);
  }
  if (extracted.needMobile) {
    console.log(`  ${chalk.gray("Mobile:")}  ${chalk.white("Yes")}`);
  }

  const stacks = [];
  if (stackHints.backend) stacks.push(`Backend: ${stackHints.backend}`);
  if (stackHints.frontend) stacks.push(`Frontend: ${stackHints.frontend}`);
  if (stackHints.mobile) stacks.push(`Mobile: ${stackHints.mobile}`);
  if (stackHints.database) stacks.push(`Database: ${stackHints.database}`);
  if (stacks.length > 0) {
    console.log(`  ${chalk.gray("Stack:")}   ${chalk.white(stacks.join(" | "))}`);
  }

  console.log();

  if (confidence >= 70) {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Proceed with this auto-detected config?",
        default: true,
      },
    ]);

    if (confirm) {
      return buildResult(extracted);
    }
  }

  if (confidence >= 40) {
    console.log(chalk.yellow("  Pre-filling questionnaire with detected values...\n"));
    const answers = await inquirer.prompt(questionsWithDefaults(extracted));
    return {
      productType: answers.productType,
      goal: answers.goal,
      scale: answers.scale,
      features: answers.features,
      teamSize: answers.teamSize,
      needMobile: answers.needMobile,
      projectName: answers.projectName,
    };
  }

  return null;
}

function buildResult(extracted) {
  return {
    productType: extracted.productType,
    goal: extracted.goal || "Project described via natural language",
    scale: extracted.scale || "small",
    features: extracted.features,
    teamSize: "small-team",
    needMobile: extracted.needMobile || false,
    projectName: extracted.projectName || "my-project",
  };
}

export async function collectRequirements(defaults = null) {
  if (defaults?.confidence >= 40) {
    console.log(chalk.cyan("\n  Based on your prompt, I detected these requirements:\n"));

    const productTypeLabels = {
      "web-app": "Web Application",
      api: "REST API",
      mobile: "Mobile App",
      fullstack: "Full-Stack App",
      cli: "CLI Tool",
      library: "Library / SDK",
      microservices: "Microservices",
      data: "Data Pipeline",
    };

    if (defaults.productType) console.log(`  ${chalk.gray("Type:")}      ${chalk.white(productTypeLabels[defaults.productType] || defaults.productType)}`);

    if (defaults.stackHints?.backend) console.log(`  ${chalk.gray("Backend:")}   ${chalk.white(defaults.stackHints.backend)}`);
    if (defaults.stackHints?.frontend) console.log(`  ${chalk.gray("Frontend:")}  ${chalk.white(defaults.stackHints.frontend)}`);
    if (defaults.stackHints?.mobile) console.log(`  ${chalk.gray("Mobile:")}    ${chalk.white(defaults.stackHints.mobile)}`);

    if (defaults.features?.length) console.log(`  ${chalk.gray("Features:")}  ${chalk.white(defaults.features.join(", "))}`);

    if (defaults.goal) console.log(`  ${chalk.gray("Goal:")}      ${chalk.white(defaults.goal)}`);
    if (defaults.projectName) console.log(`  ${chalk.gray("Project:")}   ${chalk.white(defaults.projectName)}`);

    console.log();

    if (defaults.confidence >= 70) {
      const { confirm } = await inquirer.prompt([
        { type: "confirm", name: "confirm", message: "Proceed with this auto-detected config?", default: true },
      ]);
      if (confirm) {
        return buildResult(defaults);
      }
    }

    console.log(chalk.yellow("  Let's refine with a few more questions...\n"));
    const answers = await inquirer.prompt(questionsWithDefaults(defaults));
    return {
      productType: answers.productType,
      goal: answers.goal,
      scale: answers.scale,
      features: answers.features,
      teamSize: answers.teamSize,
      needMobile: answers.needMobile,
      projectName: answers.projectName,
    };
  }

  console.log("\n  Let's design your project together.\n");
  const answers = await inquirer.prompt(QUESTIONS);
  return {
    productType: answers.productType,
    goal: answers.goal,
    scale: answers.scale,
    features: answers.features,
    teamSize: answers.teamSize,
    needMobile: answers.needMobile,
    projectName: answers.projectName,
  };
}
