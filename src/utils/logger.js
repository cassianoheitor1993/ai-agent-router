import chalk from "chalk";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
let currentLevel = LEVELS.info;

export function setLogLevel(level) {
  if (LEVELS[level] !== undefined) currentLevel = LEVELS[level];
}

function timestamp() {
  return new Date().toISOString().slice(11, 23);
}

function shouldLog(level) {
  return (LEVELS[level] ?? 1) >= currentLevel;
}

export function debug(msg, data) {
  if (!shouldLog("debug")) return;
  console.error(`${chalk.gray(timestamp())} ${chalk.cyan("[DEBUG]")} ${msg}`, data ?? "");
}

export function info(msg) {
  if (!shouldLog("info")) return;
  console.error(`${chalk.gray(timestamp())} ${chalk.blue("[INFO]")}  ${msg}`);
}

export function warn(msg) {
  if (!shouldLog("warn")) return;
  console.error(`${chalk.gray(timestamp())} ${chalk.yellow("[WARN]")}  ${msg}`);
}

export function error(msg) {
  if (!shouldLog("error")) return;
  console.error(`${chalk.gray(timestamp())} ${chalk.red("[ERROR]")} ${msg}`);
}

export function step(stepName, model, status) {
  const statusIcon = status === "start" ? chalk.cyan("▶")
    : status === "ok" ? chalk.green("✓")
    : status === "fail" ? chalk.red("✗")
    : chalk.yellow("…");

  console.error(`${chalk.gray(timestamp())} ${statusIcon} ${chalk.white(stepName)} ${chalk.gray(`[${model}]`)} ${status === "start" ? "" : status}`);
}

export function section(title) {
  console.error(`\n${chalk.bold.white("═══")} ${chalk.bold.cyan(title)} ${chalk.bold.white("═══")}\n`);
}

export function result(label, value) {
  console.error(`  ${chalk.gray(label + ":")} ${chalk.white(value)}`);
}
