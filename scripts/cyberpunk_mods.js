/**
 * Weapon modification logic for Cyberpunk 5e.
 * Handles filtering valid weapons for a mod, applying/detaching mods, and cost deduction.
 */

// Mods that can be attached and detached (reversible, don't consume the item)
const DETACHABLE_MODS = new Set(["suppressed", "scoped", "slung", "bayonet"]);

/**
 * Returns weapons on the actor that are valid targets for the given mod.
 * @param {Actor} actor
 * @param {Item} mod
 * @returns {Item[]} Array of valid weapon items
 */
function filterWeaponsForMod(actor, mod) {
    const reqs = mod.flags.cyberpunk5e.modification_props.requirements;

    return actor.items.filter(i => {
        if (i.type !== "weapon") return false;

        // Only work on weapons with cyberpunk flag
        if (!i.flags.hasOwnProperty("cyberpunk5e")) return false;

        // Skip weapons that already have mods applied (they are modified copies)
        if (i.flags.cyberpunk5e.hasOwnProperty("modification_props")) return false;

        // Cannot duplicate a modification
        if (i.flags.cyberpunk5e.mods.some(m => m === mod.flags.cyberpunk5e.modification_props.prop_name)) return false;

        // Max 2 permanent modifications per weapon
        if (i.flags.cyberpunk5e.mods.filter(m => !DETACHABLE_MODS.has(m)).length >= 3) return false;

        // Weapon type filter
        if (reqs.types.length > 0 && reqs.types.every(r => r !== i.system.type.value)) return false;

        // Damage type filter
        if (reqs.dmg.length > 0 && reqs.dmg.every(r => {
            return i.system.damage.parts.every(d => d[1] !== r);
        })) return false;

        // Property filter
        if (Object.keys(reqs.properties).length > 0 && Object.entries(reqs.properties).some(
            ([key, value]) => i.system.properties.has(key) !== value
        )) return false;

        return true;
    });
}

/**
 * Applies or detaches a mod from a weapon, updating names, flags, and stats.
 * @param {Actor} actor
 * @param {Item} mod
 * @param {Item} weapon
 * @returns {Promise<string>} Chat message describing what happened
 */
async function applyModToWeapon(actor, mod, weapon) {
    const modProps = mod.flags.cyberpunk5e.modification_props;
    const weaponName = CyberpunkCommon.getBaseName(weapon.name);
    const modName = CyberpunkCommon.getBaseName(mod.name);

    const modUpdates = {};
    let message;
    let effectsToApply;

    if (modProps.reversible && modProps.applied) {
        message = `${actor.name} detached ${modName} from ${weaponName}.`;
        effectsToApply = modProps.reverse;
        modUpdates["flags.cyberpunk5e.modification_props.applied"] = false;
        modUpdates["flags.cyberpunk5e.modification_props.applied_to"] = null;
        modUpdates["name"] = modName;
    } else {
        effectsToApply = modProps.effects;
        if (modProps.reversible) {
            message = `${actor.name} attached ${modName} to ${weaponName}.`;
            modUpdates["flags.cyberpunk5e.modification_props.applied"] = true;
            modUpdates["flags.cyberpunk5e.modification_props.applied_to"] = weapon.id;
            modUpdates["name"] = `${modName} [Attached to ${weaponName}]`;
        } else {
            message = `${actor.name} installed ${modName} onto ${weaponName}.`;
        }
    }

    // Build weapon updates by applying each effect
    const weaponUpdates = {
        'flags.cyberpunk5e.mods': weapon.flags.cyberpunk5e.mods.concat([modProps.prop_name])
    };

    if (modProps.reversible && weapon.flags.cyberpunk5e.mods.includes(modProps.prop_name)) {
        weaponUpdates['flags.cyberpunk5e.mods'] = weapon.flags.cyberpunk5e.mods.filter(p => p !== modProps.prop_name);
    }

    Object.entries(effectsToApply).forEach(([effect, data]) => {
        data.forEach(([key, value]) => {
            let origValue;
            if (weaponUpdates.hasOwnProperty(key)) {
                origValue = weaponUpdates[key];
            } else {
                const path = key.split('.');
                let obj = weapon;
                while (path.length > 1) {
                    obj = obj[path.shift()];
                }
                origValue = obj[path.shift()];
            }

            switch (effect) {
                case 'update':
                    if (weaponUpdates.hasOwnProperty(key)) {
                        Object.assign(weaponUpdates[key], value);
                    } else {
                        weaponUpdates[key] = value;
                    }
                    break;
                case 'scale':
                    weaponUpdates[key] = origValue * value;
                    break;
                case 'append':
                    weaponUpdates[key] = origValue.concat([value]);
                    break;
                case 'remove':
                    value.forEach(v => origValue.delete(v));
                    weaponUpdates[key] = origValue;
                    break;
                case 'add':
                    if (key === 'system.damage.parts') {
                        const newValue = origValue;
                        newValue[0][0] = `${origValue[0][0]}+${value}`;
                        weaponUpdates[key] = newValue;
                    } else if (origValue) {
                        weaponUpdates[key] = `${origValue}+${value}`;
                    }
                    break;
                default:
                    break;
            }
        });
    });

    // Update weapon name to reflect current mods
    if (weaponUpdates['flags.cyberpunk5e.mods'].length > 0) {
        const modList = weaponUpdates['flags.cyberpunk5e.mods']
            .sort((a, b) => a.localeCompare(b))
            .map(m => CyberpunkCommon.capitalize(m));
        weaponUpdates['name'] = `${weaponName} [${modList.join(', ')}]`;
    } else {
        weaponUpdates['name'] = weaponName;
    }

    if (modProps.reversible) {
        await mod.update(modUpdates);
    } else {
        // Append mod description to weapon description
        const description = mod.system.description.value;
        const extracted = description.substring(description.lastIndexOf("</strong></p>") + 13).trim();
        let weaponDescription = weapon.system.description.value;
        weaponDescription += `<p><strong>${mod.name}</strong></p>${extracted}`;
        weaponUpdates['system.description.value'] = weaponDescription;

        if (mod.system.quantity > 1) {
            await mod.update({ 'system.quantity': mod.system.quantity - 1 });
        } else {
            await mod.delete();
        }
    }

    await weapon.update(weaponUpdates);
    return message;
}

/**
 * Handles the Apply Mod dialog confirmation — checks funds, applies mod, deducts cost.
 * @param {jQuery} html - Dialog HTML
 * @param {Actor} actor
 * @param {Item} mod
 */
async function applyModDialog(html, actor, mod) {
    const selectedWeaponId = html.find('[name="weaponSelect"]')[0].value;
    if (!mod || !selectedWeaponId) return;

    const selectedWeapon = actor.items.get(selectedWeaponId);
    const costToApplyCP = parseInt(html.find('[id="modCost"]')[0].value);
    const actorTotalCP = CyberpunkCommon.getTotalCP(actor.system.currency);

    if (costToApplyCP > actorTotalCP) {
        await ChatMessage.create({ content: `${actor.name} does not have enough money to apply ${mod.name} to ${selectedWeapon.name}!` });
        return;
    }

    const message = await applyModToWeapon(actor, mod, selectedWeapon);
    await actor.update({ 'system.currency': CyberpunkCommon.subtractCP(actor.system.currency, costToApplyCP) });
    await ChatMessage.create({ content: message });
}

/**
 * Updates the cost input and warning label when the weapon selection changes.
 * @param {jQuery} html - Dialog HTML
 * @param {Actor} actor
 * @param {Item} mod
 */
function updateModCostDisplay(html, actor, mod) {
    const weaponId = html.find('[name="weaponSelect"]')[0].value;
    const weapon = actor.items.get(weaponId);

    const costToApply = mod.flags.cyberpunk5e.modification_props.price_mult * weapon.system.price.value;
    const costCP = costToApply * CyberpunkCommon.CP_CONVERSION_RATES[weapon.system.price.denomination];
    html.find('[id="modCost"]')[0].value = costCP;

    const warningLabel = html.find('[id="warningLabel"]')[0];
    if (CyberpunkCommon.getTotalCP(actor.system.currency) < costCP) {
        warningLabel.innerHTML = '<p>Not enough money to apply modification!</p>';
    } else if (!mod.flags.cyberpunk5e.modification_props.reversible) {
        warningLabel.innerHTML = '<p>Warning: This modification is permanent!</p>';
    } else {
        warningLabel.innerHTML = '<p></p>';
    }
}
