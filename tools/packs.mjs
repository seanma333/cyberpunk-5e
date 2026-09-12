#!/usr/bin/env node
/**
 * Compendium pack build tool.
 *
 * Authored sources live as JSON under src/packs/<pack>/ and are compiled into
 * the LevelDB directories under packs/<pack>/ that Foundry actually loads.
 * The LevelDB output is gitignored; src/packs/ is the tracked source of truth.
 *
 *   node tools/packs.mjs pack   [pack...]   src/packs/<pack>/ -> packs/<pack>/
 *   node tools/packs.mjs unpack [pack...]   packs/<pack>/     -> src/packs/<pack>/
 *
 * With no pack names, every pack is processed. Foundry must be closed for
 * `pack`, which writes to the LevelDB files Foundry holds open.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src", "packs");
const OUT = path.join(ROOT, "packs");
const FVTT = path.join(ROOT, "node_modules", ".bin", "fvtt");

const module_ = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));

/** Pack names from module.json, plus any directory present on disk. */
function allPacks() {
  const names = new Set((module_.packs ?? []).map((p) => p.name));
  for (const dir of [SRC, OUT]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) names.add(entry.name);
    }
  }
  return [...names].sort();
}

/** Packing into a LevelDB that Foundry has open corrupts it. */
function foundryIsRunning() {
  try {
    execFileSync("pgrep", ["-f", "Foundry Virtual Tabletop"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function fvtt(args) {
  execFileSync(FVTT, ["package", ...args, "--id", module_.id, "--type", "Module"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const [action, ...requested] = process.argv.slice(2);
if (!["pack", "unpack"].includes(action)) {
  console.error("usage: node tools/packs.mjs <pack|unpack> [pack...]");
  process.exit(1);
}

if (action === "pack" && foundryIsRunning() && !process.env.FORCE_PACK) {
  console.error(
    "Foundry is running and holds the pack databases open. Quit Foundry first,\n" +
      "or set FORCE_PACK=1 if you are certain the packs are not loaded.",
  );
  process.exit(1);
}

const packs = requested.length ? requested : allPacks();
let failed = 0;

for (const name of packs) {
  const srcDir = path.join(SRC, name);
  const documents = fs.existsSync(srcDir)
    ? fs.readdirSync(srcDir).filter((f) => f.endsWith(".json"))
    : [];

  try {
    if (action === "pack") {
      if (!documents.length) {
        console.log(`skip   ${name} (no JSON sources)`);
        continue;
      }
      // pack: --in is the source dir, --out is the PARENT of the LevelDB dir.
      fvtt(["pack", "-n", name, "--in", srcDir, "--out", OUT]);
      console.log(`packed ${name} (${documents.length} documents)`);
    } else {
      if (!fs.existsSync(path.join(OUT, name))) {
        console.log(`skip   ${name} (no compiled pack)`);
        continue;
      }
      // unpack: --in is the PARENT of the LevelDB dir, --out is the dest dir.
      // Unpack to a staging dir first: a failure then leaves src/packs intact,
      // and we can compare before replacing anything.
      const staged = fs.mkdtempSync(path.join(os.tmpdir(), `unpack-${name}-`));
      fvtt(["unpack", "-n", name, "--in", OUT, "--out", staged]);
      const fresh = fs.readdirSync(staged).filter((f) => f.endsWith(".json"));

      // Refuse to silently drop authored documents that the compiled pack lacks,
      // unless this pack was named explicitly on the command line.
      if (fresh.length < documents.length && !requested.includes(name)) {
        console.error(
          `REFUSED ${name}: compiled pack has ${fresh.length} documents but ` +
            `src/packs has ${documents.length}. Unpacking would discard ` +
            `${documents.length - fresh.length}. Re-run with the pack named ` +
            `explicitly to overwrite: npm run unpack -- ${name}`,
        );
        fs.rmSync(staged, { recursive: true, force: true });
        failed++;
        continue;
      }

      fs.rmSync(srcDir, { recursive: true, force: true });
      fs.mkdirSync(srcDir, { recursive: true });
      for (const file of fresh) fs.copyFileSync(path.join(staged, file), path.join(srcDir, file));
      // Keep empty packs tracked in git so `pack` still has a directory to read.
      if (!fresh.length) fs.writeFileSync(path.join(srcDir, ".gitkeep"), "");
      fs.rmSync(staged, { recursive: true, force: true });
      console.log(`unpacked ${name} (${fresh.length} documents)`);
    }
  } catch (error) {
    failed++;
    console.error(`FAILED ${name}: ${(error.stderr?.toString() || error.message).trim().split("\n")[0]}`);
  }
}

process.exit(failed ? 1 : 0);
