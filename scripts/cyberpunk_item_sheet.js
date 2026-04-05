/**
 * Injects a "Cyberpunk" tab into item sheets for items with cyberpunk5e flags.
 * Supports: firearms, core weapons, weapon mods, ammo containers.
 */

const AMMO_TYPES = ["bullets", "shells", "arrows", "bolts"];

// ─── Tab HTML builders ────────────────────────────────────────────────────────

function buildFirearmTab(flags) {
    const ammoOptions = AMMO_TYPES.map(t =>
        `<option value="${t}" ${flags.ammo_type === t ? "selected" : ""}>${CyberpunkCommon.capitalize(t)}</option>`
    ).join("");

    const modSlots = flags.mod_slots ?? 2;
    const installedMods = (flags.mods ?? []);
    const modList = installedMods.length > 0
        ? installedMods.map(m => `
            <li class="flexrow">
                <span>${CyberpunkCommon.capitalize(m)}</span>
                <a class="cp-remove-mod" data-mod="${m}" title="Remove mod"><i class="fas fa-times"></i></a>
            </li>`).join("")
        : `<li class="hint">No mods installed.</li>`;

    return `
        <div class="form-group">
            <label>Ammo Type</label>
            <select class="cp-flag-field" data-flag="ammo_type">
                ${ammoOptions}
            </select>
        </div>
        <div class="form-group">
            <label>Reload Capacity</label>
            <input type="number" class="cp-flag-field" data-flag="reload" value="${flags.reload ?? 0}" min="0" />
        </div>
        <div class="form-group">
            <label>Mod Slots</label>
            <input type="number" class="cp-flag-field" data-flag="mod_slots" value="${modSlots}" min="0" max="10" />
        </div>
        <div class="form-group">
            <label>Nickname</label>
            <input type="text" class="cp-flag-field" data-flag="nickname" value="${flags.nickname ?? ""}" />
        </div>
        <h3 class="form-header">Installed Mods (${installedMods.length}/${modSlots})</h3>
        <ul class="cp-mod-list">${modList}</ul>
    `;
}

function buildWeaponTab(flags) {
    const modSlots = flags.mod_slots ?? 2;
    const installedMods = (flags.mods ?? []);
    const modList = installedMods.length > 0
        ? installedMods.map(m => `
            <li class="flexrow">
                <span>${CyberpunkCommon.capitalize(m)}</span>
                <a class="cp-remove-mod" data-mod="${m}" title="Remove mod"><i class="fas fa-times"></i></a>
            </li>`).join("")
        : `<li class="hint">No mods installed.</li>`;

    return `
        <div class="form-group">
            <label>Nickname</label>
            <input type="text" class="cp-flag-field" data-flag="nickname" value="${flags.nickname ?? ""}" />
        </div>
        <div class="form-group">
            <label>Mod Slots</label>
            <input type="number" class="cp-flag-field" data-flag="mod_slots" value="${modSlots}" min="0" max="10" />
        </div>
        <h3 class="form-header">Installed Mods (${installedMods.length}/${modSlots})</h3>
        <ul class="cp-mod-list">${modList}</ul>
    `;
}

function buildModTab(flags) {
    const props = flags.modification_props ?? {};
    const reqs = props.requirements ?? { types: [], dmg: [], properties: {} };
    const appliedTo = props.applied_to ?? "—";

    const reqTypes = reqs.types.length > 0 ? reqs.types.join(", ") : "Any";
    const reqDmg = reqs.dmg.length > 0 ? reqs.dmg.join(", ") : "Any";
    const reqProps = Object.keys(reqs.properties).length > 0
        ? Object.entries(reqs.properties).map(([k, v]) => `${k}: ${v}`).join(", ")
        : "None";

    return `
        <div class="form-group">
            <label>Prop Name</label>
            <input type="text" class="cp-flag-field" data-flag-path="modification_props.prop_name" value="${props.prop_name ?? ""}" />
        </div>
        <div class="form-group">
            <label>Reversible (Attachment)</label>
            <input type="checkbox" class="cp-flag-field" data-flag-path="modification_props.reversible" ${props.reversible ? "checked" : ""} />
        </div>
        <div class="form-group">
            <label>Price Multiplier</label>
            <input type="number" class="cp-flag-field" data-flag-path="modification_props.price_mult" value="${props.price_mult ?? 0}" min="0" step="0.1" />
        </div>
        <h3 class="form-header">Requirements</h3>
        <div class="form-group">
            <label>Weapon Types</label>
            <p class="hint">${reqTypes}</p>
        </div>
        <div class="form-group">
            <label>Damage Types</label>
            <p class="hint">${reqDmg}</p>
        </div>
        <div class="form-group">
            <label>Properties</label>
            <p class="hint">${reqProps}</p>
        </div>
        <h3 class="form-header">Status</h3>
        <div class="form-group">
            <label>Applied</label>
            <p class="hint">${props.applied ? `Yes (to item ${appliedTo})` : "No"}</p>
        </div>
    `;
}

function buildAmmoContainerTab(flags) {
    const ammoOptions = AMMO_TYPES.map(t =>
        `<option value="${t}" ${flags.ammo_type === t ? "selected" : ""}>${CyberpunkCommon.capitalize(t)}</option>`
    ).join("");

    return `
        <div class="form-group">
            <label>Ammo Type</label>
            <select class="cp-flag-field" data-flag="ammo_type">
                ${ammoOptions}
            </select>
        </div>
        <div class="form-group">
            <label>Capacity</label>
            <input type="number" class="cp-flag-field" data-flag="capacity" value="${flags.capacity ?? 0}" min="0" />
        </div>
    `;
}

// ─── Tab detection ────────────────────────────────────────────────────────────

function getCyberpunkTabContent(item, flags) {
    // Ammo container
    if (flags.item_type === "container") return buildAmmoContainerTab(flags);

    // Weapon mod
    if (flags.modification_props) return buildModTab(flags);

    // Firearm (has reload/ammo_type)
    if (flags.hasOwnProperty("reload")) return buildFirearmTab(flags);

    // Core melee/ranged weapon (has mods but no ammo)
    if (flags.hasOwnProperty("mods")) return buildWeaponTab(flags);

    return null;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

function bindTabListeners(html, item) {
    // Save simple flag fields on change
    html.querySelectorAll(".cp-flag-field").forEach(el => {
        el.addEventListener("change", async () => {
            const flagKey = el.dataset.flag;
            const flagPath = el.dataset.flagPath;
            let value = el.type === "checkbox" ? el.checked
                : el.type === "number" ? Number(el.value)
                : el.value;

            if (flagKey) {
                await item.update({ [`flags.cyberpunk5e.${flagKey}`]: value });
            } else if (flagPath) {
                // Deep path like "modification_props.reversible"
                const parts = flagPath.split(".");
                const topKey = parts[0];
                const existing = foundry.utils.deepClone(item.flags.cyberpunk5e[topKey] ?? {});
                let obj = existing;
                for (let i = 1; i < parts.length - 1; i++) obj = obj[parts[i]];
                obj[parts[parts.length - 1]] = value;
                await item.update({ [`flags.cyberpunk5e.${topKey}`]: existing });
            }
        });
    });

    // Remove mod buttons
    html.querySelectorAll(".cp-remove-mod").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            const modName = btn.dataset.mod;
            const currentMods = foundry.utils.deepClone(item.flags.cyberpunk5e.mods ?? []);
            const updated = currentMods.filter(m => m !== modName);
            await item.update({ "flags.cyberpunk5e.mods": updated });
        });
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

Hooks.on("renderItemSheet", (app, [html], _data) => {
    const item = app.item;
    const flags = item.flags?.cyberpunk5e;
    if (!flags) return;

    const tabContent = getCyberpunkTabContent(item, flags);
    if (!tabContent) return;

    // Inject tab nav entry
    const nav = html.querySelector("nav.sheet-navigation.tabs");
    if (!nav) return;
    const tabLink = document.createElement("a");
    tabLink.className = "item";
    tabLink.dataset.tab = "cyberpunk";
    tabLink.dataset.group = "primary";
    tabLink.textContent = "Cyberpunk";
    nav.appendChild(tabLink);

    // Inject tab body
    const sheetBody = html.querySelector("section.sheet-body");
    if (!sheetBody) return;
    const tabDiv = document.createElement("div");
    tabDiv.className = "tab cyberpunk";
    tabDiv.dataset.group = "primary";
    tabDiv.dataset.tab = "cyberpunk";
    tabDiv.innerHTML = tabContent;
    sheetBody.appendChild(tabDiv);

    // Bind change/click listeners
    bindTabListeners(tabDiv, item);
});
