Hooks.on('init', () => {
	weaponProps = {
		'automatic': 'Automatic',
		'foregrip': 'Foregrip',
		'mounted': 'Mounted',
		'scatter': 'Scatter',
		'strreq': 'Strength',
		'sighted': 'Sighted',
		'actionreload': 'Reload (A)'
	}

	for (const [id, label] of Object.entries(weaponProps)) {
		CONFIG.DND5E.itemProperties[id] = {'label': label};
		CONFIG.DND5E.validProperties.weapon.add(id)
	}
});
