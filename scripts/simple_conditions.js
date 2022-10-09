const SimpleStatusIcons = (() => {
	const defineStatusIcons = function (data) {
		CONFIG.statusEffects = [
			{"id": "dead", "label": "EFFECT.StatusDead", "icon": "icons/svg/skull.svg"},
			{"id": "bardic inspired", "label": "Bardic Inspired", "icon": "modules/cyberpunk-5e/assets/condition_icons/bardic_inspired.png"},
			{"id": "bleeding", "label": "Bleeding", "icon": "modules/cyberpunk-5e/assets/condition_icons/bleeding.png"},
			{"id": "blessed", "label": "Blessed", "icon": "modules/cyberpunk-5e/assets/condition_icons/blessed.png"},
			{"id": "blinded", "label": "Blinded", "icon": "modules/cyberpunk-5e/assets/condition_icons/blinded.png"},
			{"id": "bolstered", "label": "Bolstered", "icon": "modules/cyberpunk-5e/assets/condition_icons/bolstered.png"},
			{"id": "burning", "label": "Burning", "icon": "modules/cyberpunk-5e/assets/condition_icons/burning.png"},
			{"id": "burrowing", "label": "Burrowing", "icon": "modules/cyberpunk-5e/assets/condition_icons/burrowing.png"},
			{"id": "charmed", "label": "Charmed", "icon": "modules/cyberpunk-5e/assets/condition_icons/charmed.png"},
			{"id": "concentrating", "label": "Concentrating", "icon": "modules/cyberpunk-5e/assets/condition_icons/concentrating.png"},
			{"id": "confused", "label": "Confused", "icon": "modules/cyberpunk-5e/assets/condition_icons/confused.png"},
			{"id": "cover full", "label": "Cover Full", "icon": "modules/cyberpunk-5e/assets/condition_icons/cover_full.png"},
			{"id": "cover half", "label": "Cover Half", "icon": "modules/cyberpunk-5e/assets/condition_icons/cover_half.png"},
			{"id": "cover three quarters", "label": "Cover Three Quarters", "icon": "modules/cyberpunk-5e/assets/condition_icons/cover_three_quarters.png"},
			{"id": "deafened", "label": "Deafened", "icon": "modules/cyberpunk-5e/assets/condition_icons/deafened.png"},
			{"id": "disarmed", "label": "Disarmed", "icon": "modules/cyberpunk-5e/assets/condition_icons/disarmed.png"},
			{"id": "dodging", "label": "Dodging", "icon": "modules/cyberpunk-5e/assets/condition_icons/dodging.png"},
			{"id": "ethereal", "label": "Ethereal", "icon": "modules/cyberpunk-5e/assets/condition_icons/ethereal.png"},
			{"id": "exhausted 1", "label": "Exhausted 1", "icon": "modules/cyberpunk-5e/assets/condition_icons/exhausted_1.png"},
			{"id": "exhausted 2", "label": "Exhausted 2", "icon": "modules/cyberpunk-5e/assets/condition_icons/exhausted_2.png"},
			{"id": "exhausted 3", "label": "Exhausted 3", "icon": "modules/cyberpunk-5e/assets/condition_icons/exhausted_3.png"},
			{"id": "exhausted 4", "label": "Exhausted 4", "icon": "modules/cyberpunk-5e/assets/condition_icons/exhausted_4.png"},
			{"id": "exhausted 5", "label": "Exhausted 5", "icon": "modules/cyberpunk-5e/assets/condition_icons/exhausted_5.png"},
			{"id": "exhausted 6", "label": "Exhausted 6", "icon": "modules/cyberpunk-5e/assets/condition_icons/exhausted_6.png"},
			{"id": "flying", "label": "Flying", "icon": "modules/cyberpunk-5e/assets/condition_icons/flying.png"},
			{"id": "frightened", "label": "Frightened", "icon": "modules/cyberpunk-5e/assets/condition_icons/frightened.png"},
			{"id": "grappled", "label": "Grappled", "icon": "modules/cyberpunk-5e/assets/condition_icons/grappled.png"},
			{"id": "hasted", "label": "Hasted", "icon": "modules/cyberpunk-5e/assets/condition_icons/hasted.png"},
			{"id": "hexed", "label": "Hexed", "icon": "modules/cyberpunk-5e/assets/condition_icons/hexed.png"},
			{"id": "hidden", "label": "Hidden", "icon": "modules/cyberpunk-5e/assets/condition_icons/hidden.png"},
			{"id": "incapacitated", "label": "Incapacitated", "icon": "modules/cyberpunk-5e/assets/condition_icons/incapacitated.png"},
			{"id": "inspired", "label": "Inspired", "icon": "modules/cyberpunk-5e/assets/condition_icons/inspired.png"},
			{"id": "invisible", "label": "Invisible", "icon": "modules/cyberpunk-5e/assets/condition_icons/invisible.png"},
			{"id": "marked", "label": "Marked", "icon": "modules/cyberpunk-5e/assets/condition_icons/marked.png"},
			{"id": "mirrored", "label": "Mirrored", "icon": "modules/cyberpunk-5e/assets/condition_icons/mirrored.png"},
			{"id": "mounted", "label": "Mounted", "icon": "modules/cyberpunk-5e/assets/condition_icons/mounted.png"},
			{"id": "obscured", "label": "Obscured", "icon": "modules/cyberpunk-5e/assets/condition_icons/obscured.png"},
			{"id": "paralyzed", "label": "Paralyzed", "icon": "modules/cyberpunk-5e/assets/condition_icons/paralyzed.png"},
			{"id": "petrified", "label": "Petrified", "icon": "modules/cyberpunk-5e/assets/condition_icons/petrified.png"},
			{"id": "poisoned", "label": "Poisoned", "icon": "modules/cyberpunk-5e/assets/condition_icons/poisoned.png"},
			{"id": "prone", "label": "Prone", "icon": "modules/cyberpunk-5e/assets/condition_icons/prone.png"},
			{"id": "raging", "label": "Raging", "icon": "modules/cyberpunk-5e/assets/condition_icons/raging.png"},
			{"id": "restrained", "label": "Restrained", "icon": "modules/cyberpunk-5e/assets/condition_icons/restrained.png"},
			{"id": "shielding", "label": "Shielding", "icon": "modules/cyberpunk-5e/assets/condition_icons/shielding.png"},
			{"id": "shifting", "label": "Shifting", "icon": "modules/cyberpunk-5e/assets/condition_icons/shifting.png"},
			{"id": "sleeping", "label": "Sleeping", "icon": "modules/cyberpunk-5e/assets/condition_icons/sleeping.png"},
			{"id": "stabilized", "label": "Stabilized", "icon": "modules/cyberpunk-5e/assets/condition_icons/stabilized.png"},
			{"id": "stunned", "label": "Stunned", "icon": "modules/cyberpunk-5e/assets/condition_icons/stunned.png"},
			{"id": "surprised", "label": "Surprised", "icon": "modules/cyberpunk-5e/assets/condition_icons/surprised.png"},
			{"id": "truesighted", "label": "Truesighted", "icon": "modules/cyberpunk-5e/assets/condition_icons/truesighted.png"},
			{"id": "unconscious", "label": "Unconscious", "icon": "modules/cyberpunk-5e/assets/condition_icons/unconscious.png"},
			{"id": "weakened", "label": "Weakened", "icon": "modules/cyberpunk-5e/assets/condition_icons/weakened.png"}
		]
	}

	// HOOKS
	Hooks.once("ready", function () {
		defineStatusIcons();
	});
})();