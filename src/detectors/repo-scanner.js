import { readdir, stat, readFile } from "fs/promises";
import { resolve, basename, relative } from "path";
import { getConfig } from "../utils/config.js";
import { debug } from "../utils/logger.js";

const ARCH_PATTERNS = {
  "nestjs monolith": { dirs: ["src/modules", "src/controllers"], filePatterns: [/\.module\.ts$/] },
  "next.js app": { dirs: ["app", "pages"], filePatterns: [/next\.config\.(js|ts|mjs)$/] },
  "react spa": { dirs: ["src/components", "src/pages"], filePatterns: [/vite\.config\.(js|ts)$/] },
  "express api": { dirs: ["routes", "controllers"], filePatterns: [/app\.(js|ts)$/, /server\.(js|ts)$/] },
  "fastapi": { dirs: ["app", "routers", "models"], filePatterns: [/main\.py$/] },
  "django": { dirs: ["templates", "static"], filePatterns: [/manage\.py$/, /settings\.py$/] },
};

export async function scanRepository(projectDir = null) {
  const config = getConfig();
  const dir = projectDir || config.rootDir;
  debug(`Scanning repository: ${dir}`);

  const result = {
    type: "unknown",
    language: null,
    modules: [],
    database: null,
    queue: null,
    architecture: "unknown",
    dependencies: [],
    structure: [],
  };

  try {
    result.structure = await scanDirectory(dir, dir, 3);

    const pkgPath = resolve(dir, "package.json");
    try {
      const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      result.dependencies = Object.keys(deps);

      result.language = "typescript";
      result.type = await classifyArchitecture(dir, "typescript", deps);

      if (deps["@nestjs/core"]) result.type = "nestjs monolith";
      else if (deps["next"]) result.type = "next.js app";
      else if (deps["fastify"]) result.type = "fastify api";
      else if (deps["express"]) result.type = "express api";

      result.database = detectDatabase(deps);
      result.queue = detectQueue(deps);
      result.modules = await detectModules(dir, result.type);
    } catch {
      // No package.json
    }

    const pyPath = resolve(dir, "requirements.txt");
    try {
      const pyContent = await readFile(pyPath, "utf-8");
      result.language = "python";
      if (pyContent.includes("django")) result.type = "django app";
      else if (pyContent.includes("fastapi")) result.type = "fastapi api";
      else if (pyContent.includes("flask")) result.type = "flask api";
      result.database = pyContent.includes("sqlalchemy") ? "sqlalchemy" :
        pyContent.includes("django") ? "django-orm" : null;
    } catch {
      // No requirements.txt
    }

    result.architecture = inferArchitecture(result.type);

  } catch (err) {
    debug(`Scan error: ${err.message}`);
  }

  return result;
}

async function scanDirectory(baseDir, currentDir, maxDepth) {
  if (maxDepth <= 0) return [];
  const items = [];

  try {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      const fullPath = resolve(currentDir, entry.name);
      const relPath = relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        const children = await scanDirectory(baseDir, fullPath, maxDepth - 1);
        items.push({ name: entry.name, path: relPath, type: "dir", children });
      } else {
        items.push({ name: entry.name, path: relPath, type: "file" });
      }
    }
  } catch {}

  return items;
}

async function classifyArchitecture(dir, lang, deps) {
  if (deps["next"]) return "next.js app";
  if (deps["@nestjs/core"]) return "nestjs monolith";
  if (deps["express"]) return "express api";
  if (deps["fastify"]) return "fastify api";
  if (deps["react"]) return "react spa";
  return "unknown";
}

function detectDatabase(deps) {
  const dbMap = {
    "@prisma/client": "Prisma + PostgreSQL",
    prisma: "Prisma",
    typeorm: "TypeORM",
    drizzle: "Drizzle",
    mongoose: "MongoDB",
    mysql2: "MySQL",
    pg: "PostgreSQL",
    "better-sqlite3": "SQLite",
  };

  for (const [pkg, name] of Object.entries(dbMap)) {
    if (deps[pkg]) return name;
  }
  return null;
}

function detectQueue(deps) {
  const queueMap = {
    bullmq: "BullMQ",
    bull: "Bull",
    kafkajs: "Kafka",
    "ioredis": "Redis Queue",
    "amqplib": "RabbitMQ",
  };

  for (const [pkg, name] of Object.entries(queueMap)) {
    if (deps[pkg]) return name;
  }
  return null;
}

async function detectModules(dir, projectType) {
  const modules = [];

  if (projectType === "nestjs monolith") {
    const srcPath = resolve(dir, "src");
    try {
      const entries = await readdir(srcPath, { withFileTypes: true });
      modules.push(
        ...entries
          .filter((e) => e.isDirectory() && !e.name.startsWith("."))
          .map((e) => e.name)
      );
    } catch {}
  }

  if (projectType === "next.js app" || projectType === "react spa") {
    const appPath = resolve(dir, "src", "app") || resolve(dir, "app");
    try {
      const entries = await readdir(appPath, { withFileTypes: true });
      modules.push(
        ...entries
          .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_"))
          .map((e) => e.name)
      );
    } catch {}
  }

  return modules;
}

function inferArchitecture(type) {
  if (type.includes("monolith")) return "monolithic";
  if (type.includes("next")) return "hybrid (SSR + API)";
  if (type.includes("api") || type.includes("fastapi")) return "api server";
  if (type.includes("spa")) return "spa";
  return "unknown";
}
