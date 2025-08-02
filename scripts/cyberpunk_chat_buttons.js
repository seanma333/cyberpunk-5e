let ammoData = {
    "bullets": {
        "type": "consumable",
        "img":"modules/cyberpunk-5e/assets/macro_icons/bullets.svg",
        "system": {
            "description": {"value":"<p>Standard ammunition used for guns of all varieties.</p>"},
            "consumableType": "ammo",
            "rarity": "common"
        }
    },
    "shells": {
        "type": "consumable",
        "img": "modules/cyberpunk-5e/assets/macro_icons/shotgun-rounds.svg",
        "system": {
            "description": {"value":"<p>Standard ammunition used for shotguns.</p>"},
            "consumableType": "ammo",
            "rarity": "common"
        }
    },
    "arrows": {
        "type": "consumable",
        "img": "modules/cyberpunk-5e/assets/macro_icons/arrows.svg",
        "system": {
            "description": {"value": "<p>Standard ammunition used for bows.</p>"},
            "consumableType": "ammo",
            "rarity": "common"
        }
    },
    "bolts": {
        "type": "consumable",
        "img": "modules/cyberpunk-5e/assets/macro_icons/bolts.svg",
        "system": {
            "description": {"value": "<p>Standard ammunition used for crossbows.</p>"},
            "consumableType": "ammo",
            "rarity": "common"
        }
    }
}

function getTotalCP(currency) {
    return 1000 * currency.pp + 100 * currency.gp + 50 * currency.ep + 10 * currency.sp + currency.cp
}

async function reloadButton(actor, weapon) {
    const ammoType = weapon.flags.cyberpunk5e.ammo_type
    const ammoCap = weapon.flags.cyberpunk5e.reload

    // Check if ammunition exists. If not, create it.
    ammoId = weapon.system.consume.target
    targetAmmoId = weapon.system.consume.target;
    targetAmmo = targetAmmoId ? actor.items.find(i => i.id === targetAmmoId) : null;
    if (!targetAmmo) {
        targetAmmo = await createAmmo(actor, weapon, ammoType, ammoCap);
        await weapon.update({"system.consume.target": targetAmmo.id});
    } else {
        await targetAmmo.update({"system.quantity": ammoCap});
    }

    // Output reload to chat.
    let content_html = `${actor.name} has reloaded ${weapon.name}!`;
    ChatMessage.create({content: content_html});
}

async function createAmmo(actor, weapon, ammoType, ammoCap) {
    weaponStats = weapon.flags.cyberpunk5e
    weaponName = weapon.name.includes('[') ? weapon.name.substring(0, weapon.name.lastIndexOf('[')).trim() : weapon.name;
    if (!weaponStats) return null;
    ammoType = weaponStats.ammo_type
    ammoName = ammoType[0].toUpperCase() + ammoType.slice(1)
    ammoItem = ammoData[ammoType]
    ammoItem.name = ammoName.concat(" [" + weaponName + "]")
    ammoItem.system.quantity = ammoCap
    items = await actor.createEmbeddedDocuments('Item', [ammoItem])
    return items[0]
}

async function reloadButtonListener(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const card = button.closest('.chat-card');
    const actor = card.dataset.tokenId ?
        (await fromUuid(card.dataset.tokenId)).actor :
        game.actors.get(card.dataset.actorId)
    const item = actor.items.get(card.dataset.itemId)

    // generate Dialog
    button.disabled = true;
    await Dialog.confirm({
        title: "Reload",
        content: '<p>Reload ' + item.name + '?</p>',
        yes: () => reloadButton(actor, item),
        defaultYes: false
    })
    button.disabled = false;
}

function filterWeaponsForMod(actor, mod) {
    const weapons = actor.items.filter(i => {
        if (i.type !== "weapon") return false;
        if (!i.flags.hasOwnProperty("cyberpunk5e")) return true;
        return !i.flags.cyberpunk5e.hasOwnProperty("modification_props");
    });
    reqs = mod.flags.cyberpunk5e.modification_props.requirements
    // Hard-coded for now.
    const detachableMods = new Set(["suppressed","scoped","slung","bayonet"])
    return weapons.filter(w => {
        // Only work on weapons with cyberpunk flag
        if (!w.flags.hasOwnProperty("cyberpunk5e")) return false;
    
        // Cannot duplicate a modification
        if (w.flags.cyberpunk5e.mods.some(m => m === mod.flags.cyberpunk5e.modification_props.prop_name)) return false;

        // Number of existing PERMANENT modifications
        if (w.flags.cyberpunk5e.mods.filter(m => !detachableMods.has(m)).length >= 3) return false;
    
        // Weapon Type
        if (reqs.types.length > 0 && reqs.types.every(r => r !== w.system.type.value)) return false;
    
        // Damage Type
        if (reqs.dmg.length > 0 && reqs.dmg.every(r => {
        return w.system.damage.parts.every(d => d[1] !== r)
        })) return false;
        
        // Properties
        if (Object.keys(reqs.properties).length > 0 && Object.entries(reqs.properties).some(
        ([key, value]) => w.system.properties.has(key) !== value)) return false;

        return true;
    })
}

function subtractCP(currency, amount) {
    cpToSubtract = amount
    currencyToUse = {'pp': currency.pp, 'gp': currency.gp, 'ep': currency.ep, 'sp': currency.sp, 'cp': currency.cp}
    
    while (cpToSubtract >= 1000 && currencyToUse.pp > 0) {
        currencyToUse.pp -= 1;
        cpToSubtract -= 1000;
    }

    if (cpToSubtract > 0 && currencyToUse.pp > 0) {
        currencyToUse.gp += 10 * currency.pp;
        currency.pp = 0;
    }
    
    while (cpToSubtract >= 100 && currencyToUse.gp > 0) {
        currencyToUse.gp -= 1;
        cpToSubtract -= 100;
    }
    
    if (cpToSubtract > 0 && currencyToUse.gp > 0) {
        currencyToUse.sp += 10 * currency.gp;
        currency.gp = 0;
    }

    while (cpToSubtract >= 50 && currencyToUse.ep > 0) {
        currencyToUse.ep -= 1;
        cpToSubtract -= 50;
    }
    
    while (cpToSubtract >= 10 && currencyToUse.sp > 0) {
        currencyToUse.sp -= 1;
        cpToSubtract -= 10;
    }
    
    if (cpToSubtract > 0 && currencyToUse.sp > 0) {
        currencyToUse.cp += 10 * currency.sp;
        currency.sp = 0;
    }
    
    currencyToUse.cp -= cpToSubtract;
    
    return currencyToUse
}

async function applyModToWeapon(actor, mod, weapon) {
    mod_props = mod.flags.cyberpunk5e.modification_props
    
    weaponName = weapon.name.includes('[') ? weapon.name.substring(0, weapon.name.lastIndexOf('[')).trim() : weapon.name;
    modName = mod.name.includes('[') ? mod.name.substring(0, mod.name.lastIndexOf('[')).trim() : mod.name;
    
    modUpdates = {}
    if (mod_props.reversible && mod_props.applied) {
        message = `${actor.name} detached ${modName} from ${weaponName}.`
        effectsToApply = mod_props.reverse;
        modUpdates["flags.cyberpunk5e.modification_props.applied"] = false;
        modUpdates["flags.cyberpunk5e.modification_props.applied_to"] = null;
        modUpdates["name"] = modName;
    } else {
        if (mod_props.reversible) {
            message = `${actor.name} attached ${modName} to ${weaponName}.`
            modUpdates["flags.cyberpunk5e.modification_props.applied"] = true;
            modUpdates["flags.cyberpunk5e.modification_props.applied_to"] = weapon.id;
            modUpdates["name"] = `${modName} [Attached to ${weaponName}]`
        } else {
            message = `${actor.name} installed ${modName} onto ${weaponName}.`;
        }
        effectsToApply = mod_props.effects;
    }
    
    var weaponUpdates = {'flags.cyberpunk5e.mods': weapon.flags.cyberpunk5e.mods.concat([mod_props.prop_name])}
    if (mod_props.reversible && weapon.flags.cyberpunk5e.mods.includes(mod_props.prop_name)) {
        weaponUpdates['flags.cyberpunk5e.mods'] = weapon.flags.cyberpunk5e.mods.filter(p => p !== mod_props.prop_name)
    }
    
    Object.entries(effectsToApply).forEach(([effect, data]) => {
        data.forEach(([key, value]) => {
            if (weaponUpdates.hasOwnProperty(key)) {
                origValue = weaponUpdates[key]
            } else {
                path = key.split('.')
                obj = weapon
                while (path.length > 1) {
                    obj = obj[path.shift()]
                }
                origValue = obj[path.shift()];
            }
        
            switch (effect) {
                case 'update':
                    if (weaponUpdates.hasOwnProperty(key)) {
                        Object.assign(weaponUpdates[key], value);
                    } else {
                        weaponUpdates[key] = value
                    }
                    break;
                case 'scale':
                    weaponUpdates[key] = origValue * value;
                    break;
                case 'append':
                    weaponUpdates[key] = origValue.concat([value])
                    break;
                case 'remove':
                    value.forEach(v => origValue.delete(v))
                    weaponUpdates[key] = origValue
                    break;
                case 'add':
                    // Special case for adding to damage.
                    if (key === 'system.damage.parts') {
                        newValue = origValue
                        newValue[0][0] = `${origValue[0][0]}+${value}`;
                        weaponUpdates[key] = newValue;
                    } else if (origValue) {
                        weaponUpdates[key] = `${origValue}+${value}`;
                    }
                    break;
                default:
                    break;
            }
        })
    })
    
    if (weaponUpdates['flags.cyberpunk5e.mods'].length > 0) {
        weaponMods = weaponUpdates['flags.cyberpunk5e.mods'].sort((a, b) => a.localeCompare(b)).map(m => `${m[0].toUpperCase()}${m.slice(1)}`)
        weaponUpdates['name'] = `${weaponName} [${weaponMods.join(', ')}]`;
    } else {
        weaponUpdates['name'] = weaponName;
    }

    
    if (mod_props.reversible) {
        await mod.update(modUpdates)
    } else {
        // Add the description of the mod to the weapon description.
        description = mod.system.description.value
        extracted = description.substring(description.lastIndexOf("</strong></p>")+13).trim()
        weaponDescription = weapon.system.description.value
        weaponDescription += `<p><strong>${mod.name}</strong></p>${extracted}`

        weaponUpdates['system.description.value'] = weaponDescription;

        if (mod.system.quantity > 1) {
            await mod.update({'system.quantity': mod.system.quantity - 1})
        } else {
            await mod.delete()
        }
    }
    
    console.log(weaponUpdates);
    await weapon.update(weaponUpdates)
    return message;
}

async function applyButton(html, actor, mod) {
    selectedWeaponId = html.find('[name="weaponSelect"]')[0].value;
    
    if (!mod || !selectedWeaponId) return;
    
    selectedWeapon = actor.items.get(selectedWeaponId);
    
    console.log(html.find('[id="modCost"]')[0].value);
    costToApplyCP = parseInt(html.find('[id="modCost"]')[0].value);
    actorTotalCP = getTotalCP(actor.system.currency);
    if (costToApplyCP > actorTotalCP) {
        await ChatMessage.create({content: `${actor.name} does not have enough money to apply ${mod.name} to ${selectedWeapon.name}!`});
        return;
    }
    
    message = await applyModToWeapon(actor, mod, selectedWeapon);
    await actor.update({'system.currency': subtractCP(actor.system.currency, costToApplyCP)})
    
    await ChatMessage.create({content: message})
}

function updateCostToApply(html, actor, mod) {
    weaponId = html.find('[name="weaponSelect"]')[0].value;
    weapon = actor.items.get(weaponId);
    
    costToApply = mod.flags.cyberpunk5e.modification_props.price_mult * weapon.system.price.value
    costToApplyElement = html.find('[id="modCost"]')[0];
    convertToCP = {'cp': 1, 'sp': 10, 'gp': 100, 'ep': 500, 'pp': 1000}
    costToApplyElement.value = costToApply * convertToCP[weapon.system.price.denomination];
    
    warningLabel = html.find('[id="warningLabel"]')[0];
    if (getTotalCP(actor.system.currency) < costToApply) {
        warningLabel.innerHTML = '<p>Not enough money to apply modification!</p>'
    } else if (!mod.flags.cyberpunk5e.modification_props.reversible) {
        warningLabel.innerHTML = '<p>Warning: This modification is permanent!</p>'
    } else {
        warningLabel.innerHTML = '<p></p>'
    }
}

async function modifyButtonListener(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const card = button.closest('.chat-card');
    const actor = card.dataset.tokenId ?
        (await fromUuid(card.dataset.tokenId)).actor :
        game.actors.get(card.dataset.actorId)
    const item = actor.items.get(card.dataset.itemId)

    if (!item) {
        return;
    }

    if (item.flags.cyberpunk5e.modification_props.applied) {
        attachedWeapon = actor.items.get(item.flags.cyberpunk5e.modification_props.applied_to);
    } else {
        attachedWeapon = null;
    }
    
    if (attachedWeapon) weaponsToSelect = [attachedWeapon];
    else weaponsToSelect = filterWeaponsForMod(actor, item);
    
    // generate Dialog
    var dialogTitle = `Install ${item.name}`
    
    if (!item.flags.cyberpunk5e.modification_props.applied) {
        dialogTitle = `Attach ${item.name}`;
    } else {
        dialogTitle = `Detach ${item.name}`;
    }

    button.disabled = true;
    if (weaponsToSelect.length == 0) {
        await Dialog.prompt({
            title: dialogTitle,
            content: `<p>No valid weapons to modify.</p>` 
        })
        button.disabled = false;
        return;
    }

    weaponOptions = weaponsToSelect.map(w => {
        return `<option value=${w.id}>${w.name}</option>`
    }).reduce((r,opt) => r.concat(opt), '<option disabled value selected />');
    var dialogHtml = `
        <div>
            <div>
                <label>Select weapon to modify:</label>
                <select id="weaponSelect" name="weaponSelect">${weaponOptions}</select>
            </div>
            <div>
                <label>Cost to Apply (CP):</label>
                <input type="number" id="modCost" name="modCost" value="0" readonly />
            </div>
            <div style="min-height:30px">
                <label id="warningLabel" style="color:red;font-weight:bold"><p /></label>
            </div>
        </div>
    `
    const d = new Dialog({
        title: dialogTitle,
        content: dialogHtml,
        buttons: {
            apply: {
                label: "Apply Mod",
                callback: (html) => applyButton(html, actor, item)
            }
        },
        default: "apply",
        render: (html) => {
            html.find('[name="weaponSelect"]').on("change", function(){ updateCostToApply(html, actor, item) });
        }
    })
    await d.render(true);

    if (actor.items.get(card.dataset.itemId)) {
        button.disabled = false;
    }
}

function renderChatButtons(chatItem, html) {
    const actor = game.actors.get(chatItem.speaker.actor);
    if (!actor) return;
    const item = actor.items.get(chatItem.flags.dnd5e.use.itemId);
    if (!item || !item.flags.cyberpunk5e) return;
    buttonDiv = html.querySelector('.card-buttons');

    // Cyberpunk Weapon buttons
    if (item.type === 'weapon') {
        // Add Reload button
        if (item.flags.cyberpunk5e.reload && actor.type !== 'npc') {
            reloadMsg = "Reload";
            if (item.system.properties.has("actionreload")) {
                reloadMsg = "Reload (Action)";
            }
            const reloadButton = document.createElement("button");
            reloadButton.type = "button";
            reloadButton.dataset.action = "reload";
            const icon = document.createElement("i");
            icon.className="fas fa-gun";
            reloadButton.appendChild(icon);
            reloadButton.append(reloadMsg);
            buttonDiv.append(reloadButton);
            reloadButton.addEventListener("click", reloadButtonListener);
        }

        // Update Versatile button for scatter weapons to say Scatter instead
        if (item.system.properties.has("scatter")) {
            const versatileButton = html.querySelector("[data-action^='versatile']");
            if (versatileButton) {
                versatileButton.innerHTML = '';
                const icon = document.createElement("i");
                icon.className="fa-regular fa-burst";
                versatileButton.appendChild(icon);
                versatileButton.append(" Scatter ");
            }
        }
    }

    // Cyberpunk Weapon Mod Buttons
    if (item.flags.cyberpunk5e.modification_props) {
        if (!buttonDiv) {
            buttonDiv = document.createElement("div");
            buttonDiv.className="card-buttons";
            html.querySelector(".card-header").after(buttonDiv);
        }
        const modifyButton = document.createElement("button");
        modifyButton.type = "button";
        modifyButton.dataset.action = "modifyWeapon";
        const icon = document.createElement("i");
        icon.className = "fas fa-screwdriver-wrench";
        modifyButton.appendChild(icon);
        modifyButton.append("Apply Mod");
        buttonDiv.append(modifyButton);
        modifyButton.addEventListener("click", modifyButtonListener);
    }
    console.log(item);
}

Hooks.once("setup", () => {
    Hooks.on("renderChatMessage", async (chatItem, [html]) => {
        if (chatItem.flags.dnd5e == null || chatItem.flags.dnd5e.use == null) {
            return;
        }
        renderChatButtons(chatItem, html);
    })
})