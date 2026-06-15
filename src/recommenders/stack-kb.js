export const apiStacks = [
  {
    name: "NestJS + Fastify",
    backend: "NestJS (Fastify adapter)",
    frontend: null,
    mobile: null,
    database: "PostgreSQL",
    queue: "BullMQ",
    cache: "Redis",
    orm: "Prisma",
    language: "TypeScript",
    why: "Enterprise-grade TypeScript backend with modular architecture, decorators, and built-in patterns (guards, interceptors, pipes). Fastify adapter gives 2x performance over Express.",
    scaleFit: { min: "small", max: "enterprise", description: "Scales from startup to enterprise" },
    teamFit: "medium-team",
    tags: ["auth", "queue", "realtime", "multitenant"],
    featureScore: (f) => {
      const scores = { auth: 3, crud: 3, realtime: 2, jobs: 3, multitenant: 3, admin: 2 };
      return scores[f] || 1;
    },
  },
  {
    name: "Fastify + Prisma",
    backend: "Fastify",
    frontend: null,
    mobile: null,
    database: "PostgreSQL",
    queue: "BullMQ",
    cache: "Redis",
    orm: "Prisma",
    language: "TypeScript",
    why: "Lightweight, high-performance Node.js framework. Excellent for APIs that need throughput. Plugin architecture keeps code organized.",
    scaleFit: { min: "mvp", max: "large", description: "Great for performance-critical APIs" },
    teamFit: "small-team",
    tags: ["queue"],
    featureScore: (f) => {
      const scores = { auth: 2, crud: 3, realtime: 2, jobs: 2 };
      return scores[f] || 1;
    },
  },
  {
    name: "Express + Drizzle",
    backend: "Express",
    frontend: null,
    mobile: null,
    database: "PostgreSQL",
    queue: "BullMQ",
    cache: null,
    orm: "Drizzle",
    language: "TypeScript",
    why: "Simple, battle-tested. Largest ecosystem. Best for quick APIs and MVPs. Drizzle ORM is lightweight and type-safe.",
    scaleFit: { min: "mvp", max: "medium", description: "Best for MVPs and small-medium APIs" },
    teamFit: "solo",
    tags: [],
    featureScore: (f) => {
      const scores = { auth: 2, crud: 3 };
      return scores[f] || 1;
    },
  },
  {
    name: "FastAPI + SQLAlchemy",
    backend: "FastAPI",
    frontend: null,
    mobile: null,
    database: "PostgreSQL",
    queue: "Celery",
    cache: "Redis",
    orm: "SQLAlchemy",
    language: "Python",
    why: "Python async API with auto-generated OpenAPI docs. Great for data-heavy APIs and ML integration.",
    scaleFit: { min: "small", max: "large", description: "Strong for data/ML APIs" },
    teamFit: "medium-team",
    tags: ["auth", "jobs", "analytics"],
    featureScore: (f) => {
      const scores = { auth: 2, crud: 3, files: 2, analytics: 3, search: 2 };
      return scores[f] || 1;
    },
  },
  {
    name: "Django + DRF",
    backend: "Django REST Framework",
    frontend: null,
    mobile: null,
    database: "PostgreSQL",
    queue: "Celery",
    cache: "Redis",
    orm: "Django ORM",
    language: "Python",
    why: "Batteries-included Python framework. Admin panel, auth, ORM out of the box. Fastest path to a full-featured API.",
    scaleFit: { min: "small", max: "large", description: "Rapid development with built-in admin" },
    teamFit: "solo",
    tags: ["auth", "admin", "jobs", "analytics"],
    featureScore: (f) => {
      const scores = { auth: 3, crud: 3, admin: 3, jobs: 2, analytics: 2 };
      return scores[f] || 1;
    },
  },
];

export const webAppStacks = [
  {
    name: "Next.js + Tailwind",
    backend: "Next.js API routes",
    frontend: "React + Next.js",
    mobile: null,
    database: "PostgreSQL",
    queue: null,
    cache: null,
    orm: "Prisma",
    language: "TypeScript",
    why: "Full-stack React framework with SSR/SSG/ISR. API routes + server components. Best developer experience for web apps.",
    scaleFit: { min: "mvp", max: "large", description: "Scales well with Vercel or self-hosted" },
    teamFit: "small-team",
    tags: ["auth", "crud", "realtime", "payments", "search"],
    featureScore: (f) => {
      const scores = { auth: 3, crud: 3, payments: 2, search: 2, admin: 2 };
      return scores[f] || 1;
    },
  },
  {
    name: "React + Vite + Express",
    backend: "Express",
    frontend: "React + Vite",
    mobile: null,
    database: "PostgreSQL",
    queue: null,
    cache: null,
    orm: "Prisma",
    language: "TypeScript",
    why: "Separated frontend/backend. Vite for fast builds. Maximum flexibility in deployment.",
    scaleFit: { min: "mvp", max: "medium", description: "Good for SPAs with separate API" },
    teamFit: "solo",
    tags: ["auth", "crud"],
    featureScore: (f) => {
      const scores = { auth: 2, crud: 3 };
      return scores[f] || 1;
    },
  },
  {
    name: "Vue + Nuxt + Fastify",
    backend: "Fastify",
    frontend: "Vue + Nuxt",
    mobile: null,
    database: "PostgreSQL",
    queue: null,
    cache: null,
    orm: "Drizzle",
    language: "TypeScript",
    why: "Vue ecosystem with Nuxt for SSR. Fastify backend for performance. Great for content-heavy sites.",
    scaleFit: { min: "small", max: "large", description: "Strong for content/dashboard apps" },
    teamFit: "medium-team",
    tags: ["auth", "crud", "search"],
    featureScore: (f) => {
      const scores = { auth: 2, crud: 3, search: 2 };
      return scores[f] || 1;
    },
  },
];

export const fullstackStacks = [
  {
    name: "Next.js Full-Stack",
    backend: "Next.js + tRPC",
    frontend: "React + Next.js",
    mobile: null,
    database: "PostgreSQL",
    queue: "BullMQ",
    cache: "Redis",
    orm: "Prisma",
    language: "TypeScript",
    why: "Single codebase, end-to-end type safety with tRPC. Fast iteration. Ideal for startups and SaaS.",
    scaleFit: { min: "mvp", max: "medium", description: "Startup speed, scales to medium" },
    teamFit: "small-team",
    tags: ["auth", "crud", "payments", "realtime", "admin"],
    featureScore: (f) => {
      const scores = { auth: 3, crud: 3, realtime: 2, payments: 2, admin: 2, notifications: 2 };
      return scores[f] || 1;
    },
  },
  {
    name: "NestJS + React + Vite",
    backend: "NestJS",
    frontend: "React + Vite",
    mobile: "React Native Expo",
    database: "PostgreSQL",
    queue: "BullMQ",
    cache: "Redis",
    orm: "Prisma",
    language: "TypeScript",
    why: "Enterprise architecture. NestJS for robust backend, React for SPA, shared TypeScript types. React Native for mobile.",
    scaleFit: { min: "medium", max: "enterprise", description: "Enterprise-grade full-stack" },
    teamFit: "large-team",
    tags: ["auth", "crud", "realtime", "payments", "jobs", "admin", "multitenant", "integrations"],
    featureScore: (f) => {
      const scores = { auth: 3, crud: 3, realtime: 2, payments: 2, jobs: 3, admin: 2, multitenant: 3, integrations: 2 };
      return scores[f] || 1;
    },
  },
  {
    name: "Remix + Prisma",
    backend: "Remix",
    frontend: "React + Remix",
    mobile: null,
    database: "PostgreSQL",
    queue: null,
    cache: null,
    orm: "Prisma",
    language: "TypeScript",
    why: "Web standards-based full-stack framework. Excellent for form-heavy apps. Progressive enhancement built-in.",
    scaleFit: { min: "mvp", max: "medium", description: "Web-standards, form-heavy apps" },
    teamFit: "small-team",
    tags: ["auth", "crud", "files"],
    featureScore: (f) => {
      const scores = { auth: 2, crud: 3, files: 2 };
      return scores[f] || 1;
    },
  },
];

export const mobileStacks = [
  {
    name: "React Native Expo",
    backend: "Fastify",
    frontend: null,
    mobile: "React Native + Expo",
    database: "PostgreSQL",
    queue: null,
    cache: null,
    orm: "Prisma",
    language: "TypeScript",
    why: "Cross-platform mobile with shared TypeScript types. Expo simplifies build and deployment. Fastify backend for API.",
    scaleFit: { min: "mvp", max: "large", description: "iOS + Android from single codebase" },
    teamFit: "small-team",
    tags: ["auth", "crud", "files", "notifications"],
    featureScore: (f) => {
      const scores = { auth: 3, crud: 3, files: 2, notifications: 2 };
      return scores[f] || 1;
    },
  },
  {
    name: "Flutter + Firebase",
    backend: "Firebase / Supabase",
    frontend: null,
    mobile: "Flutter",
    database: "Firestore / Postgres",
    queue: null,
    cache: null,
    orm: null,
    language: "Dart",
    why: "High-performance cross-platform with native-like UI. Firebase for rapid backend. Great for consumer apps.",
    scaleFit: { min: "mvp", max: "large", description: "Consumer apps with real-time needs" },
    teamFit: "small-team",
    tags: ["auth", "realtime", "files", "notifications"],
    featureScore: (f) => {
      const scores = { auth: 3, realtime: 3, files: 2, notifications: 2 };
      return scores[f] || 1;
    },
  },
];

export const microservicesStacks = [
  {
    name: "NestJS Microservices",
    backend: "NestJS + Kafka",
    frontend: "React + Vite",
    mobile: null,
    database: "PostgreSQL (per service)",
    queue: "Kafka",
    cache: "Redis (per service)",
    orm: "Prisma",
    language: "TypeScript",
    why: "NestJS has built-in microservice transports (Kafka, RabbitMQ, gRPC). Strong patterns for event-driven systems.",
    scaleFit: { min: "medium", max: "enterprise", description: "Event-driven microservices at scale" },
    teamFit: "large-team",
    tags: ["auth", "crud", "realtime", "jobs", "multitenant", "integrations"],
    featureScore: (f) => {
      const scores = { auth: 3, crud: 3, realtime: 3, jobs: 3, multitenant: 3, integrations: 3 };
      return scores[f] || 1;
    },
  },
  {
    name: "Go + NATS + Svelte",
    backend: "Go (Chi/Gin)",
    frontend: "SvelteKit",
    mobile: null,
    database: "PostgreSQL",
    queue: "NATS",
    cache: "Redis",
    orm: "sqlc",
    language: "Go",
    why: "Go for high-performance services. NATS for lightweight messaging. Svelte for lean frontend. Excellent resource efficiency.",
    scaleFit: { min: "large", max: "enterprise", description: "Maximum performance, minimum resources" },
    teamFit: "large-team",
    tags: ["realtime", "jobs", "integrations"],
    featureScore: (f) => {
      const scores = { realtime: 3, jobs: 3, integrations: 2 };
      return scores[f] || 1;
    },
  },
];

export const cliStacks = [
  {
    name: "Node.js + Commander",
    backend: null,
    frontend: null,
    mobile: null,
    database: null,
    queue: null,
    cache: null,
    orm: null,
    language: "TypeScript",
    why: "Node.js for cross-platform CLI. Commander for argument parsing. TypeScript for type safety. Fast to build and distribute via npm.",
    scaleFit: { min: "mvp", max: "medium", description: "Single CLI tool or package" },
    teamFit: "solo",
    tags: [],
    featureScore: () => 1,
  },
  {
    name: "Go CLI",
    backend: null,
    frontend: null,
    mobile: null,
    database: null,
    queue: null,
    cache: null,
    orm: null,
    language: "Go",
    why: "Go compiles to single binary. No runtime dependencies. Fast startup. Best for CLI tools that need performance.",
    scaleFit: { min: "mvp", max: "large", description: "Performance CLI tools" },
    teamFit: "solo",
    tags: [],
    featureScore: () => 1,
  },
];

export const libraryStacks = [
  {
    name: "TypeScript Library",
    backend: null,
    frontend: null,
    mobile: null,
    database: null,
    queue: null,
    cache: null,
    orm: null,
    language: "TypeScript",
    why: "TypeScript for maximum compatibility. Build with tsup/tsc. Publish to npm. Works in Node.js and browsers.",
    scaleFit: { min: "mvp", max: "large", description: "npm package, universal" },
    teamFit: "solo",
    tags: [],
    featureScore: () => 1,
  },
];

export const dataStacks = [
  {
    name: "Python Data Pipeline",
    backend: "FastAPI",
    frontend: null,
    mobile: null,
    database: "PostgreSQL + ClickHouse",
    queue: "Celery + Redis",
    cache: "Redis",
    orm: "SQLAlchemy",
    language: "Python",
    why: "Python ecosystem for data (Pandas, NumPy, Pydantic). FastAPI for API layer. Celery for async processing.",
    scaleFit: { min: "medium", max: "enterprise", description: "Data-heavy pipelines and ETL" },
    teamFit: "medium-team",
    tags: ["jobs", "analytics", "search"],
    featureScore: (f) => {
      const scores = { jobs: 3, analytics: 3, search: 2 };
      return scores[f] || 1;
    },
  },
];
