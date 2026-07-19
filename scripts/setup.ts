import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const VENV = path.join(ROOT, ".venv");
const REQUIREMENTS = path.join(ROOT, "python", "requirements.txt");
const CONFIG = path.join(ROOT, ".python-runtime.json");

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  return result.status === 0;
}

function output(command: string, args: string[]) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

function detectPython(): string {
  const candidates =
    process.platform === "win32"
      ? ["py", "python"]
      : ["python3", "python"];

  for (const candidate of candidates) {
    const result = output(candidate, ["--version"]);

    if (result.status === 0) {
      console.log(`Found ${candidate}`);

      const version =
        result.stdout.trim() || result.stderr.trim();

      console.log(version);

      const match = version.match(/Python (\d+)\.(\d+)/);

      if (!match) continue;

      const major = Number(match[1]);
      const minor = Number(match[2]);

      if (major < 3 || (major === 3 && minor < 11)) {
        throw new Error("Python 3.11+ is required.");
      }

      return candidate;
    }
  }

  throw new Error(
    "Python not found.\nPlease install Python 3.11 or later."
  );
}

function createVenv(python: string) {
  if (fs.existsSync(VENV)) {
    console.log("Virtual environment already exists.");
    return;
  }

  console.log("Creating virtual environment...");

  if (!run(python, ["-m", "venv", ".venv"])) {
    throw new Error("Failed to create virtual environment.");
  }
}

function pipExecutable() {
  if (process.platform === "win32") {
    return path.join(VENV, "Scripts", "python.exe");
  }

  return path.join(VENV, "bin", "python");
}

function installRequirements() {
  if (!fs.existsSync(REQUIREMENTS)) {
    console.log("No requirements.txt found.");
    return;
  }

  console.log("Installing Python packages...");

  const python = pipExecutable();

  if (!run(python, ["-m", "pip", "install", "--upgrade", "pip"])) {
    throw new Error("Failed to upgrade pip.");
  }

  if (
    !run(python, [
      "-m",
      "pip",
      "install",
      "-r",
      REQUIREMENTS,
    ])
  ) {
    throw new Error("Failed to install requirements.");
  }
}

function writeRuntimeConfig() {
  const config = {
    python: pipExecutable(),
  };

  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));

  console.log("Generated .python-runtime.json");
}

async function main() {
  console.log("==================================");
  console.log("       CodeBrix Setup");
  console.log("==================================");

  const python = detectPython();

  createVenv(python);

  installRequirements();

  writeRuntimeConfig();

  console.log();
  console.log("Setup Complete");
  console.log();
  console.log("You can now run:");
  console.log("pnpm dev");
}

main().catch((err) => {
  console.error();
  console.error("Setup Failed");
  console.error(err.message);
  process.exit(1);
});