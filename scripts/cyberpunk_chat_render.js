/**
 * Chat card rendering and button listeners for Cyberpunk 5e.
 * Adds Reload and Apply Mod buttons to item chat cards.
 */

// ─── Reload ───────────────────────────────────────────────────────────────────

async function reloadButtonListener(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const card = button.closest('.chat-card');
    const { actor, item } = await CyberpunkCommon.getActorAndItemFromCard(card);

    button.disabled = true;
    await Dialog.confirm({
        title: "Reload",
        content: `<p>Reload ${item.name}?</p>`,
        yes: () => reloadWeapon(actor, item),
        defaultYes: false
    });
    button.disabled = false;
}

// ─── Weapon Mod ───────────────────────────────────────────────────────────────

async function modifyButtonListener(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const card = button.closest('.chat-card');
    const { actor, item } = await CyberpunkCommon.getActorAndItemFromCard(card);

    if (!item) return;

    const modProps = item.flags.cyberpunk5e.modification_props;
    const attachedWeapon = modProps.applied ? actor.items.get(modProps.applied_to) : null;
    const weaponsToSelect = attachedWeapon ? [attachedWeapon] : filterWeaponsForMod(actor, item);

    const dialogTitle = modProps.applied ? `Detach ${item.name}` : `Attach ${item.name}`;

    button.disabled = true;

    if (weaponsToSelect.length === 0) {
        await Dialog.prompt({
            title: dialogTitle,
            content: `<p>No valid weapons to modify.</p>`
        });
        button.disabled = false;
        return;
    }

    const weaponOptions = weaponsToSelect
        .map(w => `<option value="${w.id}">${w.name}</option>`)
        .reduce((r, opt) => r + opt, '<option disabled selected value="" />');

    const dialogHtml = `
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
    `;

    const d = new Dialog({
        title: dialogTitle,
        content: dialogHtml,
        buttons: {
            apply: {
                label: "Apply Mod",
                callback: (html) => applyModDialog(html, actor, item)
            }
        },
        default: "apply",
        render: (html) => {
            html.find('[name="weaponSelect"]').on("change", () => updateModCostDisplay(html, actor, item));
        }
    });

    await d.render(true);

    if (actor.items.get(card.dataset.itemId)) {
        button.disabled = false;
    }
}

// ─── Chat Card Rendering ──────────────────────────────────────────────────────

function renderChatButtons(chatItem, html) {
    const actor = game.actors.get(chatItem.speaker.actor);
    if (!actor) return;

    const item = actor.items.get(chatItem.flags.dnd5e.use.itemId);
    if (!item || !item.flags.cyberpunk5e) return;

    let buttonDiv = html.querySelector('.card-buttons');

    // ── Weapon buttons ──
    if (item.type === 'weapon') {
        // Reload button (players only)
        if (item.flags.cyberpunk5e.reload && actor.type !== 'npc') {
            const reloadLabel = item.system.properties.has("actionreload") ? "Reload (Action)" : "Reload";
            const btn = document.createElement("button");
            btn.type = "button";
            btn.dataset.action = "reload";
            const icon = document.createElement("i");
            icon.className = "fas fa-gun";
            btn.appendChild(icon);
            btn.append(` ${reloadLabel}`);
            buttonDiv.append(btn);
            btn.addEventListener("click", reloadButtonListener);
        }

        // Rename Versatile button to Scatter for scatter weapons
        if (item.system.properties.has("scatter")) {
            const versatileButton = html.querySelector("[data-action^='versatile']");
            if (versatileButton) {
                versatileButton.innerHTML = '';
                const icon = document.createElement("i");
                icon.className = "fa-regular fa-burst";
                versatileButton.appendChild(icon);
                versatileButton.append(" Scatter ");
            }
        }
    }

    // ── Weapon mod button ──
    if (item.flags.cyberpunk5e.modification_props) {
        if (!buttonDiv) {
            buttonDiv = document.createElement("div");
            buttonDiv.className = "card-buttons";
            html.querySelector(".card-header").after(buttonDiv);
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.action = "modifyWeapon";
        const icon = document.createElement("i");
        icon.className = "fas fa-screwdriver-wrench";
        btn.appendChild(icon);
        btn.append(" Apply Mod");
        buttonDiv.append(btn);
        btn.addEventListener("click", modifyButtonListener);
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

Hooks.once("setup", () => {
    Hooks.on("renderChatMessage", async (chatItem, [html]) => {
        if (!chatItem.flags.dnd5e?.use) return;
        renderChatButtons(chatItem, html);
    });
});
