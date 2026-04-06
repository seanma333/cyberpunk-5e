#!/usr/bin/env node
/**
 * Monster Converter: Custom Schema → Foundry dnd5e 3.3.1 NPC Actor JSON
 *
 * Reads tmp/monsters_combined.json and writes individual JSON files to
 * packs/cyberpunk-npc-templates/_source/.
 *
 * Usage: node scripts/convert-monsters.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "tmp", "monsters_combined.json");
const OUTPUT_DIR = path.join(ROOT, "packs", "cyberpunk-npc-templates", "_source");

// ---------------------------------------------------------------------------
// Icon matching — scan assets for weapon and cyberware icons
// ---------------------------------------------------------------------------

const ICON_DIRS = [
  { dir: path.join(ROOT, "assets", "weapon_icons", "firearm_icons"), prefix: "modules/cyberpunk-5e/assets/weapon_icons/firearm_icons/" },
  { dir: path.join(ROOT, "assets", "weapon_icons", "modification_icons"), prefix: "modules/cyberpunk-5e/assets/weapon_icons/modification_icons/" },
  { dir: path.join(ROOT, "assets", "cyberware_icons"), prefix: "modules/cyberpunk-5e/assets/cyberware_icons/" },
  { dir: path.join(ROOT, "assets", "grenade_icons"), prefix: "modules/cyberpunk-5e/assets/grenade_icons/" },
];

// Hardcoded icon mappings (Foundry default icon pack + custom)
const MANUAL_ICONS = {
  // Weapons
  "javelin": "icons/weapons/polearms/javelin.webp",
  "dart": "icons/weapons/ammunition/arrows-bodkin-yellow-red.webp",
  "spear": "icons/weapons/polearms/spear-flared-worn-grey.webp",
  "blowgun": "icons/weapons/staves/staff-simple-brown.webp",
  "net": "icons/tools/fishing/net-simple-tan.webp",
  "sickle": "icons/weapons/sickles/sickle-curved.webp",
  "club": "icons/weapons/clubs/club-baton-blue.webp",
  "handaxe": "icons/weapons/axes/axe-broad-black.webp",
  "shortbow": "icons/weapons/bows/shortbow-recurve.webp",
  "halberd": "icons/weapons/polearms/halberd-crescent-glowing.webp",
  "battleaxe": "icons/weapons/polearms/halberd-crescent-engraved-steel.webp",
  "war pick": "icons/weapons/axes/pickaxe-double-brown.webp",
  "lance": "icons/weapons/polearms/spear-barbed-silver.webp",
  "scimitar": "icons/weapons/swords/sword-katana.webp",
  "maul": "icons/weapons/hammers/hammer-double-steel-embossed.webp",
  "quarterstaff": "icons/weapons/staves/staff-simple-gold.webp",
  "morningstar": "icons/weapons/maces/mace-round-spiked-black.webp",
  "flail": "icons/weapons/maces/flail-ball-grey.webp",
  "longbow": "icons/weapons/bows/longbow-leather-green.webp",
  "light crossbow": "icons/weapons/crossbows/crossbow-simple-black.webp",
  "greatsword": "icons/weapons/swords/greatsword-guard-gem-blue.webp",
  "shortsword": "icons/weapons/swords/sword-guard-brown.webp",
  "greataxe": "icons/weapons/axes/axe-double.webp",
  "greatclub": "icons/weapons/maces/mace-spiked-steel-grey.webp",
  "rapier": "icons/weapons/swords/swords-sharp-worn.webp",
  "glaive": "icons/weapons/polearms/glaive-hooked-steel.webp",
  "pike": "icons/weapons/polearms/pike-flared-brown.webp",
  "mace": "icons/weapons/maces/mace-flanged-steel-grey.webp",
  "sling": "icons/weapons/slings/slingshot-wood.webp",
  "dagger": "icons/weapons/daggers/dagger-jeweled-purple.webp",
  "hand crossbow": "icons/weapons/crossbows/handcrossbow-green.webp",
  "warhammer": "icons/weapons/hammers/hammer-war-rounding.webp",
  "heavy crossbow": "icons/weapons/crossbows/crossbow-blue.webp",
  "longsword": "icons/weapons/swords/greatsword-crossguard-steel.webp",
  "whip": "icons/weapons/misc/whip-red-yellow.webp",
  "trident": "icons/weapons/polearms/trident-silver-blue.webp",
  "light hammer": "icons/weapons/hammers/shorthammer-claw.webp",
  "katana": "icons/weapons/swords/sword-katana-purple.webp",
  "bola": "icons/weapons/thrown/bolas-steel.webp",
  "heavy chain": "icons/tools/fasteners/chain-steel-grey.webp",
  "combat knife": "icons/weapons/daggers/dagger-serrated-black.webp",
  "shock baton": "icons/commodities/tech/tube-chamber-lightning.webp",

  // Common traits
  "multiattack": "icons/skills/melee/blade-tips-triple-steel.webp",
  "evasion": "icons/magic/water/pseudopod-teal.webp",
  "spellcasting": "icons/magic/light/projectiles-star-purple.webp",
  "innate spellcasting": "icons/magic/light/projectiles-star-purple.webp",
  "pack tactics": "icons/creatures/abilities/paw-print-orange.webp",
  "uncanny dodge": "icons/magic/air/air-wave-gust-blue.webp",
};

// Build a map of normalized name → relative icon path
const ICON_MAP = Object.assign({}, MANUAL_ICONS);
for (const { dir, prefix } of ICON_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".png") && !file.endsWith(".jpg") && !file.endsWith(".webp")) continue;
    const key = path.basename(file, path.extname(file)).toLowerCase().replace(/[-_]+/g, " ");
    ICON_MAP[key] = prefix + file;
  }
}

/**
 * Match an item name to an icon. Strips parenthetical modifiers like "(Powered)"
 * and normalizes for comparison.
 * Returns the icon path or null.
 */
function matchIcon(name) {
  // Strip parenthetical suffixes: "Pump Shotgun (Powered)" → "Pump Shotgun"
  const baseName = name.replace(/\s*\([^)]*\)\s*/g, "").trim();
  const normalized = baseName.toLowerCase().replace(/[-_]+/g, " ");

  // Direct match (exact after normalization)
  if (ICON_MAP[normalized]) return ICON_MAP[normalized];

  // Try with hyphens normalized: "double-barrel" vs "double_barrel"
  const dehyphenated = normalized.replace(/-/g, " ");
  if (ICON_MAP[dehyphenated]) return ICON_MAP[dehyphenated];

  // Word-boundary partial: the icon key must appear as complete words in the name,
  // or the name must appear as complete words in the icon key.
  // e.g. "Dual Magnums" matches "magnum" but "Blade" does NOT match "armblade".
  for (const [key, iconPath] of Object.entries(ICON_MAP)) {
    const keyRe = new RegExp(`\\b${escapeRegex(key)}s?\\b`);
    const nameRe = new RegExp(`\\b${escapeRegex(normalized)}s?\\b`);
    if (keyRe.test(normalized) || nameRe.test(key)) return iconPath;
  }

  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

const CR_PROF = [
  [4, 2], [8, 3], [12, 4], [16, 5], [20, 6], [24, 7], [28, 8], [30, 9],
];

function parseCR(cr) {
  if (cr.includes("/")) {
    const [n, d] = cr.split("/").map(Number);
    return n / d;
  }
  return Number(cr);
}

function proficiencyBonus(crNum) {
  for (const [max, bonus] of CR_PROF) {
    if (crNum <= max) return bonus;
  }
  return 2;
}

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

const SIZE_MAP = {
  Tiny: "tiny",
  Small: "sm",
  Medium: "med",
  Large: "lg",
  Huge: "huge",
  Gargantuan: "grg",
};

const SKILL_MAP = {
  Acrobatics: "acr",
  "Animal Handling": "ani",
  Arcana: "arc",
  Athletics: "ath",
  Deception: "dec",
  History: "his",
  Insight: "ins",
  Intimidation: "itm",
  Investigation: "inv",
  Medicine: "med",
  Nature: "nat",
  Perception: "prc",
  Performance: "prf",
  Persuasion: "per",
  Religion: "rel",
  "Sleight of Hand": "slt",
  Stealth: "ste",
  Survival: "sur",
};

const SKILL_ABILITY = {
  acr: "dex", ani: "wis", arc: "int", ath: "str", dec: "cha",
  his: "int", ins: "wis", itm: "cha", inv: "int", med: "wis",
  nat: "int", prc: "wis", prf: "cha", per: "cha", rel: "int",
  slt: "dex", ste: "dex", sur: "wis",
};

// Standard Foundry dnd5e damage type keys
const DAMAGE_TYPES = new Set([
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder",
]);

// Foundry condition keys
const CONDITION_MAP = {
  blinded: "blinded",
  charmed: "charmed",
  deafened: "deafened",
  exhaustion: "exhaustion",
  frightened: "frightened",
  grappled: "grappled",
  incapacitated: "incapacitated",
  invisible: "invisible",
  paralyzed: "paralyzed",
  petrified: "petrified",
  poisoned: "poisoned",
  prone: "prone",
  restrained: "restrained",
  stunned: "stunned",
  unconscious: "unconscious",
};

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

const ID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const usedIds = new Set();

function generateId() {
  let id;
  do {
    id = "";
    for (let i = 0; i < 16; i++) {
      id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
    }
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

// ---------------------------------------------------------------------------
// Data cleaning — fix corrupted damage_resistances / damage_immunities
// ---------------------------------------------------------------------------

/**
 * The source data has newline-corrupted arrays where skill data leaked into
 * damage resistance/immunity entries. This function cleans individual entries
 * by stripping anything after a newline and filtering out non-damage-type strings.
 */
function cleanDamageArray(arr) {
  if (!arr || !arr.length) return [];
  // Flatten: split each entry on newlines, keep only the first segment
  const cleaned = [];
  for (const raw of arr) {
    const parts = raw.split("\n");
    for (const part of parts) {
      const trimmed = part.trim().toLowerCase();
      if (trimmed) cleaned.push(trimmed);
    }
  }
  return cleaned;
}

/**
 * Parse a cleaned damage array into Foundry trait format.
 * Handles "bludgeoning, piercing, and slashing from nonmagical attacks" pattern.
 */
function parseDamageTraits(arr) {
  const cleaned = cleanDamageArray(arr);
  const values = [];
  const bypasses = [];
  let custom = "";

  // Rejoin to handle multi-entry "and slashing from nonmagical attacks" pattern
  const joined = cleaned.join(", ");

  // Check for nonmagical bypass pattern
  const nonmagicMatch = joined.match(
    /bludgeoning[,\s]+piercing[,\s]+and\s+slashing\s+from\s+nonmagical\s*attacks/i
  );
  if (nonmagicMatch) {
    values.push("bludgeoning", "piercing", "slashing");
    bypasses.push("mgc");
    // Remove the matched pattern and parse remaining
    const remaining = joined.replace(nonmagicMatch[0], "").replace(/^[,\s]+|[,\s]+$/g, "");
    if (remaining) {
      for (const token of remaining.split(",")) {
        const t = token.trim().toLowerCase();
        if (DAMAGE_TYPES.has(t) && !values.includes(t)) values.push(t);
        else if (t && !isSkillOrJunk(t)) custom += (custom ? "; " : "") + t;
      }
    }
  } else {
    for (const token of joined.split(",")) {
      const t = token.trim().toLowerCase();
      if (DAMAGE_TYPES.has(t)) values.push(t);
      else if (t && !isSkillOrJunk(t)) custom += (custom ? "; " : "") + t;
    }
  }

  return { value: values, bypasses, custom };
}

function isSkillOrJunk(str) {
  // Filter out skill entries that leaked in
  return /^(skills?\s|athletics|perception|stealth|intimidation|survival|technology|deception|acrobatics)/i.test(str)
    || /^\+?\d+$/.test(str);
}

function parseConditionImmunities(arr) {
  if (!arr || !arr.length) return { value: [], custom: "" };
  const values = [];
  const customs = [];
  for (const raw of arr) {
    const t = raw.trim().toLowerCase();
    if (CONDITION_MAP[t]) values.push(CONDITION_MAP[t]);
    else if (t) customs.push(t);
  }
  return { value: values, custom: customs.join("; ") };
}

// ---------------------------------------------------------------------------
// Title case
// ---------------------------------------------------------------------------

function titleCase(str) {
  return str.replace(/\w\S*/g, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}

// ---------------------------------------------------------------------------
// Build Foundry actor document
// ---------------------------------------------------------------------------

function buildAbilities(monster) {
  const abilities = {};
  const saves = {};
  for (const st of monster.proficiencies?.saving_throws || []) {
    saves[st.ability] = true;
  }
  for (const ab of ["str", "dex", "con", "int", "wis", "cha"]) {
    abilities[ab] = {
      value: monster.abilities[ab],
      proficient: saves[ab] ? 1 : 0,
      bonuses: { check: "", save: "" },
    };
  }
  return abilities;
}

function buildAttributes(monster) {
  const speed = monster.defense.speed;
  return {
    ac: {
      flat: monster.defense.ac.value,
      calc: "flat",
      formula: "",
    },
    hp: {
      value: monster.defense.hp.average,
      max: monster.defense.hp.average,
      temp: 0,
      tempmax: 0,
      formula: monster.defense.hp.formula,
    },
    init: { ability: "", bonus: "" },
    movement: {
      burrow: speed.burrow ?? 0,
      climb: speed.climb ?? 0,
      fly: speed.fly ?? 0,
      swim: speed.swim ?? 0,
      walk: speed.walk ?? 30,
      units: "ft",
      hover: speed.hover ?? false,
    },
    senses: {
      darkvision: monster.senses?.darkvision ?? 0,
      blindsight: monster.senses?.blindsight ?? 0,
      tremorsense: monster.senses?.tremorsense ?? 0,
      truesight: monster.senses?.truesight ?? 0,
      units: "ft",
      special: "",
    },
    spellcasting: "",
    death: { success: 0, failure: 0 },
    exhaustion: 0,
    inspiration: false,
  };
}

function buildDetails(monster, crNum) {
  return {
    biography: { value: "", public: "" },
    alignment: monster.meta.alignment,
    race: "",
    type: {
      value: monster.meta.type,
      subtype: monster.meta.subtype ?? "",
      swarm: "",
      custom: "",
    },
    environment: "",
    cr: crNum,
    spellLevel: 0,
    source: { custom: "Technomancer's Textbook" },
  };
}

function buildTraits(monster) {
  const dr = parseDamageTraits(monster.defense.damage_resistances);
  const di = parseDamageTraits(monster.defense.damage_immunities);
  const dv = parseDamageTraits(monster.defense.damage_vulnerabilities);
  const ci = parseConditionImmunities(monster.defense.condition_immunities);

  // Collect non-standard skills (like "Technology") into language custom
  const customSkills = [];
  for (const s of monster.proficiencies?.skills || []) {
    if (!SKILL_MAP[s.name]) {
      customSkills.push(`${s.name} +${s.bonus}`);
    }
  }

  return {
    size: SIZE_MAP[monster.meta.size] || "med",
    di: { value: di.value, bypasses: di.bypasses, custom: di.custom },
    dr: { value: dr.value, bypasses: dr.bypasses, custom: dr.custom },
    dv: { value: dv.value, bypasses: dv.bypasses, custom: dv.custom },
    ci: { value: ci.value, custom: ci.custom },
    languages: {
      value: [],
      custom: (monster.languages || []).join("; "),
    },
  };
}

function buildSkills(monster) {
  const proficient = {};
  for (const s of monster.proficiencies?.skills || []) {
    const key = SKILL_MAP[s.name];
    if (key) proficient[key] = true;
  }
  const skills = {};
  for (const [key, ability] of Object.entries(SKILL_ABILITY)) {
    skills[key] = {
      value: proficient[key] ? 1 : 0,
      ability,
      bonuses: { check: "", passive: "" },
    };
  }
  return skills;
}

function buildResources(monster) {
  const legCount = monster.legendary_actions?.count ?? 0;
  return {
    legact: { value: legCount, max: legCount },
    legres: { value: 0, max: 0 },
    lair: { value: false, initiative: 20 },
  };
}

// ---------------------------------------------------------------------------
// Build items (traits, actions, reactions, legendary actions)
// ---------------------------------------------------------------------------

function buildFeatItem(entry, activationType, activationCost) {
  return {
    _id: generateId(),
    name: entry.name,
    type: "feat",
    img: matchIcon(entry.name) || "icons/svg/upgrade.svg",
    system: {
      description: { value: entry.description, chat: "" },
      source: { custom: "" },
      activation: {
        type: activationType,
        cost: activationCost,
        condition: "",
      },
      duration: { value: null, units: "" },
      target: { value: null, width: null, units: "", type: "" },
      range: { value: null, long: null, units: "" },
      uses: { value: null, max: "", per: null, recovery: "" },
      consume: { type: "", target: null, amount: null },
      recharge: { value: null, charged: false },
    },
    effects: [],
    flags: {},
  };
}

function buildWeaponItem(action, monster) {
  const atk = action.attack;
  const isMelee = atk.type === "melee_weapon";
  const isRanged = atk.type === "ranged_weapon";
  const icon = matchIcon(action.name) || "icons/svg/sword.svg";

  // Determine ability
  let ability;
  if (isRanged) {
    ability = "dex";
  } else {
    const strMod = abilityMod(monster.abilities.str);
    const dexMod = abilityMod(monster.abilities.dex);
    ability = dexMod > strMod ? "dex" : "str";
  }

  // Damage parts
  const parts = [];
  for (const d of atk.damage || []) {
    const bonus = d.bonus && d.bonus !== 0 ? ` + ${d.bonus}` : "";
    parts.push([`${d.dice}${bonus}`, d.type]);
  }

  // Range
  const rangeValue = isMelee
    ? (atk.reach ?? null)
    : (atk.range_normal ?? null);
  const rangeLong = isRanged ? (atk.range_long ?? null) : null;

  return {
    _id: generateId(),
    name: action.name,
    type: "weapon",
    img: icon,
    system: {
      description: { value: action.description, chat: "" },
      source: { custom: "" },
      quantity: 1,
      weight: { value: 0, units: "lb" },
      price: { value: 0, denomination: "gp" },
      attunement: 0,
      equipped: true,
      rarity: "",
      identified: true,
      activation: { type: "action", cost: 1, condition: "" },
      duration: { value: null, units: "" },
      target: { value: null, width: null, units: "", type: "creature" },
      range: {
        value: rangeValue,
        long: rangeLong,
        units: "ft",
      },
      uses: { value: null, max: "", per: null, recovery: "" },
      consume: { type: "", target: null, amount: null },
      ability,
      actionType: isMelee ? "mwak" : "rwak",
      attackBonus: "",
      chatFlavor: "",
      critical: { threshold: null, damage: "" },
      damage: { parts, versatile: "" },
      formula: "",
      save: { ability: "", dc: null, scaling: "spell" },
      armor: { value: 10 },
      hp: { value: 0, max: 0, dt: null, conditions: "" },
      weaponType: isMelee ? "simpleM" : "simpleR",
      baseItem: "",
      properties: {},
      proficient: null,
    },
    effects: [],
    flags: {},
  };
}

function buildActionItem(action, monster, activationType, activationCost) {
  if (action.attack) {
    const item = buildWeaponItem(action, monster);
    // Override activation type for non-standard actions (reaction, legendary, bonus)
    if (activationType !== "action") {
      item.system.activation.type = activationType;
      item.system.activation.cost = activationCost;
    }
    return item;
  }
  return buildFeatItem(action, activationType, activationCost);
}

function buildItems(monster) {
  const items = [];

  // Traits (passive features)
  for (const trait of monster.traits || []) {
    items.push(buildFeatItem(trait, "", null));
  }

  // Actions
  for (const action of monster.actions || []) {
    items.push(buildActionItem(action, monster, "action", 1));
  }

  // Bonus actions
  for (const action of monster.bonus_actions || []) {
    items.push(buildActionItem(action, monster, "bonus", 1));
  }

  // Reactions
  for (const action of monster.reactions || []) {
    items.push(buildActionItem(action, monster, "reaction", 1));
  }

  // Legendary actions
  if (monster.legendary_actions) {
    for (const action of monster.legendary_actions.actions || []) {
      items.push(buildActionItem(action, monster, "legendary", action.cost ?? 1));
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function convertMonster(monster) {
  const crNum = parseCR(monster.cr);
  const id = generateId();

  return {
    _id: id,
    name: titleCase(monster.name),
    type: "npc",
    img: "icons/svg/mystery-man.svg",
    system: {
      abilities: buildAbilities(monster),
      attributes: buildAttributes(monster),
      details: buildDetails(monster, crNum),
      traits: buildTraits(monster),
      skills: buildSkills(monster),
      resources: buildResources(monster),
      currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      bonuses: {
        mwak: { attack: "", damage: "" },
        rwak: { attack: "", damage: "" },
        msak: { attack: "", damage: "" },
        rsak: { attack: "", damage: "" },
        abilities: { check: "", save: "", skill: "" },
        spell: { dc: "" },
      },
    },
    items: buildItems(monster),
    effects: [],
    flags: {},
    folder: null,
    _key: `!actors!${id}`,
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function monsterFileName(name) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + ".json";
}

const monsters = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
console.log(`Converting ${monsters.length} monsters...`);

// Clean and recreate output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const actors = [];
const errors = [];

for (const monster of monsters) {
  try {
    const actor = convertMonster(monster);
    actors.push(actor);
    const fileName = monsterFileName(monster.name);
    fs.writeFileSync(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(actor, null, 2) + "\n"
    );
  } catch (e) {
    errors.push(`${monster.name}: ${e.message}`);
  }
}

if (errors.length) {
  console.error("Errors:");
  errors.forEach((e) => console.error(`  - ${e}`));
}

console.log(`Written ${actors.length} files to packs/cyberpunk-npc-templates/_source/`);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

console.log("\n--- Validation ---");

const ids = new Set();
let dupeIds = 0;
let missingHpFormula = 0;
let missingActionType = 0;
let undefinedValues = 0;

for (const obj of actors) {
  // Unique IDs
  if (ids.has(obj._id)) dupeIds++;
  ids.add(obj._id);

  // HP formula
  if (!obj.system.attributes.hp.formula) missingHpFormula++;

  // Action types on weapon items
  for (const item of obj.items) {
    if (item.type === "weapon" && !item.system.actionType) missingActionType++;
  }

  // Scan for undefined values
  const jsonStr = JSON.stringify(obj);
  if (jsonStr.includes(":undefined") || jsonStr.includes("undefined,")) undefinedValues++;
}

console.log(`Total actors: ${actors.length} (expected: 75)`);
console.log(`Duplicate IDs: ${dupeIds}`);
console.log(`Missing HP formula: ${missingHpFormula}`);
console.log(`Missing actionType on weapons: ${missingActionType}`);
console.log(`Lines with undefined values: ${undefinedValues}`);
console.log(`Errors during conversion: ${errors.length}`);

if (actors.length === 75 && dupeIds === 0 && missingHpFormula === 0 &&
    missingActionType === 0 && undefinedValues === 0 && errors.length === 0) {
  console.log("\n✓ All validations passed!");
} else {
  console.log("\n✗ Some validations failed — review output above.");
  process.exit(1);
}
