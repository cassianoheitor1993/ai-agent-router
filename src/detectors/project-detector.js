import { readdir, stat } from "fs/promises";
import { resolve, basename } from "path";
import { getConfig } from "../utils/config.js";
import { debug } from "../utils/logger.js";

const LANG_MARKERS = {
  javascript: ["package.json"],
  typescript: ["tsconfig.json"],
  python: ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"],
  java: ["pom.xml", "build.gradle", "build.gradle.kts"],
  csharp: ["*.csproj", "*.sln"],
  go: ["go.mod"],
  rust: ["Cargo.toml"],
  ruby: ["Gemfile"],
  php: ["composer.json"],
};

export async function detectProject(projectDir = null) {
  const config = getConfig();
  const dir = projectDir || config.rootDir;
  debug(`Detecting project at: ${dir}`);

  const result = {
    exists: false,
    language: null,
    framework: null,
  };

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);

    for (const [lang, markers] of Object.entries(LANG_MARKERS)) {
      for (const marker of markers) {
        if (marker.includes("*")) {
          const pattern = marker.replace("*", "");
          if (files.some((f) => f.endsWith(pattern))) {
            result.language = lang;
            break;
          }
        } else if (files.includes(marker)) {
          result.language = lang;
          break;
        }
      }
      if (result.language) break;
    }

    result.exists = result.language !== null;

    if (result.language === "javascript" || result.language === "typescript") {
      result.framework = await detectJSFramework(dir, files);
    } else if (result.language === "python") {
      result.framework = await detectPythonFramework(dir, files);
    }
  } catch (err) {
    debug(`Detection error: ${err.message}`);
  }

  return result;
}

async function detectJSFramework(dir, files) {
  try {
    const pkgPath = resolve(dir, "package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const frameworkMap = {
      next: "Next.js",
      nuxt: "Nuxt",
      react: "React",
      vue: "Vue",
      svelte: "Svelte",
      "@nestjs/core": "NestJS",
      fastify: "Fastify",
      express: "Express",
      koa: "Koa",
      vite: "Vite",
      "expo": "Expo",
      "react-native": "React Native",
      "@angular/core": "Angular",
    };

    for (const [pkgName, name] of Object.entries(frameworkMap)) {
      if (deps[pkgName]) return name;
    }
  } catch {
    // package.json not readable
  }
  return null;
}

async function detectPythonFramework(dir, files) {
  if (files.includes("requirements.txt")) {
    try {
      const content = await readFile(resolve(dir, "requirements.txt"), "utf-8");
      if (content.includes("django")) return "Django";
      if (content.includes("fastapi")) return "FastAPI";
      if (content.includes("flask")) return "Flask";
    } catch {}
  }
  if (files.includes("pyproject.toml")) {
    try {
      const content = await readFile(resolve(dir, "pyproject.toml"), "utf-8");
      if (content.includes("django")) return "Django";
      if (content.includes("fastapi")) return "FastAPI";
    } catch {}
  }
  return null;
}

async function readFile(path, encoding) {
  const { readFile: rf } = await import("fs/promises");
  return rf(path, encoding);
}
