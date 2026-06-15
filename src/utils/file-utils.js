import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve, relative } from "path";
import { getConfig } from "./config.js";
import { debug, warn } from "./logger.js";

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function writeOutputFile(relativePath, content) {
  const config = getConfig();
  const fullPath = resolve(config.projectDir, relativePath);

  const relToInstall = relative(config.installDir, fullPath);
  if (!relToInstall.startsWith("..") && relToInstall !== "" && !relToInstall.includes("node_modules")) {
    warn(`Skipping write to agent install dir: ${relativePath}`);
    return null;
  }

  await ensureDir(dirname(fullPath));
  await writeFile(fullPath, content, "utf-8");
  debug(`Wrote file: ${relativePath}`);
  return relativePath;
}

export function extractCodeBlocks(text) {
  const blocks = [];
  const lines = text.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    const fileMatch = line.match(/^\s*(?:\/\/|#|--)\s*file\s*:\s*(\S+)/i);
    if (fileMatch) {
      const filePath = fileMatch[1];

      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith("```")) {
        j++;
      }

      if (j < lines.length) {
        const fenceLine = lines[j].trim();
        const langMatch = fenceLine.match(/^```(\w+)?/);
        const language = langMatch ? (langMatch[1] || "text") : "text";
        j++;

        const codeLines = [];
        while (j < lines.length && !lines[j].trim().startsWith("```")) {
          codeLines.push(lines[j]);
          j++;
        }

        const code = codeLines.join("\n").trim();
        if (code.length > 0) {
          blocks.push({ language, code, filePath });
        }
        i = j + 1;
        continue;
      }
    }

    const fenceMatch = line.match(/^```(\w+)?/);
    if (fenceMatch && !line.startsWith("``` ")) {
      const language = fenceMatch[1] || "text";
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join("\n").trim();
      if (code.length > 0) {
        blocks.push({ language, code, filePath: null });
      }
    }
    i++;
  }

  return blocks;
}

export function extractEntityName(code, language) {
  const patterns = [
    /\bexport\s+(?:default\s+)?(?:class|function|const)\s+(\w+)/,
    /\bexport\s+(?:interface|type|enum)\s+(\w+)/,
    /^(?:class|function|const)\s+(\w+)/m,
    /\bmodel\s+(\w+)\s*\{/i,
    /\b@Entity\s*\(\s*\)\s*\n?\s*(?:export\s+)?class\s+(\w+)/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) return match[1];
  }
  return null;
}
