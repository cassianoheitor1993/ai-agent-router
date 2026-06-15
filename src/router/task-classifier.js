const DOMAIN_KEYWORDS = {
  architecture: [
    "architecture", "design system", "system design", "architect",
    "monolith", "microservice", "event-driven", "cqrs", "clean architecture",
    "hexagonal", "ddd", "domain-driven", "design pattern",
  ],
  backend: [
    "api", "backend", "server", "endpoint", "rest", "graphql",
    "controller", "service", "middleware", "route", "fastify",
    "express", "nestjs", "django", "fastapi",
  ],
  frontend: [
    "frontend", "ui", "component", "react", "vue", "angular",
    "svelte", "page", "css", "style", "layout", "responsive",
    "tailwind", "next.js", "vite",
  ],
  database: [
    "database", "schema", "migration", "model", "prisma",
    "typeorm", "drizzle", "sql", "postgres", "mongodb",
    "redis", "entity", "relation",
  ],
  testing: [
    "test", "testing", "unit test", "integration", "e2e",
    "jest", "vitest", "pytest", "coverage", "mock",
  ],
  review: [
    "review", "code review", "refactor", "security", "vulnerability",
    "audit", "performance", "optimize",
  ],
  docs: [
    "document", "docs", "readme", "api docs", "swagger",
    "openapi", "changelog", "architecture decision",
  ],
  system_design: [
    "fullstack", "full-stack", "complete app", "entire system",
    "from scratch", "build a", "create a", "new project",
    "scaffold", "generate",
  ],
};

const CATEGORIES = [
  "system_design",
  "architecture",
  "backend",
  "frontend",
  "database",
  "testing",
  "review",
  "docs",
];

export function classifyTask(userPrompt) {
  const lower = userPrompt.toLowerCase();
  const scores = {};

  for (const category of CATEGORIES) {
    scores[category] = 0;
  }

  for (const [category, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[category] += 1;
      }
    }
  }

  let category = "fullstack";
  let maxScore = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      category = cat;
    }
  }

  if (maxScore === 0) {
    category = "fullstack";
  }

  const complexity = assessComplexity(userPrompt, scores);

  const domains = CATEGORIES.filter((cat) => scores[cat] > 0);

  if (domains.length > 3) {
    category = "system_design";
  }

  return {
    category,
    complexity,
    domains: domains.length > 0 ? domains : [category],
    scores,
  };
}

function assessComplexity(prompt, scores) {
  const lower = prompt.toLowerCase();

  const activeDomains = Object.values(scores).filter((s) => s > 0).length;

  let complexity = 1;

  if (activeDomains >= 4) complexity += 2;
  else if (activeDomains >= 3) complexity += 1;

  const scaleIndicators = [
    "monorepo", "mono-repo", "mobile", "app mobile", "react native", "flutter",
    "microservice", "enterprise", "multi-tenant", "multi-region",
    "real-time", "event-driven", "cqrs", "distributed",
    "kubernetes", "high availability", "fullstack", "full-stack",
  ];

  const scaleCount = scaleIndicators.filter((w) => lower.includes(w)).length;
  complexity += Math.min(scaleCount, 3);

  if (lower.includes("monorepo") || lower.includes("mono-repo")) complexity += 1;

  return Math.min(Math.max(Math.round(complexity), 1), 5);
}
