# Monster Converter Spec
## Custom Schema → Foundry dnd5e 3.3.1 NPC Actor JSON

This document specifies how to convert monsters from the custom `monsters_combined.json` schema
into Foundry VTT dnd5e 3.3.1 actor documents suitable for bulk import into the
`cyberpunk-npc-templates` compendium pack.

---

## Input

- **Source file:** `monsters_combined.json` (array of 75 monster objects)
- **Schema reference:** `monster-schema.json`
- **Example:** `monster-schema-example.json`

## Output

- **Format:** JSONL (one JSON object per line) — this is the NeDB `.db` format Foundry uses
- **Output file:** `packs/cyberpunk-npc-templates.db`
- Each line is a complete Foundry Actor document for an NPC

---

## CR → Proficiency Bonus

```
CR 0–4:    +2
CR 5–8:    +3
CR 9–12:   +4
CR 13–16:  +5
CR 17–20:  +6
CR 21–24:  +7
CR 25–28:  +8
CR 29–30:  +9
```

CR values in the source may be strings: `"1/8"`, `"1/4"`, `"1/2"`, `"1"`, `"2"`, etc.
Parse fractions and integers; treat fractions as < 1 for proficiency lookup (use +2).
Store CR as a number: `0.125`, `0.25`, `0.5`, `1`, `2`, etc.

---

## Ability Score → Modifier

Standard formula: `Math.floor((score - 10) / 2)`

---

## Top-Level Actor Document Structure

```json
{
  "_id": "<generate random 16-char alphanumeric>",
  "name": "<monster.name title-cased>",
  "type": "npc",
  "img": "icons/svg/mystery-man.svg",
  "system": { ... },
  "items": [ ... ],
  "effects": [],
  "flags": {},
  "folder": null,
  "_key": "!actors!<same _id>"
}
```

---

## `system` Object

### `system.abilities`

Map each of the 6 ability scores. For each ability:

```json
"abilities": {
  "str": { "value": 18, "proficient": 0, "bonuses": { "check": "", "save": "" } },
  "dex": { "value": 13, "proficient": 0, "bonuses": { "check": "", "save": "" } },
  "con": { "value": 16, "proficient": 0, "bonuses": { "check": "", "save": "" } },
  "int": { "value": 11, "proficient": 0, "bonuses": { "check": "", "save": "" } },
  "wis": { "value": 15, "proficient": 0, "bonuses": { "check": "", "save": "" } },
  "cha": { "value": 10, "proficient": 0, "bonuses": { "check": "", "save": "" } }
}
```

For saving throw proficiencies from `monster.proficiencies.saving_throws`:
- Set `proficient: 1` on the matching ability
- Do NOT store the bonus — Foundry calculates it from proficiency level + ability mod

### `system.attributes`

```json
"attributes": {
  "ac": {
    "flat": <monster.defense.ac.value>,
    "calc": "flat",
    "formula": ""
  },
  "hp": {
    "value": <monster.defense.hp.average>,
    "max": <monster.defense.hp.average>,
    "temp": 0,
    "tempmax": 0,
    "formula": "<monster.defense.hp.formula>"
  },
  "init": { "ability": "", "bonus": "" },
  "movement": {
    "burrow": 0,
    "climb": 0,
    "fly": <monster.defense.speed.fly ?? 0>,
    "swim": <monster.defense.speed.swim ?? 0>,
    "walk": <monster.defense.speed.walk ?? 30>,
    "units": "ft",
    "hover": false
  },
  "senses": {
    "darkvision": <monster.senses.darkvision ?? 0>,
    "blindsight": <monster.senses.blindsight ?? 0>,
    "tremorsense": <monster.senses.tremorsense ?? 0>,
    "truesight": <monster.senses.truesight ?? 0>,
    "units": "ft",
    "special": ""
  },
  "spellcasting": "",
  "death": { "success": 0, "failure": 0 },
  "exhaustion": 0,
  "inspiration": false
}
```

### `system.details`

```json
"details": {
  "biography": { "value": "", "public": "" },
  "alignment": "<monster.meta.alignment>",
  "race": "",
  "type": {
    "value": "<monster.meta.type>",
    "subtype": "<monster.meta.subtype ?? ''>",
    "swarm": "",
    "custom": ""
  },
  "environment": "",
  "cr": <cr as number>,
  "spellLevel": 0,
  "source": { "custom": "Technomancer's Textbook" }
}
```

### `system.traits`

```json
"traits": {
  "size": "<size code — see mapping below>",
  "di": { "value": [], "bypasses": [], "custom": "" },
  "dr": { "value": [], "bypasses": [], "custom": "" },
  "dv": { "value": [], "bypasses": [], "custom": "" },
  "ci": { "value": [], "custom": "" },
  "languages": {
    "value": [],
    "custom": "<monster.languages joined by '; '>"
  }
}
```

**Size mapping:**
```
"Tiny"       → "tiny"
"Small"      → "sm"
"Medium"     → "med"
"Large"      → "lg"
"Huge"       → "huge"
"Gargantuan" → "grg"
```

If `monster.traits` contains damage immunities/resistances/vulnerabilities or condition immunities,
parse them into the appropriate arrays. The source schema may not always have these fields — treat
as optional.

### `system.skills`

For each of the 16 dnd5e skills, output a default entry. For skills listed in
`monster.proficiencies.skills`, set `value: 1` (proficient). Otherwise `value: 0`.

Skill key mapping (source name → dnd5e key):
```
Acrobatics      → acr
Animal Handling → ani
Arcana          → arc
Athletics       → ath
Deception       → dec
History         → his
Insight         → ins
Intimidation    → itm
Investigation   → inv
Medicine        → med
Nature          → nat
Perception      → prc
Performance     → prf
Persuasion      → per
Religion        → rel
Sleight of Hand → slt
Stealth         → ste
Survival        → sur
```

Default skill entry:
```json
"acr": { "value": 0, "ability": "dex", "bonuses": { "check": "", "passive": "" } }
```

Each skill has a default ability — use the standard dnd5e defaults (acr→dex, ath→str, etc.)
Do NOT store the bonus value. Foundry calculates it from `value` × proficiency + ability mod.

### `system.resources`

```json
"resources": {
  "legact": { "value": 0, "max": 0 },
  "legres": { "value": 0, "max": 0 },
  "lair": { "value": false, "initiative": 20 }
}
```

If the monster has legendary actions or resistances, parse from the relevant action entries.

### `system.currency`, `system.bonuses`, `system.spells`

Use empty/default values — not needed for NPCs:

```json
"currency": { "pp": 0, "gp": 0, "ep": 0, "sp": 0, "cp": 0 },
"bonuses": {
  "mwak": { "attack": "", "damage": "" },
  "rwak": { "attack": "", "damage": "" },
  "msak": { "attack": "", "damage": "" },
  "rsak": { "attack": "", "damage": "" },
  "abilities": { "check": "", "save": "", "skill": "" },
  "spell": { "dc": "" }
}
```

---

## `items` Array

Each item in `items` is a Foundry Item document embedded in the actor.

### Traits (passive features)

For each entry in `monster.traits`:

```json
{
  "_id": "<random 16-char>",
  "name": "<trait.name>",
  "type": "feat",
  "img": "icons/svg/upgrade.svg",
  "system": {
    "description": { "value": "<trait.description>", "chat": "" },
    "source": { "custom": "" },
    "activation": { "type": "", "cost": null, "condition": "" },
    "duration": { "value": null, "units": "" },
    "target": { "value": null, "width": null, "units": "", "type": "" },
    "range": { "value": null, "long": null, "units": "" },
    "uses": { "value": null, "max": "", "per": null, "recovery": "" },
    "consume": { "type": "", "target": null, "amount": null },
    "recharge": { "value": null, "charged": false }
  },
  "effects": [],
  "flags": {}
}
```

### Actions

For each entry in `monster.actions`:

**If the action has no `attack` field** (e.g. Multiattack, or a purely descriptive action):
→ Use the same `feat` structure as traits above, but set `activation.type: "action"`, `activation.cost: 1`

**If the action has an `attack` field:**
→ Use `type: "weapon"` with the following system structure:

```json
{
  "_id": "<random 16-char>",
  "name": "<action.name>",
  "type": "weapon",
  "img": "icons/svg/sword.svg",
  "system": {
    "description": { "value": "<action.description>", "chat": "" },
    "source": { "custom": "" },
    "quantity": 1,
    "weight": { "value": 0, "units": "lb" },
    "price": { "value": 0, "denomination": "gp" },
    "attunement": 0,
    "equipped": true,
    "rarity": "",
    "identified": true,
    "activation": { "type": "action", "cost": 1, "condition": "" },
    "duration": { "value": null, "units": "" },
    "target": { "value": null, "width": null, "units": "", "type": "creature" },
    "range": {
      "value": <attack.reach ?? attack.range.normal ?? null>,
      "long": <attack.range.long ?? null>,
      "units": <"ft" if melee reach, "ft" if ranged>
    },
    "uses": { "value": null, "max": "", "per": null, "recovery": "" },
    "consume": { "type": "", "target": null, "amount": null },
    "ability": <see ability mapping below>,
    "actionType": <"mwak" for melee_weapon, "rwak" for ranged_weapon>,
    "attackBonus": "",
    "chatFlavor": "",
    "critical": { "threshold": null, "damage": "" },
    "damage": {
      "parts": [
        ["<dice> + <bonus>", "<damage_type>"]
      ],
      "versatile": ""
    },
    "formula": "",
    "save": { "ability": "", "dc": null, "scaling": "spell" },
    "armor": { "value": 10 },
    "hp": { "value": 0, "max": 0, "dt": null, "conditions": "" },
    "weaponType": <"simpleM" for melee, "simpleR" for ranged>,
    "baseItem": "",
    "properties": {},
    "proficient": null
  },
  "effects": [],
  "flags": {}
}
```

**Ability field:**
- Melee weapon → `"str"` (unless creature's DEX mod > STR mod, then `"dex"`)
- Ranged weapon → `"dex"`

**Damage parts:**
- Each damage entry in `attack.damage` → `["Xd Y + Z", "damage_type"]`
- If bonus is 0, omit it: `["Xd Y", "damage_type"]`
- If multiple damage entries (e.g. fire damage on top of piercing), include all as separate parts

**Attack bonus validation:**
The `attack.bonus` in the source is the total attack bonus. Foundry calculates attack bonus
automatically as `ability_mod + proficiency_bonus`. Store `attackBonus: ""` and let Foundry
handle it — do NOT try to back-calculate a manual bonus. If the bonus in the source doesn't
match what Foundry would calculate, that's a data quality issue to flag, not to compensate for.

### Reactions

Same as actions (feat type, `activation.type: "reaction"`).

### Bonus Actions

If present, same as actions (`activation.type: "bonus"`).

### Legendary Actions

If present, use feat type with `activation.type: "legendary"`.

---

## ID Generation

Generate random 16-character alphanumeric strings for `_id` fields.
Use only `[a-zA-Z0-9]`. IDs must be unique within the file.

---

## Output Format

Write one JSON object per line (no pretty-printing). This is NeDB format.
Each line must be valid JSON.

Example output line:
```
{"_id":"aBcDeFgHiJkLmNoP","name":"Bodyguard","type":"npc","img":"icons/svg/mystery-man.svg","system":{...},"items":[...],"effects":[],"flags":{},"folder":null,"_key":"!actors!aBcDeFgHiJkLmNoP"}
```

---

## Validation

After generation, verify:
1. All 75 monsters are present
2. Each document has a unique `_id`
3. HP formula is present for all monsters
4. Skill proficiencies match the source
5. All actions with `attack` field have `actionType` set
6. No `undefined` or `null` values in required fields

---

## Files

- **Input:** `/tmp/monsters_combined.json` (or path provided)
- **Schema ref:** `/tmp/monster-schema.json`
- **dnd5e NPC data model:** `dnd5e-3.3.1/module/data/actor/npc.mjs`
- **dnd5e creature template:** `dnd5e-3.3.1/module/data/actor/templates/creature.mjs`
- **Output:** `packs/cyberpunk-npc-templates.db`
