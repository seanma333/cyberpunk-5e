/**
 * Ammo data definitions and reload logic for Cyberpunk 5e firearms.
 */

const AMMO_DATA = {
    "bullets": {
        "type": "consumable",
        "img": "modules/cyberpunk-5e/assets/macro_icons/bullets.svg",
        "system": {
            "description": { "value": "<p>Standard ammunition used for guns of all varieties.</p>" },
            "consumableType": "ammo",
            "rarity": "common"
        }
    },
    "shells": {
        "type": "consumable",
        "img": "modules/cyberpunk-5e/assets/macro_icons/shotgun-rounds.svg",
        "system": {
            "description": { "value": "<p>Standard ammunition used for shotguns.</p>" },
            "consumableType": "ammo",
            "rarity": "common"
        }
    },
    "arrows": {
        "type": "consumable",
        "img": "modules/cyberpunk-5e/assets/macro_icons/arrows.svg",
        "system": {
            "description": { "value": "<p>Standard ammunition used for bows.</p>" },
            "consumableType": "ammo",
            "rarity": "common"
        }
    },
    "bolts": {
        "type": "consumable",
        "img": "modules/cyberpunk-5e/assets/macro_icons/bolts.svg",
        "system": {
            "description": { "value": "<p>Standard ammunition used for crossbows.</p>" },
            "consumableType": "ammo",
            "rarity": "common"
        }
    }
};

/**
 * Creates a new ammo item on the actor linked to the given weapon.
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {string} ammoType - Key into AMMO_DATA
 * @param {number} ammoCap - Reload capacity to set as initial quantity
 * @returns {Promise<Item>} The created ammo item
 */
async function createAmmo(actor, weapon, ammoType, ammoCap) {
    const weaponStats = weapon.flags.cyberpunk5e;
    if (!weaponStats) return null;

    const weaponName = CyberpunkCommon.getBaseName(weapon.name);
    const ammoName = CyberpunkCommon.capitalize(ammoType);

    // Deep copy to avoid mutating the shared AMMO_DATA object
    const ammoItem = {
        ...AMMO_DATA[ammoType],
        name: `${ammoName} [${weaponName}]`,
        system: {
            ...AMMO_DATA[ammoType].system,
            description: { ...AMMO_DATA[ammoType].system.description },
            quantity: ammoCap
        }
    };

    const items = await actor.createEmbeddedDocuments('Item', [ammoItem]);
    return items[0];
}

/**
 * Reloads a weapon to full capacity, creating ammo if it doesn't exist yet.
 * @param {Actor} actor
 * @param {Item} weapon
 */
async function reloadWeapon(actor, weapon) {
    const ammoType = weapon.flags.cyberpunk5e.ammo_type;
    const ammoCap = weapon.flags.cyberpunk5e.reload;

    const targetAmmoId = weapon.system.consume.target;
    let targetAmmo = targetAmmoId ? actor.items.find(i => i.id === targetAmmoId) : null;

    if (!targetAmmo) {
        targetAmmo = await createAmmo(actor, weapon, ammoType, ammoCap);
        await weapon.update({ "system.consume.target": targetAmmo.id });
    } else {
        await targetAmmo.update({ "system.quantity": ammoCap });
    }

    ChatMessage.create({ content: `${actor.name} has reloaded ${weapon.name}!` });
}
