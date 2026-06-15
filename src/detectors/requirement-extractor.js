const PRODUCT_TYPE_PATTERNS = [
  { pattern: /\b(monorepo|mono-repo)\b/i, type: "fullstack", weight: 3 },
  { pattern: /\b(fullstack|full-stack|full stack)\b/i, type: "fullstack", weight: 3 },
  { pattern: /\b(microservi|microservice|micro-servi|micro service)\b/i, type: "microservices", weight: 3 },
  { pattern: /\b(api rest|rest api|backend|back-end|back end|api em|api com)\b/i, type: "api", weight: 3 },
  { pattern: /\b(mobile|app mobile|android|ios|react native|flutter|expo)\b/i, type: "mobile", weight: 2 },
  { pattern: /\b(web app|webapp|dashboard|plataforma|saas|frontend|front-end|front end)\b/i, type: "web-app", weight: 2 },
  { pattern: /\b(cli|command line|linha de comando)\b/i, type: "cli", weight: 3 },
  { pattern: /\b(lib|library|sdk|package|biblioteca|pacote)\b/i, type: "library", weight: 3 },
  { pattern: /\b(data|etl|pipeline|analytics)\b/i, type: "data", weight: 2 },
];

const STACK_PATTERNS = {
  backend: [
    { pattern: /\b(nestjs|nest\.js|nest js)\b/i, value: "NestJS + Fastify" },
    { pattern: /\b(fastify)\b/i, value: "Fastify + Prisma" },
    { pattern: /\b(express|express\.js|express js)\b/i, value: "Express + Drizzle" },
    { pattern: /\b(fastapi|fast api)\b/i, value: "FastAPI + SQLAlchemy" },
    { pattern: /\b(django|django rest|drf)\b/i, value: "Django + DRF" },
    { pattern: /\b(?:api|backend|servidor|server).{0,20}\b(next\.?js|nextjs)\b|\b(next\.?js|nextjs).{0,20}\b(api|backend|servidor|server)\b/i, value: "Next.js API routes" },
    { pattern: /\b(remix)\b/i, value: "Remix + Prisma" },
    { pattern: /\b(go|golang)\b/i, value: "Go (Chi/Gin)" },
    { pattern: /\b(\.net|dotnet|asp\.net|c#)\b/i, value: ".NET Web API" },
  ],
  frontend: [
    { pattern: /\b(next\.?js|nextjs)\b/i, value: "React + Next.js", condition: (text) => !/\b(next\.?js|nextjs).{0,30}\b(?:api|backend|servidor|server)\b/i.test(text) && !/\b(?:api|backend|servidor|server).{0,30}\b(next\.?js|nextjs)\b/i.test(text) },
    { pattern: /\b(react)(?!.?native)\b/i, value: "React + Vite" },
    { pattern: /\b(vue|nuxt)\b/i, value: "Vue + Nuxt" },
    { pattern: /\b(svelte|sveltekit)\b/i, value: "SvelteKit" },
    { pattern: /\b(angular)\b/i, value: "Angular" },
    { pattern: /\b(remix)\b/i, value: "Remix" },
  ],
  mobile: [
    { pattern: /\b(react native|react-native)\b/i, value: "React Native Expo" },
    { pattern: /\b(expo)\b/i, value: "React Native Expo" },
    { pattern: /\b(flutter)\b/i, value: "Flutter + Firebase" },
    { pattern: /\b(swiftui|swift ui|ios nativo|native ios)\b/i, value: "SwiftUI" },
    { pattern: /\b(kotlin|jetpack compose|android nativo|native android)\b/i, value: "Jetpack Compose" },
  ],
  database: [
    { pattern: /\b(postgres|postgresql)\b/i, value: "PostgreSQL" },
    { pattern: /\b(mongo|mongodb)\b/i, value: "MongoDB" },
    { pattern: /\b(mysql|mariadb)\b/i, value: "MySQL" },
    { pattern: /\b(sqlite)\b/i, value: "SQLite" },
    { pattern: /\b(redis)\b/i, value: "Redis" },
    { pattern: /\b(supabase)\b/i, value: "Supabase" },
    { pattern: /\b(firebase|firestore)\b/i, value: "Firebase" },
    { pattern: /\b(prisma)\b/i, value: "PostgreSQL + Prisma" },
    { pattern: /\b(typeorm)\b/i, value: "PostgreSQL + TypeORM" },
    { pattern: /\b(drizzle)\b/i, value: "PostgreSQL + Drizzle" },
  ],
  queue: [
    { pattern: /\b(bullmq|bull)\b/i, value: "BullMQ" },
    { pattern: /\b(kafka)\b/i, value: "Kafka" },
    { pattern: /\b(rabbitmq|rabbit)\b/i, value: "RabbitMQ" },
    { pattern: /\b(sqs)\b/i, value: "AWS SQS" },
  ],
};

const FEATURE_PATTERNS = [
  { pattern: /\b(auth|authenti|login|log-in|signup|sign.up|sign-in|sign in|jwt|oauth|autentica)/i, feature: "auth" },
  { pattern: /\b(crud|criar|editar|deletar|listar|create|edit|delete|list|gerenciar|manage|crud)/i, feature: "crud" },
  { pattern: /\b(real.?time|websocket|socket|sse|live|ao vivo)/i, feature: "realtime" },
  { pattern: /\b(upload|file|arquivo|imagem|image|storage|armazen)/i, feature: "files" },
  { pattern: /\b(pagamento|payment|stripe|billing|cobran|assinatura|subscription|pagar)/i, feature: "payments" },
  { pattern: /\b(email|notifi|push|sms|alert|alert)/i, feature: "notifications" },
  { pattern: /\b(search|busca|pesquisa|full.?text|elastic)/i, feature: "search" },
  { pattern: /\b(job|queue|fila|background|async|worker|cron|agendad|schedule)/i, feature: "jobs" },
  { pattern: /\b(admin|dashboard|painel|backoffice|back-office)/i, feature: "admin" },
  { pattern: /\b(integra|api extern|terceiro|third.party|webhook)/i, feature: "integrations" },
  { pattern: /\b(report|relat|analytics|dashboard|metric|gráfico|chart)/i, feature: "analytics" },
  { pattern: /\b(multi.?ten|tenant|organiza|workspace|equipe|team)/i, feature: "multitenant" },
];

const SCALE_PATTERNS = [
  { pattern: /\b(mvp|prototip|prova de conceito|poc|prototype|proof.of.concept)/i, scale: "mvp" },
  { pattern: /\b(pequen|small|pouco|baixa)\s+(escala|scale|usuário|user|tráfego|traffic)/i, scale: "small" },
  { pattern: /\b(grande|large|alta)\s+(escala|scale|usuário|user|tráfego|traffic|milh)/i, scale: "large" },
  { pattern: /\b(enterprise|corporativo|milhões|millions|multi.?região|multi.?region)/i, scale: "enterprise" },
];

const PROJECT_NAME_PATTERNS = [
  { pattern: /(?:projeto|project|app|chamado|called|nomeado|named)\s+(?:de\s+)?['"]?([a-zA-Z0-9][-a-zA-Z0-9]{1,40})['"]?/i, group: 1 },
  { pattern: /\b(?:criar|create|build|iniciar|init|start)\s+(?:um|um\s+novo|a|o|meu)\s+(?:projeto|project|app)?\s*(?:de\s+)?['"]?([a-zA-Z0-9][-a-zA-Z0-9]{1,40})['"]?/i, group: 1 },
];

const GOAL_PATTERNS = [
  { pattern: /\b(?:para|for|de|of)\s+(gerenciar|gestão|manage|control|administrar|monitorar|track|acompanhar|organizar)/i, afterMatch: true },
  { pattern: /\b(?:para|for)\s+(.+?)(?:\.|$)/i, group: 1 },
];

export function extractRequirements(userTask) {
  const lower = userTask.toLowerCase();
  const result = {
    productType: null,
    goal: null,
    scale: null,
    features: [],
    teamSize: null,
    needMobile: false,
    projectName: null,
    stackHints: { backend: null, frontend: null, mobile: null, database: null, queue: null },
    confidence: 0,
    missingFields: [],
  };

  // --- Product Type ---
  const typeScores = {};
  for (const { pattern, type, weight } of PRODUCT_TYPE_PATTERNS) {
    if (pattern.test(lower)) {
      typeScores[type] = (typeScores[type] || 0) + weight;
    }
  }

  const topType = Object.entries(typeScores).sort((a, b) => b[1] - a[1])[0];
  if (topType) {
    result.productType = topType[0];
  }

  // If mobile was mentioned AND another type, promote to fullstack
  if (result.productType === "mobile") {
    result.needMobile = true;
    for (const key of ["backend", "api", "frontend"]) {
      if (typeScores[key]) {
        result.productType = "fullstack";
        break;
      }
    }
  }

  // "monorepo" + mobile → fullstack
  if (/\bmonorepo\b/i.test(lower) && /\b(mobile|react native|app)\b/i.test(lower)) {
    result.productType = "fullstack";
    result.needMobile = true;
  }

  // --- Stack Hints ---
  for (const [layer, patterns] of Object.entries(STACK_PATTERNS)) {
    for (const entry of patterns) {
      const { pattern, value, condition } = entry;
      if (pattern.test(lower) && (!condition || condition(lower))) {
        result.stackHints[layer] = value;
        break;
      }
    }
  }

  // If a frontend framework was mentioned but no backend, set productType
  if (result.stackHints.frontend && !result.stackHints.backend && !result.productType) {
    if (/\b(next\.?js|nextjs)\b/i.test(lower) && !/\bapi\b/i.test(lower)) {
      result.productType = "web-app";
    }
  }

  if (result.stackHints.backend && !result.productType) {
    result.productType = "api";
  }

  // If both frontend and backend detected, it's fullstack
  if (result.stackHints.backend && result.stackHints.frontend) {
    result.productType = "fullstack";
  }

  if (result.stackHints.mobile && result.productType !== "mobile") {
    result.needMobile = true;
    if (result.stackHints.backend || result.stackHints.frontend) {
      result.productType = "fullstack";
    }
  }

  // --- Features ---
  for (const { pattern, feature } of FEATURE_PATTERNS) {
    if (pattern.test(lower) && !result.features.includes(feature)) {
      result.features.push(feature);
    }
  }
  if (result.features.length === 0) {
    result.features.push("crud");
  }

  // --- Scale ---
  for (const { pattern, scale } of SCALE_PATTERNS) {
    if (pattern.test(lower)) {
      result.scale = scale;
      break;
    }
  }

  // --- Project Name ---
  for (const { pattern, group } of PROJECT_NAME_PATTERNS) {
    const match = userTask.match(pattern);
    if (match && match[group]) {
      const name = match[group].toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (name.length > 1 && !["um", "uma", "novo", "nova", "meu", "minha", "para", "com", "fullstack", "full-stack", "monorepo", "react", "nestjs", "nextjs", "next", "express", "fastify", "api", "app", "mobile", "backend", "frontend"].includes(name)) {
        result.projectName = name;
        break;
      }
    }
  }

  // --- Goal ---
  for (const { pattern, group, afterMatch } of GOAL_PATTERNS) {
    const match = userTask.match(pattern);
    if (match) {
      if (afterMatch) {
        const idx = match.index + match[0].length;
        const remainder = userTask.slice(idx).trim().replace(/[.]$/, "");
        if (remainder.length > 3) {
          result.goal = remainder.slice(0, 120);
          break;
        }
      } else if (match[group]) {
        const goal = match[group].trim().replace(/[.]$/, "");
        if (goal.length > 3) {
          result.goal = goal.slice(0, 120);
          break;
        }
      }
    }
  }

  if (!result.goal) {
    const cleaned = userTask
      .replace(/^(vamos|criar|build|create|iniciar|init|start|quero|i want|make|fazer|gerar|generate)\s+/i, "")
      .replace(/^(um|uma|a|an|o)\s+/i, "")
      .replace(/\s*\.\s*$/, "")
      .trim();

    const stackWords = [
      "nestjs", "fastify", "express", "next.js", "nextjs", "react", "react native",
      "vue", "angular", "django", "fastapi", "flutter", "expo", "prisma",
      "typeorm", "drizzle", "postgres", "mongodb", "redis", "bullmq", "kafka",
      "monorepo", "fullstack", "full-stack", "api", "app", "mobile",
    ];

    let goalCandidate = cleaned;
    for (const sw of stackWords) {
      goalCandidate = goalCandidate.replace(new RegExp(`\\b${sw}\\b`, "gi"), "").trim();
    }
    goalCandidate = goalCandidate
      .replace(/\b(com|with|usando|using|em|in)\s+/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (goalCandidate.length > 10) {
      result.goal = goalCandidate.charAt(0).toUpperCase() + goalCandidate.slice(1);
    }
  }

  // --- Calculate Confidence ---
  let confidence = 0;
  if (result.productType) confidence += 25;
  if (result.goal) confidence += 20;
  if (result.features.length > 1) confidence += 15;
  if (result.stackHints.backend || result.stackHints.frontend || result.stackHints.mobile) confidence += 20;
  if (result.projectName) confidence += 10;
  if (result.scale) confidence += 5;
  if (result.needMobile && result.stackHints.mobile) confidence += 5;

  result.confidence = Math.min(100, confidence);

  // --- Missing Fields ---
  if (!result.productType) result.missingFields.push("productType");
  if (!result.goal) result.missingFields.push("goal");
  if (!result.scale) result.missingFields.push("scale");
  if (result.features.length <= 1) result.missingFields.push("features");
  if (!result.projectName) result.missingFields.push("projectName");

  return result;
}
