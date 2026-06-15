import {
  webAppStacks,
  apiStacks,
  mobileStacks,
  fullstackStacks,
  microservicesStacks,
  cliStacks,
  libraryStacks,
  dataStacks,
} from "./stack-kb.js";

export function recommendStack(requirements) {
  const { productType, scale, features, teamSize } = requirements;

  const candidates = getCandidates(productType);

  const scored = candidates
    .map((stack) => ({
      ...stack,
      score: scoreStack(stack, { scale, features, teamSize }),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3);

  return {
    recommendations: top,
    primary: top[0],
    reasoning: buildReasoning(top[0], requirements),
    all: scored,
  };
}

function getCandidates(productType) {
  switch (productType) {
    case "web-app": return webAppStacks;
    case "api": return apiStacks;
    case "mobile": return mobileStacks;
    case "fullstack": return fullstackStacks;
    case "microservices": return microservicesStacks;
    case "cli": return cliStacks;
    case "library": return libraryStacks;
    case "data": return dataStacks;
    default: return [...apiStacks, ...webAppStacks];
  }
}

function scoreStack(stack, context) {
  let score = 0;

  if (stack.scaleFit) {
    const scaleScores = { mvp: 1, small: 2, medium: 3, large: 4, enterprise: 5 };
    const stackMax = scaleScores[stack.scaleFit.max] || 5;
    const needed = scaleScores[context.scale] || 3;
    score += Math.max(0, 10 - Math.abs(stackMax - needed) * 2);
  }

  if (stack.featureScore) {
    for (const feature of context.features) {
      score += stack.featureScore(feature);
    }
  }

  if (stack.teamFit) {
    const teamScores = { solo: 1, "small-team": 2, "medium-team": 3, "large-team": 4 };
    const stackTeam = teamScores[stack.teamFit] || 2;
    const actualTeam = teamScores[context.teamSize] || 2;
    score += Math.max(0, 5 - Math.abs(stackTeam - actualTeam) * 2);
  }

  return score;
}

function buildReasoning(stack, requirements) {
  const points = [stack.why];

  if (stack.scaleFit && stack.scaleFit.description) {
    points.push(`Scale: ${stack.scaleFit.description}`);
  }

  const featureReasons = [];
  if (requirements.features.includes("auth") && stack.tags?.includes("auth"))
    featureReasons.push("built-in auth patterns");
  if (requirements.features.includes("realtime") && stack.tags?.includes("realtime"))
    featureReasons.push("real-time support");
  if (requirements.features.includes("jobs") && stack.tags?.includes("queue"))
    featureReasons.push("job queue integration");

  if (featureReasons.length) {
    points.push(`Features: ${featureReasons.join(", ")}`);
  }

  return points.join(". ");
}
