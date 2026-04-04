/**
 * Common utility functions for Cyberpunk 5e module
 * Shared functions used across multiple scripts
 */
const CyberpunkCommon = {
    /**
     * Currency conversion rates to copper pieces (CP)
     */
    CP_CONVERSION_RATES: {
        'cp': 1,
        'sp': 10,
        'gp': 100,
        'ep': 500,
        'pp': 1000
    },

    /**
     * Resolves actor and item from a chat card element
     * @param {HTMLElement} card - The chat card DOM element
     * @returns {Promise<{actor: Actor, item: Item}>} Object containing actor and item
     */
    async getActorAndItemFromCard(card) {
        const actor = card.dataset.tokenId
            ? (await fromUuid(card.dataset.tokenId)).actor
            : game.actors.get(card.dataset.actorId);
        const item = actor?.items.get(card.dataset.itemId);
        return { actor, item };
    },

    /**
     * Strips bracketed suffix from item names (e.g., "Weapon [Modified]" -> "Weapon")
     * @param {string} name - The item name
     * @returns {string} The base name without bracketed suffix
     */
    getBaseName(name) {
        return name.includes('[')
            ? name.substring(0, name.lastIndexOf('[')).trim()
            : name;
    },

    /**
     * Capitalizes the first letter of a string
     * @param {string} str - The string to capitalize
     * @returns {string} The string with first letter capitalized
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Calculates total value in copper pieces (CP) from currency object
     * @param {Object} currency - Currency object with pp, gp, ep, sp, cp properties
     * @returns {number} Total value in copper pieces
     */
    getTotalCP(currency) {
        return 1000 * currency.pp + 100 * currency.gp + 50 * currency.ep + 10 * currency.sp + currency.cp;
    },

    /**
     * Subtracts an amount (in CP) from a currency object, handling currency conversion
     * @param {Object} currency - Currency object with pp, gp, ep, sp, cp properties
     * @param {number} amount - Amount to subtract in copper pieces
     * @returns {Object} New currency object after subtraction
     */
    subtractCP(currency, amount) {
        let cpToSubtract = amount;
        const currencyToUse = {
            'pp': currency.pp,
            'gp': currency.gp,
            'ep': currency.ep,
            'sp': currency.sp,
            'cp': currency.cp
        };

        while (cpToSubtract >= 1000 && currencyToUse.pp > 0) {
            currencyToUse.pp -= 1;
            cpToSubtract -= 1000;
        }

        if (cpToSubtract > 0 && currencyToUse.pp > 0) {
            currencyToUse.gp += 10 * currencyToUse.pp;
            currencyToUse.pp = 0;
        }

        while (cpToSubtract >= 100 && currencyToUse.gp > 0) {
            currencyToUse.gp -= 1;
            cpToSubtract -= 100;
        }

        if (cpToSubtract > 0 && currencyToUse.gp > 0) {
            currencyToUse.sp += 10 * currencyToUse.gp;
            currencyToUse.gp = 0;
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
            currencyToUse.cp += 10 * currencyToUse.sp;
            currencyToUse.sp = 0;
        }

        currencyToUse.cp -= cpToSubtract;

        return currencyToUse;
    }
};
